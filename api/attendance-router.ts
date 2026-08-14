import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, superAdminQuery } from "./middleware";
import { getSqlPool } from "./queries/connection";
import { getClientIp, rateLimitOrThrow } from "./lib/abuse-protection";
import { createCandidateSessionCookie, requireCandidateSession } from "./candidate-auth-router";

async function recordAttendance(token: string, finalCandidateId: number) {
  const connection = await getSqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const [sessions] = await connection.query<any[]>(`SELECT id,isOpen FROM attendance_sessions WHERE token=? LIMIT 1 FOR UPDATE`, [token]);
    if (!sessions[0] || !sessions[0].isOpen) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "تم إغلاق تسجيل الحضور لهذه الحصة." });
    }
    const [result] = await connection.execute<any>(`INSERT IGNORE INTO attendance_records (sessionId,finalCandidateId) VALUES (?,?)`, [sessions[0].id, finalCandidateId]);
    await connection.commit();
    return { success: true as const, alreadyCheckedIn: result.affectedRows === 0 };
  } catch (error) {
    try { await connection.rollback(); } catch { /* connection may already be closed */ }
    throw error;
  } finally {
    connection.release();
  }
}

export const attendanceRouter = createRouter({
  listSessions: superAdminQuery.query(async () => {
    const [rows] = await getSqlPool().query<any[]>(`SELECT s.*, COUNT(r.id) attendanceCount FROM attendance_sessions s LEFT JOIN attendance_records r ON r.sessionId=s.id GROUP BY s.id ORDER BY s.dayNumber, s.id`);
    return rows.map((row) => ({ ...row, id: Number(row.id), dayNumber: Number(row.dayNumber), attendanceCount: Number(row.attendanceCount) }));
  }),
  openSession: superAdminQuery.input(z.object({ scheduleKey: z.string().min(1).max(120), title: z.string().min(1).max(500), dayNumber: z.number().int().min(1).max(10), timeLabel: z.string().min(1).max(50) })).mutation(async ({ input, ctx }) => {
    const token = crypto.randomBytes(24).toString("hex");
    await getSqlPool().execute(`INSERT INTO attendance_sessions (scheduleKey,title,dayNumber,timeLabel,token,isOpen,openedAt,closedAt,createdByAdminId) VALUES (?,?,?,?,?,true,CURRENT_TIMESTAMP,NULL,?) ON DUPLICATE KEY UPDATE title=VALUES(title),dayNumber=VALUES(dayNumber),timeLabel=VALUES(timeLabel),isOpen=true,openedAt=CURRENT_TIMESTAMP,closedAt=NULL,createdByAdminId=VALUES(createdByAdminId)`, [input.scheduleKey,input.title,input.dayNumber,input.timeLabel,token,ctx.adminUser.id]);
    const [rows] = await getSqlPool().query<any[]>(`SELECT id, token FROM attendance_sessions WHERE scheduleKey=? LIMIT 1`, [input.scheduleKey]);
    await getSqlPool().execute(`INSERT INTO attendance_audit_logs (sessionId,adminId,action) VALUES (?,?,'open')`, [rows[0].id, ctx.adminUser.id]);
    return { success: true, id: Number(rows[0].id), token: String(rows[0].token) };
  }),
  prepareSessions: superAdminQuery.input(z.object({ sessions: z.array(z.object({ scheduleKey: z.string().min(1).max(120), title: z.string().min(1).max(500), dayNumber: z.number().int().min(1).max(10), timeLabel: z.string().min(1).max(50) })).min(1).max(100) })).mutation(async ({ input, ctx }) => {
    for (const session of input.sessions) {
      const token = crypto.randomBytes(24).toString("hex");
      await getSqlPool().execute(`INSERT INTO attendance_sessions (scheduleKey,title,dayNumber,timeLabel,token,isOpen,createdByAdminId) VALUES (?,?,?,?,?,false,?) ON DUPLICATE KEY UPDATE title=VALUES(title),dayNumber=VALUES(dayNumber),timeLabel=VALUES(timeLabel)`, [session.scheduleKey, session.title, session.dayNumber, session.timeLabel, token, ctx.adminUser.id]);
    }
    const prepared = await Promise.all(input.sessions.map(async (session) => {
      const [rows] = await getSqlPool().query<any[]>(`SELECT id,title,token,scheduleKey FROM attendance_sessions WHERE scheduleKey=? LIMIT 1`, [session.scheduleKey]);
      return { id: Number(rows[0].id), title: String(rows[0].title), token: String(rows[0].token), scheduleKey: String(rows[0].scheduleKey) };
    }));
    return prepared;
  }),
  closeSession: superAdminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    await getSqlPool().execute(`UPDATE attendance_sessions SET isOpen=false,closedAt=CURRENT_TIMESTAMP WHERE id=?`, [input.id]);
    await getSqlPool().execute(`INSERT INTO attendance_audit_logs (sessionId,adminId,action) VALUES (?,?,'close')`, [input.id, ctx.adminUser.id]);
    return { success: true };
  }),
  sessionAttendance: superAdminQuery.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ input }) => {
    const [rows] = await getSqlPool().query<any[]>(`SELECT f.id,f.firstName,f.lastName,f.email,f.phoneNumber,r.checkedInAt FROM final_candidate_confirmations f LEFT JOIN attendance_records r ON r.finalCandidateId=f.id AND r.sessionId=? WHERE f.status='confirmed' ORDER BY r.checkedInAt IS NULL, r.checkedInAt, f.firstName, f.lastName`, [input.sessionId]);
    const candidates = rows.map((row) => ({ ...row, id: Number(row.id), checkedInAt: row.checkedInAt ?? null }));
    const [sessionRows] = await getSqlPool().query<any[]>(`SELECT id,title,isOpen,openedAt,closedAt FROM attendance_sessions WHERE id=? LIMIT 1`, [input.sessionId]);
    const [logRows] = await getSqlPool().query<any[]>(`SELECT l.id,l.action,l.createdAt,a.name adminName,f.firstName,f.lastName FROM attendance_audit_logs l JOIN admin_users a ON a.id=l.adminId LEFT JOIN final_candidate_confirmations f ON f.id=l.finalCandidateId WHERE l.sessionId=? ORDER BY l.createdAt DESC,l.id DESC LIMIT 100`, [input.sessionId]);
    return { present: candidates.filter((candidate) => candidate.checkedInAt), absent: candidates.filter((candidate) => !candidate.checkedInAt), total: candidates.length, session: sessionRows[0] ? { ...sessionRows[0], id: Number(sessionRows[0].id), isOpen: Boolean(sessionRows[0].isOpen) } : null, logs: logRows.map((row) => ({ ...row, id: Number(row.id) })) };
  }),
  setManualAttendance: superAdminQuery.input(z.object({ sessionId: z.number().int().positive(), finalCandidateId: z.number().int().positive(), present: z.boolean() })).mutation(async ({ input, ctx }) => {
    const [candidateRows] = await getSqlPool().query<any[]>(`SELECT id FROM final_candidate_confirmations WHERE id=? AND status='confirmed' LIMIT 1`, [input.finalCandidateId]);
    if (!candidateRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "المشارك غير موجود ضمن اللائحة النهائية." });
    if (input.present) await getSqlPool().execute(`INSERT IGNORE INTO attendance_records (sessionId,finalCandidateId) VALUES (?,?)`, [input.sessionId, input.finalCandidateId]);
    else await getSqlPool().execute(`DELETE FROM attendance_records WHERE sessionId=? AND finalCandidateId=?`, [input.sessionId, input.finalCandidateId]);
    await getSqlPool().execute(`INSERT INTO attendance_audit_logs (sessionId,finalCandidateId,adminId,action) VALUES (?,?,?,?)`, [input.sessionId, input.finalCandidateId, ctx.adminUser.id, input.present ? "manual_add" : "manual_remove"]);
    return { success: true };
  }),
  sessionInfo: publicQuery.input(z.object({ token: z.string().length(48) })).query(async ({ input }) => {
    const [rows] = await getSqlPool().query<any[]>(`SELECT id,title,dayNumber,timeLabel,isOpen FROM attendance_sessions WHERE token=? LIMIT 1`, [input.token]);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "رمز الحضور غير صالح." }); return { ...rows[0], id: Number(rows[0].id), dayNumber: Number(rows[0].dayNumber), isOpen: Boolean(rows[0].isOpen) };
  }),
  checkInAuthenticated: publicQuery.input(z.object({ token: z.string().length(48) })).mutation(async ({ input, ctx }) => {
    const session = requireCandidateSession(ctx.req.headers.get("cookie") || "");
    const [finals] = await getSqlPool().query<any[]>(`SELECT id FROM final_candidate_confirmations WHERE newUserId=? AND email=? AND status='confirmed' LIMIT 1`, [session.newUserId, session.email.trim().toLowerCase()]);
    if (!finals[0]) throw new TRPCError({ code: "FORBIDDEN", message: "تسجيل الحضور مخصص للمشاركين المؤكدين نهائياً." });
    return recordAttendance(input.token, Number(finals[0].id));
  }),
  checkIn: publicQuery.input(z.object({ token: z.string().length(48), email: z.string().email(), password: z.string().min(1).max(128) })).mutation(async ({ input, ctx }) => {
    const email = input.email.trim().toLowerCase();
    await rateLimitOrThrow({ key: `attendance:${getClientIp(ctx.req)}:${email}`, limit: 8, windowMs: 60_000, message: "محاولات كثيرة لتسجيل الحضور." });
    const [accounts] = await getSqlPool().query<any[]>(`SELECT id,password,emailConfirmed FROM new_users WHERE email=? LIMIT 1`, [email]); const account=accounts[0];
    if (!account || !(await bcrypt.compare(input.password, account.password))) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
    if (!account.emailConfirmed) throw new TRPCError({ code: "FORBIDDEN", message: "يرجى تأكيد بريدكم الإلكتروني أولاً." });
    const [finals] = await getSqlPool().query<any[]>(`SELECT id FROM final_candidate_confirmations WHERE newUserId=? AND email=? AND status='confirmed' LIMIT 1`, [account.id,email]);
    if (!finals[0]) throw new TRPCError({ code: "FORBIDDEN", message: "تسجيل الحضور مخصص للمشاركين المؤكدين نهائياً." });
    const result = await recordAttendance(input.token, Number(finals[0].id));
    ctx.resHeaders.append("set-cookie", createCandidateSessionCookie(Number(account.id), email));
    return result;
  }),
});
