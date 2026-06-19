import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cleanupOrphanUploads,
  getClientIp,
  rateLimitOrThrow,
  securityLog,
} from "./lib/abuse-protection";
import { createRouter, publicQuery } from "./middleware";

// Sensitive candidate documents stay outside the public web root.
export const PRIVATE_UPLOAD_DIR = path.resolve(
  process.cwd(),
  "storage",
  "private",
  "uploads",
);

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

type AllowedExt = ".pdf" | ".jpg" | ".jpeg" | ".png";

function normalizeExtension(fileName: string): AllowedExt {
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "نوع الملف غير مسموح به. الملفات المقبولة: PDF وJPG وPNG.",
    });
  }
  return ext as AllowedExt;
}

function validateMagicBytes(buffer: Buffer, mimeType: string, ext: AllowedExt) {
  const isPdf = buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
  const isJpg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
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
      message: "محتوى الملف لا يطابق نوعه. يرجى رفع ملف PDF أو JPG أو PNG صالح.",
    });
  }
}

export const uploadRouter = createRouter({
  upload: publicQuery
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
        data: z.string().min(1),
        documentType: z.enum(["attestation", "idCard"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const ip = getClientIp(ctx.req);
      await rateLimitOrThrow({
        key: `upload:minute:${ip}`,
        limit: 4,
        windowMs: 60 * 1000,
        message: "Trop de fichiers envoyés en peu de temps.",
      });
      await rateLimitOrThrow({
        key: `upload:hour:${ip}`,
        limit: 12,
        windowMs: 60 * 60 * 1000,
        message: "La limite horaire d’envoi de fichiers a été atteinte.",
      });

      if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "نوع الملف غير مسموح به. الملفات المقبولة: PDF وJPG وPNG.",
        });
      }

      const ext = normalizeExtension(input.fileName);
      const buffer = Buffer.from(input.data, "base64");

      if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يجب أن يكون حجم الملف أقل من 5 ميغابايت.",
        });
      }

      validateMagicBytes(buffer, input.mimeType, ext);
      await mkdir(PRIVATE_UPLOAD_DIR, { recursive: true, mode: 0o700 });

      const safeName = `${input.documentType}-${randomUUID()}${ext}`;
      const filePath = path.join(PRIVATE_UPLOAD_DIR, safeName);
      if (!filePath.startsWith(PRIVATE_UPLOAD_DIR + path.sep)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "مسار ملف غير صالح." });
      }

      await writeFile(filePath, buffer, { mode: 0o600 });
      await securityLog("private_upload_created", {
        ip,
        documentType: input.documentType,
        size: buffer.length,
      });
      void cleanupOrphanUploads();

      return { success: true, fileRef: `private://${safeName}` };
    }),
});
