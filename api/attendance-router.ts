import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, superAdminQuery } from "./middleware";
import { getSqlPool } from "./queries/connection";
import { getClientIp, rateLimitOrThrow } from "./lib/abuse-protection";

export const attendanceRouter = createRouter({
  listSessions: superAdminQuery.query(async () => {
    const [rows] = await getSqlPool().query<any[]>(`SELECT s.*, COUNT(r.id) attendanceCount FROM attendance_sessions s LEFT JOIN attendance_records r ON r.sessionId=s.id GROUP BY s.id ORDER BY s.dayNumber, s.id`);
    return rows.map((row) => ({ ...row, id: Number(row.id), dayNumber: Number(row.dayNumber), attendanceCount: Number(row.attendanceCount) }));
  }),
  openSession: superAdminQuery.input(z.object({ scheduleKey: z.string().min(1).max(120), title: z.string().min(1).max(500), dayNumber: z.number().int().min(1).max(10), timeLabel: z.string().min(1).max(50) })).mutation(async ({ input, ctx }) => {
    const token = crypto.randomBytes(24).toString("hex");
    await getSqlPool().execute(`INSERT INTO attendance_sessions (scheduleKey,title,dayNumber,timeLabel,token,isOpen,openedAt,closedAt,createdByAdminId) VALUES (?,?,?,?,?,true,CURRENT_TIMESTAMP,NULL,?) ON DUPLICATE KEY UPDATE title=VALUES(title),dayNumber=VALUES(dayNumber),timeLabel=VALUES(timeLabel),token=VALUES(token),isOpen=true,openedAt=CURRENT_TIMESTAMP,closedAt=NULL,createdByAdminId=VALUES(createdByAdminId)`, [input.scheduleKey,input.title,input.dayNumber,input.timeLabel,token,ctx.adminUser.id]);
    return { success: true, token };
  }),
  closeSession: superAdminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await getSqlPool().execute(`UPDATE attendance_sessions SET isOpen=false,closedAt=CURRENT_TIMESTAMP WHERE id=?`, [input.id]); return { success: true };
  }),
  sessionAttendance: superAdminQuery.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ input }) => {
    const [rows] = await getSqlPool().query<any[]>(`SELECT f.firstName,f.lastName,f.email,f.phoneNumber,r.checkedInAt FROM attendance_records r JOIN final_candidate_confirmations f ON f.id=r.finalCandidateId WHERE r.sessionId=? ORDER BY r.checkedInAt`, [input.sessionId]); return rows;
  }),
  sessionInfo: publicQuery.input(z.object({ token: z.string().length(48) })).query(async ({ input }) => {
    const [rows] = await getSqlPool().query<any[]>(`SELECT id,title,dayNumber,timeLabel,isOpen FROM attendance_sessions WHERE token=? LIMIT 1`, [input.token]);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "رمز الحضور غير صالح." }); return { ...rows[0], id: Number(rows[0].id), dayNumber: Number(rows[0].dayNumber), isOpen: Boolean(rows[0].isOpen) };
  }),
  checkIn: publicQuery.input(z.object({ token: z.string().length(48), email: z.string().email(), password: z.string().min(1).max(128) })).mutation(async ({ input, ctx }) => {
    const email = input.email.trim().toLowerCase();
    await rateLimitOrThrow({ key: `attendance:${getClientIp(ctx.req)}:${email}`, limit: 8, windowMs: 60_000, message: "محاولات كثيرة لتسجيل الحضور." });
    const [sessions] = await getSqlPool().query<any[]>(`SELECT id,isOpen FROM attendance_sessions WHERE token=? LIMIT 1`, [input.token]);
    if (!sessions[0] || !sessions[0].isOpen) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "تم إغلاق تسجيل الحضور لهذه الحصة." });
    const [accounts] = await getSqlPool().query<any[]>(`SELECT id,password,emailConfirmed FROM new_users WHERE email=? LIMIT 1`, [email]); const account=accounts[0];
    if (!account || !(await bcrypt.compare(input.password, account.password))) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
    if (!account.emailConfirmed) throw new TRPCError({ code: "FORBIDDEN", message: "يرجى تأكيد بريدكم الإلكتروني أولاً." });
    const [finals] = await getSqlPool().query<any[]>(`SELECT id FROM final_candidate_confirmations WHERE newUserId=? AND email=? AND status='confirmed' LIMIT 1`, [account.id,email]);
    if (!finals[0]) throw new TRPCError({ code: "FORBIDDEN", message: "تسجيل الحضور مخصص للمشاركين المؤكدين نهائياً." });
    const [result] = await getSqlPool().execute<any>(`INSERT IGNORE INTO attendance_records (sessionId,finalCandidateId) VALUES (?,?)`, [sessions[0].id,finals[0].id]);
    return { success: true, alreadyCheckedIn: result.affectedRows === 0 };
  }),
});
