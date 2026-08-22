import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, superAdminQuery } from "./middleware";
import { getSqlPool } from "./queries/connection";
import { requireCandidateSession } from "./candidate-auth-router";

type CandidateRow = RowDataPacket & { id: number; firstName: string; lastName: string; email: string; phoneNumber: string };
type AssignmentRow = RowDataPacket & CandidateRow & {
  isSpy: number; isIntelligencePresident: number; displayedRole: string | null;
  spyCountry: string | null; fakeCountry: string | null; contactCandidateId: number | null; emailSentAt: Date | null; emailError: string | null; revealedAt: Date | null;
};
export const politicalGameRouter = createRouter({
  adminOverview: superAdminQuery.query(async () => {
    const pool = getSqlPool();
    const [candidates] = await pool.query<CandidateRow[]>(`SELECT id,firstName,lastName,email,phoneNumber FROM final_candidate_confirmations WHERE status='confirmed' ORDER BY firstName,lastName`);
    const [assignments] = await pool.query<AssignmentRow[]>(`SELECT f.id,f.firstName,f.lastName,f.email,a.isSpy,a.isIntelligencePresident,a.displayedRole,a.spyCountry,a.fakeCountry,a.contactCandidateId,a.emailSentAt,a.emailError,a.revealedAt FROM political_game_assignments a JOIN final_candidate_confirmations f ON f.id=a.finalCandidateId ORDER BY f.firstName,f.lastName`);
    const [settings] = await pool.query<(RowDataPacket & { rolesVisible:number })[]>(`SELECT rolesVisible FROM political_game_settings WHERE id=1`);
    return { candidates, rolesVisible: !!settings[0]?.rolesVisible, assignments: assignments.map(a => ({ ...a, isSpy: !!a.isSpy, isIntelligencePresident: !!a.isIntelligencePresident })) };
  }),

  setVisibility: superAdminQuery.input(z.object({ visible:z.boolean() })).mutation(async ({input,ctx}) => {
    await getSqlPool().execute(`INSERT INTO political_game_settings (id,rolesVisible,updatedByAdminId) VALUES (1,?,?) ON DUPLICATE KEY UPDATE rolesVisible=VALUES(rolesVisible),updatedByAdminId=VALUES(updatedByAdminId)`,[input.visible,ctx.adminUser.id]);
    return { visible:input.visible };
  }),

  saveAll: superAdminQuery.input(z.object({ assignments: z.array(z.object({
    candidateId: z.number().int().positive(), isSpy: z.boolean(), isIntelligencePresident: z.boolean(),
    displayedRole: z.string().trim().max(255).optional().default(""), spyCountry: z.string().trim().max(255).optional().default(""), fakeCountry: z.string().trim().max(255).optional().default(""), contactCandidateId: z.number().int().positive().nullable().optional().default(null),
  })).min(1).max(500) })).mutation(async ({ input, ctx }) => {
    const candidateIds = new Set(input.assignments.map(a => a.candidateId));
    const contactIds = new Set(input.assignments.filter(a => a.isSpy && a.contactCandidateId).map(a => a.contactCandidateId!));
    for (const item of input.assignments) {
      if (item.isSpy && (!item.displayedRole || !item.spyCountry || !item.fakeCountry || !item.contactCandidateId)) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب تحديد الدور المزيف والبلد الحقيقي وبلد التغطية والشخص الذي سيتواصل معه كل جاسوس." });
      if (item.isSpy && item.spyCountry === item.fakeCountry) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن يختلف بلد التغطية عن البلد الحقيقي." });
      if (item.isSpy && !candidateIds.has(item.contactCandidateId!)) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن يكون الشخص المختار للتواصل ضمن قائمة المشاركين." });
    }
    const pool = getSqlPool();
    const [people] = await pool.query<CandidateRow[]>(`SELECT id,firstName,lastName,email FROM final_candidate_confirmations WHERE status='confirmed'`);
    const byId = new Map(people.map(p => [p.id, p]));
    if (input.assignments.some(a => !byId.has(a.candidateId))) throw new TRPCError({ code: "BAD_REQUEST", message: "La liste contient un participant non confirmé." });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const item of input.assignments) {
        const contactCandidateId = item.isSpy ? item.contactCandidateId : null;
        const isIntelligencePresident = contactIds.has(item.candidateId);
        await connection.execute(`INSERT INTO political_game_assignments (finalCandidateId,isSpy,isIntelligencePresident,displayedRole,spyCountry,fakeCountry,contactCandidateId,configuredByAdminId,emailSentAt,emailError,revealedAt) VALUES (?,?,?,?,?,?,?,?,NULL,NULL,NULL) ON DUPLICATE KEY UPDATE revealTokenHash=NULL,isSpy=VALUES(isSpy),isIntelligencePresident=VALUES(isIntelligencePresident),displayedRole=VALUES(displayedRole),spyCountry=VALUES(spyCountry),fakeCountry=VALUES(fakeCountry),contactCandidateId=VALUES(contactCandidateId),configuredByAdminId=VALUES(configuredByAdminId),emailSentAt=NULL,emailError=NULL,revealedAt=NULL`, [item.candidateId,item.isSpy,isIntelligencePresident,item.displayedRole || null,item.spyCountry || null,item.fakeCountry || null,contactCandidateId,ctx.adminUser.id]);
      }
      await connection.execute(`UPDATE political_game_assignments a SET a.isIntelligencePresident=EXISTS(SELECT 1 FROM (SELECT contactCandidateId FROM political_game_assignments WHERE isSpy=true AND contactCandidateId IS NOT NULL) contacts WHERE contacts.contactCandidateId=a.finalCandidateId)`);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
    return { saved: input.assignments.length };
  }),

  saveOne: superAdminQuery.input(z.object({
    candidateId: z.number().int().positive(), isSpy: z.boolean(), isIntelligencePresident: z.boolean().optional().default(false),
    displayedRole: z.string().trim().max(255).optional().default(""),
    spyCountry: z.string().trim().max(255).optional().default(""),
    fakeCountry: z.string().trim().max(255).optional().default(""),
    contactCandidateId: z.number().int().positive().nullable().optional().default(null),
  })).mutation(async ({ input, ctx }) => {
    if (input.isSpy && (!input.displayedRole || !input.spyCountry || !input.fakeCountry || !input.contactCandidateId)) throw new TRPCError({ code: "BAD_REQUEST", message: "حدد الدور المزيف والبلد الحقيقي وبلد التغطية والشخص الذي يجب التواصل معه." });
    if (input.isSpy && input.spyCountry === input.fakeCountry) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن يختلف بلد التغطية عن البلد الحقيقي." });
    if (input.isSpy && input.contactCandidateId === input.candidateId) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن للجاسوس أن يكون هو نفسه الشخص الذي يجب التواصل معه." });
    const pool = getSqlPool();
    const ids = [input.candidateId, ...(input.contactCandidateId ? [input.contactCandidateId] : [])];
    const [people] = await pool.query<CandidateRow[]>(`SELECT id,firstName,lastName,email FROM final_candidate_confirmations WHERE status='confirmed' AND id IN (${ids.map(() => "?").join(",")})`, ids);
    if (people.length !== ids.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Le candidat ou la personne à contacter est invalide." });
    const [presidentRows] = await pool.query<(RowDataPacket & { total:number })[]>(`SELECT COUNT(*) total FROM political_game_assignments WHERE isSpy=true AND contactCandidateId=?`, [input.candidateId]);
    const isPresident = input.isIntelligencePresident || Number(presidentRows[0]?.total || 0) > 0;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`INSERT INTO political_game_assignments (finalCandidateId,isSpy,isIntelligencePresident,displayedRole,spyCountry,fakeCountry,contactCandidateId,configuredByAdminId,emailSentAt,emailError,revealedAt) VALUES (?,?,?,?,?,?,?,?,NULL,NULL,NULL) ON DUPLICATE KEY UPDATE revealTokenHash=NULL,isSpy=VALUES(isSpy),isIntelligencePresident=VALUES(isIntelligencePresident),displayedRole=VALUES(displayedRole),spyCountry=VALUES(spyCountry),fakeCountry=VALUES(fakeCountry),contactCandidateId=VALUES(contactCandidateId),configuredByAdminId=VALUES(configuredByAdminId),emailSentAt=NULL,emailError=NULL,revealedAt=NULL`, [input.candidateId,input.isSpy,isPresident,input.displayedRole || null,input.spyCountry || null,input.fakeCountry || null,input.isSpy ? input.contactCandidateId : null,ctx.adminUser.id]);
      await connection.execute(`UPDATE political_game_assignments a SET a.isIntelligencePresident=EXISTS(SELECT 1 FROM (SELECT contactCandidateId FROM political_game_assignments WHERE isSpy=true AND contactCandidateId IS NOT NULL) contacts WHERE contacts.contactCandidateId=a.finalCandidateId) WHERE a.finalCandidateId<>?`, [input.candidateId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
    return { candidateId: input.candidateId };
  }),

  myAssignment: publicQuery.query(async ({ ctx }) => {
    const session = requireCandidateSession(ctx.req.headers.get("cookie") || "");
    const pool = getSqlPool();
    const [settings] = await pool.query<(RowDataPacket & { rolesVisible:number })[]>(`SELECT rolesVisible FROM political_game_settings WHERE id=1`);
    if (!settings[0]?.rolesVisible) throw new TRPCError({code:"FORBIDDEN",message:"عرض الأدوار متوقف حالياً من طرف الإدارة."});
    const [rows] = await pool.query<AssignmentRow[]>(`SELECT f.id,f.firstName,f.lastName,f.email,a.isSpy,a.isIntelligencePresident,a.displayedRole,a.spyCountry,a.fakeCountry,a.contactCandidateId,a.emailSentAt,a.emailError FROM final_candidate_confirmations f JOIN political_game_assignments a ON a.finalCandidateId=f.id WHERE f.newUserId=? AND LOWER(f.email)=? AND f.status='confirmed' LIMIT 1`, [session.newUserId, session.email.trim().toLowerCase()]);
    const assignment = rows[0];
    if (!assignment) return null;
    await pool.execute(`UPDATE political_game_assignments SET revealedAt=COALESCE(revealedAt,NOW()) WHERE finalCandidateId=?`, [assignment.id]);
    let contact: { firstName: string; lastName: string; email: string; phoneNumber: string | null } | null = null;
    if (assignment.isSpy && assignment.contactCandidateId) {
      const [contacts] = await pool.query<CandidateRow[]>(`SELECT id,firstName,lastName,email,phoneNumber FROM final_candidate_confirmations WHERE id=? LIMIT 1`, [assignment.contactCandidateId]);
      if (contacts[0]) contact = { firstName: contacts[0].firstName, lastName: contacts[0].lastName, email: contacts[0].email, phoneNumber: contacts[0].phoneNumber || null };
    }
    let spies: Array<{ firstName:string; lastName:string; email:string; phoneNumber:string|null; displayedRole:string|null; spyCountry:string|null; fakeCountry:string|null }> = [];
    if (assignment.isIntelligencePresident) {
      const [spyRows] = await pool.query<(CandidateRow & { displayedRole: string | null; spyCountry: string | null; fakeCountry: string | null })[]>(`SELECT f.id,f.firstName,f.lastName,f.email,f.phoneNumber,a.displayedRole,a.spyCountry,a.fakeCountry FROM political_game_assignments a JOIN final_candidate_confirmations f ON f.id=a.finalCandidateId WHERE a.isSpy=true AND a.contactCandidateId=? ORDER BY f.firstName,f.lastName`, [assignment.id]);
      spies = spyRows.map(s => ({ firstName:s.firstName,lastName:s.lastName,email:s.email,phoneNumber:s.phoneNumber || null,displayedRole:s.displayedRole,spyCountry:s.spyCountry,fakeCountry:s.fakeCountry }));
    }
    return { firstName: assignment.firstName, isSpy: !!assignment.isSpy, isIntelligencePresident: !!assignment.isIntelligencePresident, displayedRole: assignment.displayedRole, spyCountry: assignment.spyCountry, fakeCountry: assignment.fakeCountry, contact, spies };
  }),
});
