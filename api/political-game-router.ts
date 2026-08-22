import crypto from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, superAdminQuery } from "./middleware";
import { getSqlPool } from "./queries/connection";
import { requireCandidateSession } from "./candidate-auth-router";

type CandidateRow = RowDataPacket & { id: number; firstName: string; lastName: string; email: string; phoneNumber: string };
type AssignmentRow = RowDataPacket & CandidateRow & {
  isSpy: number; isIntelligencePresident: number; displayedRole: string | null;
  spyCountry: string | null; fakeCountry: string | null; contactCandidateId: number | null; emailSentAt: Date | null; emailError: string | null;
};
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const politicalGameRouter = createRouter({
  adminOverview: superAdminQuery.query(async () => {
    const pool = getSqlPool();
    const [candidates] = await pool.query<CandidateRow[]>(`SELECT id,firstName,lastName,email,phoneNumber FROM final_candidate_confirmations WHERE status='confirmed' ORDER BY firstName,lastName`);
    const [assignments] = await pool.query<AssignmentRow[]>(`SELECT f.id,f.firstName,f.lastName,f.email,a.isSpy,a.isIntelligencePresident,a.displayedRole,a.spyCountry,a.fakeCountry,a.contactCandidateId,a.emailSentAt,a.emailError FROM political_game_assignments a JOIN final_candidate_confirmations f ON f.id=a.finalCandidateId ORDER BY f.firstName,f.lastName`);
    return { candidates, assignments: assignments.map(a => ({ ...a, isSpy: !!a.isSpy, isIntelligencePresident: !!a.isIntelligencePresident })) };
  }),

  saveAndSend: superAdminQuery.input(z.object({ assignments: z.array(z.object({
    candidateId: z.number().int().positive(), isSpy: z.boolean(), isIntelligencePresident: z.boolean(),
    displayedRole: z.string().trim().max(255).optional().default(""), spyCountry: z.string().trim().max(255).optional().default(""), fakeCountry: z.string().trim().max(255).optional().default(""), contactCandidateId: z.number().int().positive().nullable().optional().default(null),
  })).min(1).max(500) })).mutation(async ({ input, ctx }) => {
    const candidateIds = new Set(input.assignments.map(a => a.candidateId));
    const contactIds = new Set(input.assignments.filter(a => a.isSpy && a.contactCandidateId).map(a => a.contactCandidateId!));
    for (const item of input.assignments) {
      if (item.isSpy && (!item.displayedRole || !item.spyCountry || !item.fakeCountry || !item.contactCandidateId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Chaque spy doit avoir un faux rôle, un pays, un faux pays et un responsable des Istikhbarat." });
      if (item.isSpy && item.spyCountry === item.fakeCountry) throw new TRPCError({ code: "BAD_REQUEST", message: "Le faux pays doit être différent du pays réel." });
      if (item.isSpy && !candidateIds.has(item.contactCandidateId!)) throw new TRPCError({ code: "BAD_REQUEST", message: "La personne à contacter doit appartenir à la liste des participants." });
    }
    const pool = getSqlPool();
    const [people] = await pool.query<CandidateRow[]>(`SELECT id,firstName,lastName,email FROM final_candidate_confirmations WHERE status='confirmed'`);
    const byId = new Map(people.map(p => [p.id, p]));
    if (input.assignments.some(a => !byId.has(a.candidateId))) throw new TRPCError({ code: "BAD_REQUEST", message: "La liste contient un participant non confirmé." });
    for (const item of input.assignments) {
      const token = crypto.randomBytes(32).toString("hex");
      const contactCandidateId = item.isSpy ? item.contactCandidateId : null;
      const isIntelligencePresident = contactIds.has(item.candidateId);
      await pool.execute(`INSERT INTO political_game_assignments (finalCandidateId,revealTokenHash,isSpy,isIntelligencePresident,displayedRole,spyCountry,fakeCountry,contactCandidateId,configuredByAdminId,emailSentAt,emailError,revealedAt) VALUES (?,?,?,?,?,?,?,?,?,NULL,NULL,NULL) ON DUPLICATE KEY UPDATE revealTokenHash=VALUES(revealTokenHash),isSpy=VALUES(isSpy),isIntelligencePresident=VALUES(isIntelligencePresident),displayedRole=VALUES(displayedRole),spyCountry=VALUES(spyCountry),fakeCountry=VALUES(fakeCountry),contactCandidateId=VALUES(contactCandidateId),configuredByAdminId=VALUES(configuredByAdminId),emailSentAt=NULL,emailError=NULL,revealedAt=NULL`, [item.candidateId,hashToken(token),item.isSpy,isIntelligencePresident,item.displayedRole || null,item.spyCountry || null,item.fakeCountry || null,contactCandidateId,ctx.adminUser.id]);
    }
    return { saved: input.assignments.length };
  }),

  saveOne: superAdminQuery.input(z.object({
    candidateId: z.number().int().positive(), isSpy: z.boolean(),
    displayedRole: z.string().trim().max(255).optional().default(""),
    spyCountry: z.string().trim().max(255).optional().default(""),
    fakeCountry: z.string().trim().max(255).optional().default(""),
    contactCandidateId: z.number().int().positive().nullable().optional().default(null),
  })).mutation(async ({ input, ctx }) => {
    if (input.isSpy && (!input.displayedRole || !input.spyCountry || !input.fakeCountry || !input.contactCandidateId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Renseignez le faux rôle, le pays, le faux pays et la personne à contacter." });
    if (input.isSpy && input.spyCountry === input.fakeCountry) throw new TRPCError({ code: "BAD_REQUEST", message: "Le faux pays doit être différent du pays réel." });
    if (input.isSpy && input.contactCandidateId === input.candidateId) throw new TRPCError({ code: "BAD_REQUEST", message: "Un Spy ne peut pas être sa propre personne de contact." });
    const pool = getSqlPool();
    const ids = [input.candidateId, ...(input.contactCandidateId ? [input.contactCandidateId] : [])];
    const [people] = await pool.query<CandidateRow[]>(`SELECT id,firstName,lastName,email FROM final_candidate_confirmations WHERE status='confirmed' AND id IN (${ids.map(() => "?").join(",")})`, ids);
    if (people.length !== ids.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Le candidat ou la personne à contacter est invalide." });
    const token = crypto.randomBytes(32).toString("hex");
    const [presidentRows] = await pool.query<(RowDataPacket & { total:number })[]>(`SELECT COUNT(*) total FROM political_game_assignments WHERE isSpy=true AND contactCandidateId=?`, [input.candidateId]);
    const isPresident = Number(presidentRows[0]?.total || 0) > 0;
    await pool.execute(`INSERT INTO political_game_assignments (finalCandidateId,revealTokenHash,isSpy,isIntelligencePresident,displayedRole,spyCountry,fakeCountry,contactCandidateId,configuredByAdminId,emailSentAt,emailError,revealedAt) VALUES (?,?,?,?,?,?,?,?,?,NULL,NULL,NULL) ON DUPLICATE KEY UPDATE revealTokenHash=VALUES(revealTokenHash),isSpy=VALUES(isSpy),isIntelligencePresident=VALUES(isIntelligencePresident),displayedRole=VALUES(displayedRole),spyCountry=VALUES(spyCountry),fakeCountry=VALUES(fakeCountry),contactCandidateId=VALUES(contactCandidateId),configuredByAdminId=VALUES(configuredByAdminId),emailSentAt=NULL,emailError=NULL,revealedAt=NULL`, [input.candidateId,hashToken(token),input.isSpy,isPresident,input.displayedRole || null,input.spyCountry || null,input.fakeCountry || null,input.isSpy ? input.contactCandidateId : null,ctx.adminUser.id]);
    return { candidateId: input.candidateId };
  }),

  myAssignment: publicQuery.query(async ({ ctx }) => {
    const session = requireCandidateSession(ctx.req.headers.get("cookie") || "");
    const pool = getSqlPool();
    const [rows] = await pool.query<AssignmentRow[]>(`SELECT f.id,f.firstName,f.lastName,f.email,a.isSpy,a.isIntelligencePresident,a.displayedRole,a.spyCountry,a.fakeCountry,a.contactCandidateId,a.emailSentAt,a.emailError FROM final_candidate_confirmations f JOIN political_game_assignments a ON a.finalCandidateId=f.id WHERE f.newUserId=? AND LOWER(f.email)=? AND f.status='confirmed' LIMIT 1`, [session.newUserId, session.email.trim().toLowerCase()]);
    const assignment = rows[0];
    if (!assignment) return null;
    let contact: { firstName: string; lastName: string; email: string; phoneNumber: string | null } | null = null;
    if (assignment.isSpy && assignment.contactCandidateId) {
      const [contacts] = await pool.query<CandidateRow[]>(`SELECT id,firstName,lastName,email,phoneNumber FROM final_candidate_confirmations WHERE id=? LIMIT 1`, [assignment.contactCandidateId]);
      if (contacts[0]) contact = { firstName: contacts[0].firstName, lastName: contacts[0].lastName, email: contacts[0].email, phoneNumber: contacts[0].phoneNumber || null };
    }
    let spies: Array<{ firstName:string; lastName:string; email:string; displayedRole:string|null; spyCountry:string|null; fakeCountry:string|null }> = [];
    if (assignment.isIntelligencePresident) {
      const [spyRows] = await pool.query<(CandidateRow & { displayedRole: string | null; spyCountry: string | null; fakeCountry: string | null })[]>(`SELECT f.id,f.firstName,f.lastName,f.email,a.displayedRole,a.spyCountry,a.fakeCountry FROM political_game_assignments a JOIN final_candidate_confirmations f ON f.id=a.finalCandidateId WHERE a.isSpy=true AND a.contactCandidateId=? ORDER BY f.firstName,f.lastName`, [assignment.id]);
      spies = spyRows.map(s => ({ firstName:s.firstName,lastName:s.lastName,email:s.email,displayedRole:s.displayedRole,spyCountry:s.spyCountry,fakeCountry:s.fakeCountry }));
    }
    return { firstName: assignment.firstName, isSpy: !!assignment.isSpy, isIntelligencePresident: !!assignment.isIntelligencePresident, displayedRole: assignment.displayedRole, spyCountry: assignment.spyCountry, fakeCountry: assignment.fakeCountry, contact, spies };
  }),

  reveal: publicQuery.input(z.object({ token: z.string().length(64) })).query(async ({ input }) => {
    const pool = getSqlPool();
    const [rows] = await pool.query<AssignmentRow[]>(`SELECT f.id,f.firstName,f.lastName,f.email,a.isSpy,a.isIntelligencePresident,a.displayedRole,a.spyCountry,a.fakeCountry,a.contactCandidateId,a.emailSentAt,a.emailError FROM political_game_assignments a JOIN final_candidate_confirmations f ON f.id=a.finalCandidateId WHERE a.revealTokenHash=? LIMIT 1`, [hashToken(input.token)]);
    const assignment = rows[0];
    if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Ce lien est invalide ou a été remplacé." });
    await pool.execute(`UPDATE political_game_assignments SET revealedAt=COALESCE(revealedAt,NOW()) WHERE finalCandidateId=?`, [assignment.id]);
    let contact: { firstName: string; lastName: string; email: string; phoneNumber: string | null } | null = null;
    if (assignment.isSpy && assignment.contactCandidateId) {
      const [contacts] = await pool.query<CandidateRow[]>(`SELECT id,firstName,lastName,email,phoneNumber FROM final_candidate_confirmations WHERE id=? LIMIT 1`, [assignment.contactCandidateId]);
      if (contacts[0]) contact = { firstName: contacts[0].firstName, lastName: contacts[0].lastName, email: contacts[0].email, phoneNumber: contacts[0].phoneNumber || null };
    }
    let spies: Array<{ firstName: string; lastName: string; email: string; displayedRole: string | null; spyCountry: string | null; fakeCountry: string | null }> = [];
    if (assignment.isIntelligencePresident) {
      const [spyRows] = await pool.query<(CandidateRow & { displayedRole: string | null; spyCountry: string | null; fakeCountry: string | null })[]>(`SELECT f.id,f.firstName,f.lastName,f.email,a.displayedRole,a.spyCountry,a.fakeCountry FROM political_game_assignments a JOIN final_candidate_confirmations f ON f.id=a.finalCandidateId WHERE a.isSpy=true AND a.contactCandidateId=? ORDER BY f.firstName,f.lastName`, [assignment.id]);
      spies = spyRows.map(s => ({ firstName: s.firstName, lastName: s.lastName, email: s.email, displayedRole: s.displayedRole, spyCountry: s.spyCountry, fakeCountry: s.fakeCountry }));
    }
    return { firstName: assignment.firstName, isSpy: !!assignment.isSpy, isIntelligencePresident: !!assignment.isIntelligencePresident, displayedRole: assignment.displayedRole, spyCountry: assignment.spyCountry, fakeCountry: assignment.fakeCountry, contact, spies };
  }),
});
