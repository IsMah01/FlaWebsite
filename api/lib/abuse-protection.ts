import { TRPCError } from "@trpc/server";
import { mkdir, readdir, stat, unlink, appendFile } from "fs/promises";
import path from "path";
import { getDb } from "../queries/connection";
import { candidates } from "@db/schema";

export const PRIVATE_UPLOAD_DIR = path.resolve(
  process.cwd(),
  "storage",
  "private",
  "uploads",
);

const LOG_DIR = path.resolve(process.cwd(), "storage", "logs");
const SECURITY_LOG_FILE = path.join(LOG_DIR, "security.log");

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
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

export function rateLimitOrThrow(options: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}) {
  const now = Date.now();
  const existing = buckets.get(options.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  existing.count += 1;

  if (existing.count > options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    const message =
      options.message ||
      "Trop de tentatives. Veuillez patienter avant de réessayer.";

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `${message} Réessayez dans ${retryAfterSeconds} secondes. [retry_after=${retryAfterSeconds}]`,
    });
  }
}

let lastCleanupAt = 0;
let cleanupPromise: Promise<void> | null = null;

export async function cleanupOrphanUploads(options?: {
  minAgeMs?: number;
  intervalMs?: number;
}) {
  const minAgeMs = options?.minAgeMs ?? 2 * 60 * 60 * 1000; // 2 hours
  const intervalMs = options?.intervalMs ?? 30 * 60 * 1000; // 30 minutes
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
        if (fileName === ".gitkeep") continue;
        if (referencedFiles.has(fileName)) continue;

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
