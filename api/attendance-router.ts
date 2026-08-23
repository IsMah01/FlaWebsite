import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { attendanceAdminQuery, createRouter, publicQuery, scoresAdminQuery } from "./middleware";
import { getSqlPool } from "./queries/connection";
import { getClientIp, rateLimitOrThrow } from "./lib/abuse-protection";
import { createCandidateSessionCookie, requireCandidateSession } from "./candidate-auth-router";

async function recordAttendance(token: string, finalCandidateId: number) {
  const connection = await getSqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const [sessions] = await connection.query<any[]>(`SELECT id,title,isOpen,startsAt,CURRENT_TIMESTAMP serverNow FROM attendance_sessions WHERE token=? LIMIT 1 FOR UPDATE`, [token]);
    if (!sessions[0] || !sessions[0].isOpen) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "تم إغلاق تسجيل الحضور لهذه الحصة." });
    }
    const startsAtMs = sessions[0].startsAt ? new Date(sessions[0].startsAt).getTime() : null; const serverNowMs = new Date(sessions[0].serverNow).getTime();
    if (startsAtMs === null || serverNowMs < startsAtMs - 20 * 60 * 1000) throw new TRPCError({ code:"PRECONDITION_FAILED", message:"سيفتح رابط تسجيل الحضور قبل بداية الحصة بـ20 دقيقة." });
    const [result] = await connection.execute<any>(
      `INSERT INTO attendance_records (sessionId,finalCandidateId,scoringStartsAt)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE scoringStartsAt=COALESCE(scoringStartsAt,VALUES(scoringStartsAt))`,
      [sessions[0].id, finalCandidateId, sessions[0].startsAt],
    );
    const [records] = await connection.query<any[]>(`SELECT checkedInAt,scoringStartsAt FROM attendance_records WHERE sessionId=? AND finalCandidateId=? LIMIT 1`, [sessions[0].id, finalCandidateId]);
    const checkedInAt = new Date(records[0].checkedInAt).getTime();
    const scoringStartsAtMs = new Date(records[0].scoringStartsAt).getTime();
    const withinScoringWindow = checkedInAt >= scoringStartsAtMs - 20 * 60 * 1000 && checkedInAt <= scoringStartsAtMs + 10 * 60 * 1000;
    const punctual = checkedInAt < scoringStartsAtMs;
    if (withinScoringWindow) await connection.execute(`INSERT INTO candidate_point_entries (finalCandidateId,sourceKey,actionType,points,title,detail,awardedAt) VALUES (?,?,'attendance',5,?,'نقاط الوصول في الوقت المسموح',?) ON DUPLICATE KEY UPDATE title=VALUES(title),detail=VALUES(detail)`, [finalCandidateId, `attendance:${sessions[0].id}`, sessions[0].title, records[0].checkedInAt]);
    if (withinScoringWindow && punctual) {
      await connection.execute(`INSERT INTO candidate_point_entries (finalCandidateId,sourceKey,actionType,points,title,detail,awardedAt) VALUES (?,?,'punctuality',5,?,'مكافأة الوصول خلال 20 دقيقة قبل البداية',?) ON DUPLICATE KEY UPDATE title=VALUES(title),detail=VALUES(detail)`, [finalCandidateId, `punctuality:${sessions[0].id}`, sessions[0].title, records[0].checkedInAt]);
    }
    await connection.commit();
    return { success: true as const, alreadyCheckedIn: result.affectedRows === 0, awardedPoints: result.affectedRows === 0 ? 0 : (withinScoringWindow ? 5 + (punctual ? 5 : 0) : 0), punctual: withinScoringWindow && punctual };
  } catch (error) {
    try { await connection.rollback(); } catch { /* connection may already be closed */ }
    throw error;
  } finally {
    connection.release();
  }
}

async function rebuildSessionAutomaticPoints(sessionId: number) {
  const connection = await getSqlPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`DELETE p FROM candidate_point_entries p JOIN attendance_records r ON r.finalCandidateId=p.finalCandidateId AND r.sessionId=? AND r.scoringStartsAt IS NOT NULL WHERE p.sourceKey IN (CONCAT('attendance:',r.sessionId),CONCAT('punctuality:',r.sessionId))`, [sessionId]);
    await connection.execute(`INSERT IGNORE INTO candidate_point_entries (finalCandidateId,sourceKey,actionType,points,title,detail,awardedAt) SELECT r.finalCandidateId,CONCAT('attendance:',r.sessionId),'attendance',5,s.title,'نقاط الوصول في الوقت المسموح',r.checkedInAt FROM attendance_records r JOIN attendance_sessions s ON s.id=r.sessionId WHERE r.sessionId=? AND r.scoringStartsAt IS NOT NULL AND r.checkedInAt BETWEEN DATE_SUB(r.scoringStartsAt,INTERVAL 20 MINUTE) AND DATE_ADD(r.scoringStartsAt,INTERVAL 10 MINUTE)`, [sessionId]);
    await connection.execute(`INSERT IGNORE INTO candidate_point_entries (finalCandidateId,sourceKey,actionType,points,title,detail,awardedAt) SELECT r.finalCandidateId,CONCAT('punctuality:',r.sessionId),'punctuality',5,s.title,'مكافأة الوصول خلال 20 دقيقة قبل البداية',r.checkedInAt FROM attendance_records r JOIN attendance_sessions s ON s.id=r.sessionId WHERE r.sessionId=? AND r.scoringStartsAt IS NOT NULL AND r.checkedInAt>=DATE_SUB(r.scoringStartsAt,INTERVAL 20 MINUTE) AND r.checkedInAt<r.scoringStartsAt`, [sessionId]);
    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch { /* connection may already be closed */ }
    throw error;
  } finally {
    connection.release();
  }
}

export const attendanceRouter = createRouter({
  listSessions: attendanceAdminQuery.query(async () => {
    const [rows] = await getSqlPool().query<any[]>(`SELECT s.*, COUNT(r.id) attendanceCount FROM attendance_sessions s LEFT JOIN attendance_records r ON r.sessionId=s.id GROUP BY s.id ORDER BY s.dayNumber, s.id`);
    return rows.map((row) => ({ ...row, id: Number(row.id), dayNumber: Number(row.dayNumber), delayMinutes: Number(row.delayMinutes ?? 0), attendanceCount: Number(row.attendanceCount) }));
  }),
  openSession: attendanceAdminQuery.input(z.object({ scheduleKey: z.string().min(1).max(120), title: z.string().min(1).max(500), dayNumber: z.number().int().min(1).max(10), timeLabel: z.string().min(1).max(50), startsAt: z.string().datetime() })).mutation(async ({ input, ctx }) => {
    const token = crypto.randomBytes(24).toString("hex");
    await getSqlPool().execute(`INSERT INTO attendance_sessions (scheduleKey,title,dayNumber,timeLabel,startsAt,token,isOpen,openedAt,closedAt,createdByAdminId) VALUES (?,?,?,?,?,?,true,CURRENT_TIMESTAMP,NULL,?) ON DUPLICATE KEY UPDATE title=VALUES(title),dayNumber=VALUES(dayNumber),timeLabel=VALUES(timeLabel),startsAt=DATE_ADD(VALUES(startsAt),INTERVAL delayMinutes MINUTE),isOpen=true,openedAt=CURRENT_TIMESTAMP,closedAt=NULL,createdByAdminId=VALUES(createdByAdminId)`, [input.scheduleKey,input.title,input.dayNumber,input.timeLabel,new Date(input.startsAt),token,ctx.adminUser!.id]);
    const [rows] = await getSqlPool().query<any[]>(`SELECT id, token FROM attendance_sessions WHERE scheduleKey=? LIMIT 1`, [input.scheduleKey]);
    await rebuildSessionAutomaticPoints(Number(rows[0].id));
    await getSqlPool().execute(`INSERT INTO attendance_audit_logs (sessionId,adminId,action) VALUES (?,?,'open')`, [rows[0].id, ctx.adminUser!.id]);
    return { success: true, id: Number(rows[0].id), token: String(rows[0].token) };
  }),
  prepareSessions: attendanceAdminQuery.input(z.object({ sessions: z.array(z.object({ scheduleKey: z.string().min(1).max(120), title: z.string().min(1).max(500), dayNumber: z.number().int().min(1).max(10), timeLabel: z.string().min(1).max(50), startsAt: z.string().datetime() })).min(1).max(100) })).mutation(async ({ input, ctx }) => {
    for (const session of input.sessions) {
      const token = crypto.randomBytes(24).toString("hex");
      await getSqlPool().execute(`INSERT INTO attendance_sessions (scheduleKey,title,dayNumber,timeLabel,startsAt,token,isOpen,createdByAdminId) VALUES (?,?,?,?,?,?,false,?) ON DUPLICATE KEY UPDATE title=VALUES(title),dayNumber=VALUES(dayNumber),timeLabel=VALUES(timeLabel),startsAt=DATE_ADD(VALUES(startsAt),INTERVAL delayMinutes MINUTE)`, [session.scheduleKey, session.title, session.dayNumber, session.timeLabel, new Date(session.startsAt), token, ctx.adminUser!.id]);
      const [sessionRows] = await getSqlPool().query<any[]>(`SELECT id FROM attendance_sessions WHERE scheduleKey=? LIMIT 1`, [session.scheduleKey]);
      await rebuildSessionAutomaticPoints(Number(sessionRows[0].id));
    }
    const prepared = await Promise.all(input.sessions.map(async (session) => {
      const [rows] = await getSqlPool().query<any[]>(`SELECT id,title,token,scheduleKey FROM attendance_sessions WHERE scheduleKey=? LIMIT 1`, [session.scheduleKey]);
      return { id: Number(rows[0].id), title: String(rows[0].title), token: String(rows[0].token), scheduleKey: String(rows[0].scheduleKey) };
    }));
    return prepared;
  }),
  closeSession: attendanceAdminQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    await getSqlPool().execute(`UPDATE attendance_sessions SET isOpen=false,closedAt=CURRENT_TIMESTAMP WHERE id=?`, [input.id]);
    await getSqlPool().execute(`INSERT INTO attendance_audit_logs (sessionId,adminId,action) VALUES (?,?,'close')`, [input.id, ctx.adminUser!.id]);
    return { success: true };
  }),
  setSessionDelay: attendanceAdminQuery.input(z.object({ id: z.number().int().positive(), delayMinutes: z.number().int().min(0).max(240) })).mutation(async ({ input, ctx }) => {
    const connection = await getSqlPool().getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<any[]>(`SELECT id,delayMinutes FROM attendance_sessions WHERE id=? LIMIT 1 FOR UPDATE`, [input.id]);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "الحصة غير موجودة." });
      const previousDelay = Number(rows[0].delayMinutes ?? 0);
      const difference = input.delayMinutes - previousDelay;
      await connection.execute(`UPDATE attendance_sessions SET startsAt=DATE_ADD(startsAt,INTERVAL ? MINUTE),delayMinutes=? WHERE id=?`, [difference, input.delayMinutes, input.id]);
      await connection.execute(`UPDATE attendance_records r JOIN attendance_sessions s ON s.id=r.sessionId SET r.scoringStartsAt=s.startsAt WHERE r.sessionId=? AND r.scoringStartsAt IS NOT NULL`, [input.id]);
      await connection.execute(`INSERT INTO attendance_audit_logs (sessionId,adminId,action,details) VALUES (?,?,'delay_update',?)`, [input.id, ctx.adminUser!.id, `delay:${previousDelay}->${input.delayMinutes}`]);
      await connection.commit();
      await rebuildSessionAutomaticPoints(input.id);
      return { success: true, delayMinutes: input.delayMinutes };
    } catch (error) {
      try { await connection.rollback(); } catch { /* connection may already be closed */ }
      throw error;
    } finally { connection.release(); }
  }),
  sessionAttendance: attendanceAdminQuery.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ input }) => {
    const [rows] = await getSqlPool().query<any[]>(`SELECT f.id,f.firstName,f.lastName,f.email,f.phoneNumber,r.checkedInAt FROM final_candidate_confirmations f LEFT JOIN attendance_records r ON r.finalCandidateId=f.id AND r.sessionId=? WHERE f.status='confirmed' ORDER BY r.checkedInAt IS NULL, r.checkedInAt, f.firstName, f.lastName`, [input.sessionId]);
    const candidates = rows.map((row) => ({ ...row, id: Number(row.id), checkedInAt: row.checkedInAt ?? null }));
    const [sessionRows] = await getSqlPool().query<any[]>(`SELECT id,title,isOpen,openedAt,closedAt,delayMinutes FROM attendance_sessions WHERE id=? LIMIT 1`, [input.sessionId]);
    const [logRows] = await getSqlPool().query<any[]>(`SELECT l.id,l.action,l.details,l.createdAt,a.name adminName,f.firstName,f.lastName FROM attendance_audit_logs l JOIN admin_users a ON a.id=l.adminId LEFT JOIN final_candidate_confirmations f ON f.id=l.finalCandidateId WHERE l.sessionId=? ORDER BY l.createdAt DESC,l.id DESC LIMIT 100`, [input.sessionId]);
    return { present: candidates.filter((candidate) => candidate.checkedInAt), absent: candidates.filter((candidate) => !candidate.checkedInAt), total: candidates.length, session: sessionRows[0] ? { ...sessionRows[0], id: Number(sessionRows[0].id), isOpen: Boolean(sessionRows[0].isOpen) } : null, logs: logRows.map((row) => ({ ...row, id: Number(row.id) })) };
  }),
  setManualAttendance: attendanceAdminQuery.input(z.object({ sessionId: z.number().int().positive(), finalCandidateId: z.number().int().positive(), present: z.boolean() })).mutation(async ({ input, ctx }) => {
    const connection = await getSqlPool().getConnection();
    try {
      await connection.beginTransaction();
      const [candidateRows] = await connection.query<any[]>(`SELECT id FROM final_candidate_confirmations WHERE id=? AND status='confirmed' LIMIT 1 FOR UPDATE`, [input.finalCandidateId]);
      const [sessionRows] = await connection.query<any[]>(`SELECT id,title FROM attendance_sessions WHERE id=? LIMIT 1 FOR UPDATE`, [input.sessionId]);
      if (!candidateRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "المشارك غير موجود ضمن اللائحة النهائية." });
      if (!sessionRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "الحصة غير موجودة." });
      if (input.present) {
        await connection.execute(`INSERT IGNORE INTO attendance_records (sessionId,finalCandidateId) VALUES (?,?)`, [input.sessionId, input.finalCandidateId]);
        await connection.execute(`INSERT INTO candidate_point_entries (finalCandidateId,sourceKey,actionType,points,title,detail) VALUES (?,?,'attendance',5,?,'حضور أضيف من طرف الإدارة') ON DUPLICATE KEY UPDATE title=VALUES(title),detail=VALUES(detail)`, [input.finalCandidateId, `attendance:${input.sessionId}`, sessionRows[0].title]);
      } else {
        await connection.execute(`DELETE FROM attendance_records WHERE sessionId=? AND finalCandidateId=?`, [input.sessionId, input.finalCandidateId]);
        await connection.execute(`DELETE FROM candidate_point_entries WHERE finalCandidateId=? AND sourceKey IN (?,?)`, [input.finalCandidateId, `attendance:${input.sessionId}`, `punctuality:${input.sessionId}`]);
      }
      await connection.execute(`INSERT INTO attendance_audit_logs (sessionId,finalCandidateId,adminId,action) VALUES (?,?,?,?)`, [input.sessionId, input.finalCandidateId, ctx.adminUser!.id, input.present ? "manual_add" : "manual_remove"]);
      await connection.commit();
      return { success: true };
    } catch (error) {
      try { await connection.rollback(); } catch { /* connection may already be closed */ }
      throw error;
    } finally {
      connection.release();
    }
  }),
  sessionInfo: publicQuery.input(z.object({ token: z.string().length(48) })).query(async ({ input }) => {
    const [rows] = await getSqlPool().query<any[]>(`SELECT id,title,dayNumber,timeLabel,isOpen,startsAt,delayMinutes,CURRENT_TIMESTAMP serverNow FROM attendance_sessions WHERE token=? LIMIT 1`, [input.token]);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "رمز الحضور غير صالح." });
    const checkInOpensAt=rows[0].startsAt?new Date(new Date(rows[0].startsAt).getTime()-20*60*1000):null; const canCheckIn=Boolean(rows[0].isOpen)&&Boolean(checkInOpensAt)&&new Date(rows[0].serverNow).getTime()>=checkInOpensAt!.getTime();
    return { ...rows[0], id: Number(rows[0].id), dayNumber: Number(rows[0].dayNumber), delayMinutes: Number(rows[0].delayMinutes ?? 0), isOpen: Boolean(rows[0].isOpen), canCheckIn, checkInOpensAt };
  }),
  candidateScoreDashboard: publicQuery.query(async ({ ctx }) => {
    const session = requireCandidateSession(ctx.req.headers.get("cookie") || "");
    const [finals] = await getSqlPool().query<any[]>(`SELECT id,firstName,lastName,email FROM final_candidate_confirmations WHERE newUserId=? AND email=? AND status='confirmed' LIMIT 1`, [session.newUserId, session.email.trim().toLowerCase()]);
    if (!finals[0]) throw new TRPCError({ code: "FORBIDDEN", message: "هذا الفضاء مخصص للمشاركين المؤكدين نهائياً." });
    const [totalRows] = await getSqlPool().query<any[]>(`SELECT COALESCE(SUM(points),0) totalPoints FROM candidate_point_entries WHERE finalCandidateId=?`, [finals[0].id]);
    const totalPoints = Number(totalRows[0]?.totalPoints ?? 0);
    const [detailRows] = await getSqlPool().query<any[]>(`SELECT id,actionType,points,title,detail,awardedAt FROM candidate_point_entries WHERE finalCandidateId=? ORDER BY awardedAt DESC,id DESC`, [finals[0].id]);
    const [attendanceCountRows] = await getSqlPool().query<any[]>(`SELECT COUNT(*) total FROM attendance_records WHERE finalCandidateId=?`, [finals[0].id]); const attendedSessions=Number(attendanceCountRows[0]?.total??0);
    const [sessionCountRows] = await getSqlPool().query<any[]>(`SELECT COUNT(*) total FROM attendance_sessions`); const totalSessions = Number(sessionCountRows[0]?.total ?? 0);
    const badges = [
      ...(attendedSessions >= 1 ? [{ key: "first_presence", label: "أول حضور", description: "سجلتم حضوركم في أول حصة" }] : []),
      ...(attendedSessions >= 5 ? [{ key: "regular", label: "المواظب", description: "حضرتم خمس حصص على الأقل" }] : []),
      ...(detailRows.filter((row) => row.actionType === "punctuality").length >= 3 ? [{ key: "punctual", label: "دقيق المواعيد", description: "حققتم ثلاث مكافآت للالتزام بالوقت" }] : []),
    ];
    return { candidate: { id: Number(finals[0].id), firstName: finals[0].firstName, lastName: finals[0].lastName, totalPoints }, details: detailRows.map((row) => ({ ...row, id: Number(row.id), points: Number(row.points) })), progress: { attendedSessions, totalSessions }, badges, rules: { earlyArrivalPoints: 10, onTimePoints: 5, earlyWindowMinutes: 20, gracePeriodMinutes: 10, latePoints: 0 } };
  }),
  adminScoreDashboard: scoresAdminQuery.query(async () => {
    const [rankingRows] = await getSqlPool().query<any[]>(`SELECT f.id,f.firstName,f.lastName,f.email,COALESCE(SUM(p.points),0) totalPoints,COUNT(p.id) entryCount FROM final_candidate_confirmations f LEFT JOIN candidate_point_entries p ON p.finalCandidateId=f.id WHERE f.status='confirmed' GROUP BY f.id,f.firstName,f.lastName,f.email ORDER BY totalPoints DESC,f.firstName,f.lastName`);
    const [historyRows] = await getSqlPool().query<any[]>(`SELECT p.id,p.finalCandidateId,p.actionType,p.points,p.title,p.detail,p.awardedAt,f.firstName,f.lastName,f.email,a.name adminName FROM candidate_point_entries p JOIN final_candidate_confirmations f ON f.id=p.finalCandidateId LEFT JOIN admin_users a ON a.id=p.awardedByAdminId ORDER BY p.awardedAt DESC,p.id DESC LIMIT 500`);
    let previousPoints: number | null = null; let sharedRank = 0;
    const ranking = rankingRows.map((row, index) => { const totalPoints=Number(row.totalPoints); if(previousPoints===null||totalPoints<previousPoints) sharedRank=index+1; previousPoints=totalPoints; return {...row,id:Number(row.id),totalPoints,entryCount:Number(row.entryCount),rank:sharedRank}; });
    return { ranking, history: historyRows.map((row) => ({ ...row, id:Number(row.id), finalCandidateId:Number(row.finalCandidateId), points:Number(row.points) })) };
  }),
  addManualPoints: scoresAdminQuery.input(z.object({ finalCandidateId:z.number().int().positive(), points:z.number().int().min(-50).max(50).refine((value)=>value!==0), reason:z.string().trim().min(5).max(500) })).mutation(async ({input,ctx}) => {
    const [candidateRows]=await getSqlPool().query<any[]>(`SELECT id FROM final_candidate_confirmations WHERE id=? AND status='confirmed' LIMIT 1`,[input.finalCandidateId]);
    if(!candidateRows[0]) throw new TRPCError({code:"NOT_FOUND",message:"المشارك غير موجود ضمن اللائحة النهائية."});
    await getSqlPool().execute(`INSERT INTO candidate_point_entries (finalCandidateId,sourceKey,actionType,points,title,detail,awardedByAdminId) VALUES (?,?,'manual_adjustment',?,'تصحيح إداري',?,?)`,[input.finalCandidateId,`manual:${crypto.randomUUID()}`,input.points,input.reason,ctx.adminUser!.id]);
    return {success:true};
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
