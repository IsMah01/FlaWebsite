import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { rateLimitOrThrow } from "./lib/abuse-protection";
import { createRouter, interviewAdminQuery } from "./middleware";

export const PRIVATE_UPLOAD_DIR = path.resolve(process.cwd(), "storage", "private", "uploads");
export const INTERVIEWER_UPLOAD_DIR = path.join(PRIVATE_UPLOAD_DIR, "interviewers");

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
type AllowedExt = ".jpg" | ".jpeg" | ".png";

function normalizeExtension(fileName: string): AllowedExt {
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choisissez une image JPG ou PNG." });
  }
  return ext as AllowedExt;
}

function validateMagicBytes(buffer: Buffer, mimeType: string, ext: AllowedExt) {
  const isJpg =
    buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a;
  const valid =
    (mimeType === "image/jpeg" && [".jpg", ".jpeg"].includes(ext) && isJpg) ||
    (mimeType === "image/png" && ext === ".png" && isPng);

  if (!valid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Le contenu du fichier ne correspond pas a une image JPG ou PNG valide.",
    });
  }
}

export const uploadRouter = createRouter({
  interviewerImage: interviewAdminQuery
    .input(z.object({
      fileName: z.string().min(1).max(255),
      mimeType: z.enum(["image/jpeg", "image/png"]),
      data: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.adminUser.role !== "interview_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cette action est reservee aux mini-admins." });
      }
      await rateLimitOrThrow({
        key: `interviewer-image:${ctx.adminUser.id}`,
        limit: 10,
        windowMs: 60 * 60 * 1000,
        message: "Trop d'images importees. Reessayez plus tard.",
      });
      const ext = normalizeExtension(input.fileName);
      const buffer = Buffer.from(input.data, "base64");
      if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "L'image doit peser moins de 2 Mo." });
      }
      validateMagicBytes(buffer, input.mimeType, ext);
      await mkdir(INTERVIEWER_UPLOAD_DIR, { recursive: true, mode: 0o700 });
      const safeName = `interviewer-${ctx.adminUser.id}-${randomUUID()}${ext}`;
      const filePath = path.join(INTERVIEWER_UPLOAD_DIR, safeName);
      if (!filePath.startsWith(INTERVIEWER_UPLOAD_DIR + path.sep)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Chemin de fichier invalide." });
      }
      await writeFile(filePath, buffer, { mode: 0o600 });
      return { success: true, imageUrl: `/api/interviewer-images/${safeName}` };
    }),
});
