import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { appendFile, readdir, stat, unlink } from "fs/promises";

// IMPORTANT: never store sensitive candidate documents in public/uploads.
// This directory is outside the public web root, so files cannot be opened by URL.
export const PRIVATE_UPLOAD_DIR = path.resolve(process.cwd(), "storage", "private", "uploads");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

type AllowedExt = ".pdf" | ".jpg" | ".jpeg" | ".png";

function normalizeExtension(fileName: string): AllowedExt {
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "نوع الملف غير مسموح به. الملفات المقبولة: PDF, JPG, PNG",
    });
  }
  return ext as AllowedExt;
}

function validateMagicBytes(buffer: Buffer, mimeType: string, ext: AllowedExt) {
  const isPdf = buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
  const isJpg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  const valid =
    (mimeType === "application/pdf" && ext === ".pdf" && isPdf) ||
    (mimeType === "image/jpeg" && [".jpg", ".jpeg"].includes(ext) && isJpg) ||
    (mimeType === "image/png" && ext === ".png" && isPng);

  if (!valid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "محتوى الملف لا يطابق نوعه. يرجى رفع ملف صحيح PDF أو JPG أو PNG.",
    });
  }
}

export const uploadRouter = createRouter({
  upload: publicQuery
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
        data: z.string().min(1), // base64 encoded
        documentType: z.enum(["attestation", "idCard"]),
      })
    )
    .mutation(async ({ input }) => {
      if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "نوع الملف غير مسموح به. الملفات المقبولة: PDF, JPG, PNG",
        });
      }

      const ext = normalizeExtension(input.fileName);

      let buffer: Buffer;
      try {
        buffer = Buffer.from(input.data, "base64");
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "ملف غير صالح" });
      }

      if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "حجم الملف يجب أن يكون أقل من 5 ميغابايت",
        });
      }

      validateMagicBytes(buffer, input.mimeType, ext);

      await mkdir(PRIVATE_UPLOAD_DIR, { recursive: true, mode: 0o700 });

      const safeName = `${input.documentType}-${randomUUID()}${ext}`;
      const filePath = path.join(PRIVATE_UPLOAD_DIR, safeName);

      // Extra path traversal guard.
      if (!filePath.startsWith(PRIVATE_UPLOAD_DIR + path.sep)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "مسار ملف غير صالح" });
      }

      await writeFile(filePath, buffer, { mode: 0o600 });

      // Store only an internal reference in DB, not a public URL.
      const fileRef = `private://${safeName}`;
      return { success: true, fileRef };
    }),
});


type UploadAttempt = {
  timestamps: number[];
};

const uploadAttempts = new Map<string, UploadAttempt>();

const MAX_UPLOADS_PER_MINUTE = 4;
const MAX_UPLOADS_PER_HOUR = 12;

const LOG_DIR = path.resolve(process.cwd(), "storage", "logs");
const SECURITY_LOG_FILE = path.join(LOG_DIR, "security.log");

export function getClientIp(ctx: any): string {
  const headers = ctx?.req?.headers;

  const forwardedFor =
    headers?.get?.("x-forwarded-for") ||
    headers?.["x-forwarded-for"] ||
    "";

  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }

  const realIp =
    headers?.get?.("x-real-ip") ||
    headers?.["x-real-ip"] ||
    "";

  if (realIp) {
    return String(realIp);
  }

  return "unknown";
}

export function checkUploadRateLimit(ip: string) {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  const record = uploadAttempts.get(ip) ?? { timestamps: [] };

  record.timestamps = record.timestamps.filter((time) => time > oneHourAgo);

  const uploadsLastMinute = record.timestamps.filter(
    (time) => time > oneMinuteAgo,
  ).length;

  const uploadsLastHour = record.timestamps.length;

  if (uploadsLastMinute >= MAX_UPLOADS_PER_MINUTE) {
    return {
      allowed: false,
      reason:
        "عدد محاولات رفع الملفات كبير جدا في وقت قصير. يرجى الانتظار قليلا ثم إعادة المحاولة.",
    };
  }

  if (uploadsLastHour >= MAX_UPLOADS_PER_HOUR) {
    return {
      allowed: false,
      reason:
        "تم تجاوز الحد المسموح به لرفع الملفات خلال ساعة واحدة. يرجى المحاولة لاحقا.",
    };
  }

  record.timestamps.push(now);
  uploadAttempts.set(ip, record);

  return {
    allowed: true,
    reason: "",
  };
}

export async function logSecurityEvent(event: string, details: Record<string, unknown> = {}) {
  try {
    await mkdir(LOG_DIR, { recursive: true });

    const line =
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        ...details,
      }) + "\n";

    await appendFile(SECURITY_LOG_FILE, line, "utf8");
  } catch {
    // لا نوقف التطبيق إذا فشل تسجيل الحدث
  }
}

export async function cleanupOldPrivateUploads(
  privateUploadDir: string,
  maxAgeMs = 24 * 60 * 60 * 1000,
) {
  try {
    const files = await readdir(privateUploadDir);
    const now = Date.now();

    for (const file of files) {
      if (file === ".gitkeep") continue;

      const filePath = path.join(privateUploadDir, file);
      const info = await stat(filePath);

      const age = now - info.mtimeMs;

      if (age > maxAgeMs) {
        await unlink(filePath);

        await logSecurityEvent("orphan_upload_deleted", {
          file,
          ageMs: age,
        });
      }
    }
  } catch {
    // إذا كان المجلد غير موجود أو حدث خطأ، لا نوقف التطبيق
  }
}