import { TRPCError } from "@trpc/server";
import { appendFile, mkdir, readdir, stat, unlink } from "fs/promises";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import path from "path";
import type { RowDataPacket } from "mysql2";
import { candidates } from "@db/schema";
import { getDb, getSqlPool } from "../queries/connection";

export const PRIVATE_UPLOAD_DIR = path.resolve(
  process.cwd(),
  "storage",
  "private",
  "uploads",
);

const LOG_DIR = path.resolve(process.cwd(), "storage", "logs");
const SECURITY_LOG_FILE = path.join(LOG_DIR, "security.log");

export function getClientIp(req: Request): string {
  // In production the backend is reachable only through our reverse proxy.
  // X-Real-IP is overwritten by Nginx, unlike a client-provided forwarding chain.
  for (const value of [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
  ]) {
    const normalized = value?.trim();
    if (normalized && isIP(normalized)) return normalized;
  }

  return "direct";
}

export async function securityLog(event: string, details: Record<string, unknown>) {
  try {
    await mkdir(LOG_DIR, { recursive: true, mode: 0o700 });
    const line = JSON.stringify({
      at: new Date().toISOString(),
      event,
      ...details,
    });

    await appendFile(SECURITY_LOG_FILE, line + "\n", { encoding: "utf8" });
  } catch {
    // Logging must never break the application.
  }
}

export async function rateLimitOrThrow(options: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}) {
  const now = Date.now();
  const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
  const expiresAt = windowStart + options.windowMs;
  const bucketKey = createHash("sha256").update(options.key).digest("hex");
  const connection = await getSqlPool().getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO rate_limit_buckets
        (bucketKey, windowStart, expiresAt, hitCount)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE hitCount = hitCount + 1`,
      [bucketKey, windowStart, expiresAt],
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT hitCount
       FROM rate_limit_buckets
       WHERE bucketKey = ? AND windowStart = ?`,
      [bucketKey, windowStart],
    );

    const hitCount = Number(rows[0]?.hitCount || 0);
    if (hitCount > options.limit) {
      await connection.rollback();
      const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt - now) / 1000));
      const message =
        options.message ||
        "Trop de tentatives. Veuillez patienter avant de réessayer.";

      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `${message} Réessayez dans ${retryAfterSeconds} secondes. [retry_after=${retryAfterSeconds}]`,
      });
    }

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    connection.release();
  }

  // Bounded opportunistic cleanup avoids an unbounded table.
  if (Math.random() < 0.01) {
    void getSqlPool()
      .execute("DELETE FROM rate_limit_buckets WHERE expiresAt < ? LIMIT 500", [now])
      .catch(() => undefined);
  }
}

let lastCleanupAt = 0;
let cleanupPromise: Promise<void> | null = null;

export async function cleanupOrphanUploads(options?: {
  minAgeMs?: number;
  intervalMs?: number;
}) {
  const minAgeMs = options?.minAgeMs ?? 2 * 60 * 60 * 1000;
  const intervalMs = options?.intervalMs ?? 30 * 60 * 1000;
  const now = Date.now();

  if (cleanupPromise) return cleanupPromise;
  if (now - lastCleanupAt < intervalMs) return;

  cleanupPromise = (async () => {
    lastCleanupAt = now;

    try {
      await mkdir(PRIVATE_UPLOAD_DIR, { recursive: true, mode: 0o700 });

      const db = getDb();
      const rows = await db
        .select({
          attestationUrl: candidates.attestationUrl,
          idCardUrl: candidates.idCardUrl,
        })
        .from(candidates);

      const referencedFiles = new Set<string>();
      for (const row of rows) {
        for (const ref of [row.attestationUrl, row.idCardUrl]) {
          if (ref?.startsWith("private://")) {
            referencedFiles.add(ref.replace("private://", ""));
          }
        }
      }

      const files = await readdir(PRIVATE_UPLOAD_DIR);

      for (const fileName of files) {
        if (fileName === ".gitkeep" || referencedFiles.has(fileName)) continue;

        const filePath = path.join(PRIVATE_UPLOAD_DIR, fileName);
        if (!filePath.startsWith(PRIVATE_UPLOAD_DIR + path.sep)) continue;

        const info = await stat(filePath);
        if (now - info.mtimeMs < minAgeMs) continue;

        await unlink(filePath);
        await securityLog("orphan_upload_deleted", {
          fileName,
          ageMs: now - info.mtimeMs,
        });
      }
    } catch (error) {
      await securityLog("orphan_cleanup_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      cleanupPromise = null;
    }
  })();

  return cleanupPromise;
}
