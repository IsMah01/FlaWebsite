import crypto from "node:crypto";
import { z } from "zod";
import { createRouter, superAdminQuery } from "./middleware";
import { getSqlPool } from "./queries/connection";

const formUrlSchema = z.string().trim().url().max(1000).refine((value) => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "forms.gle" || host === "docs.google.com";
  } catch { return false; }
}, "Le lien doit être un lien Google Forms valide.");

const formDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function arabicDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ar-MA", { timeZone: "Africa/Casablanca", weekday: "long", day: "numeric", month: "long" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export const dailyFormsRouter = createRouter({
  list: superAdminQuery.query(async () => {
    const [rows] = await getSqlPool().query<any[]>(`
      SELECT f.*,COUNT(s.id) submittedCount,
        (SELECT COUNT(*) FROM final_candidate_confirmations c WHERE c.status='confirmed') totalCandidates,
        DATE_ADD(f.publishedAt,INTERVAL 24 HOUR) fullPointsDeadline
      FROM candidate_daily_forms f
      LEFT JOIN candidate_daily_form_submissions s ON s.formKey=f.formKey
      GROUP BY f.id ORDER BY f.publishedAt DESC,f.id DESC`);
    return rows.map((row) => ({ ...row, id: Number(row.id), isActive: Boolean(row.isActive), submittedCount: Number(row.submittedCount), totalCandidates: Number(row.totalCandidates) }));
  }),

  add: superAdminQuery.input(z.object({ formUrl: formUrlSchema, formDate: formDateSchema })).mutation(async ({ input, ctx }) => {
    const formKey = `form-${crypto.randomBytes(12).toString("hex")}`;
    const title = `استمارة يوم ${arabicDateLabel(input.formDate)}`;
    await getSqlPool().execute(
      `INSERT INTO candidate_daily_forms (formKey,title,formUrl,createdByAdminId) VALUES (?,?,?,?)`,
      [formKey, title, input.formUrl, ctx.adminUser.id],
    );
    return { success: true, formKey, title };
  }),

  setDate: superAdminQuery.input(z.object({ id: z.number().int().positive(), formDate: formDateSchema })).mutation(async ({ input }) => {
    const title = `استمارة يوم ${arabicDateLabel(input.formDate)}`;
    await getSqlPool().execute(`UPDATE candidate_daily_forms SET title=? WHERE id=?`, [title, input.id]);
    return { success: true, title };
  }),

  setActive: superAdminQuery.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(async ({ input }) => {
    await getSqlPool().execute(`UPDATE candidate_daily_forms SET isActive=? WHERE id=?`, [input.active, input.id]);
    return { success: true };
  }),

  status: superAdminQuery.input(z.object({ formKey: z.string().min(1).max(80) })).query(async ({ input }) => {
    const [rows] = await getSqlPool().query<any[]>(`
      SELECT c.id,c.firstName,c.lastName,c.email,s.submittedAt,p.points
      FROM final_candidate_confirmations c
      LEFT JOIN candidate_daily_form_submissions s ON s.finalCandidateId=c.id AND s.formKey=?
      LEFT JOIN candidate_point_entries p ON p.finalCandidateId=c.id AND p.sourceKey=CONCAT('daily-form:',?)
      WHERE c.status='confirmed'
      ORDER BY s.submittedAt IS NULL,s.submittedAt,c.firstName,c.lastName`, [input.formKey, input.formKey]);
    return rows.map((row) => ({ ...row, id: Number(row.id), points: row.points == null ? null : Number(row.points), submittedAt: row.submittedAt ?? null }));
  }),
});
