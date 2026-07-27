import { useState } from "react";
import { ArrowRight, Ban, Download, FileSpreadsheet, LogOut, RefreshCw } from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { CandidateImportRow, downloadCandidateImportTemplate, parseCandidateImportFile } from "@/lib/candidate-import";

type ImportReportRow = { rowNumber: number; email: string; status: string; message: string };

export default function AdminCandidateInvitationsPage() {
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super_admin";
  const [importRows, setImportRows] = useState<CandidateImportRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<Array<{ rowNumber: number; message: string }>>([]);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<ImportReportRow[]>([]);
  const utils = trpc.useUtils();
  const invitations = trpc.admin.listCandidateInvitations.useQuery(undefined, { enabled: isSuperAdmin, retry: false });
  const importInvitations = trpc.admin.importCandidateInvitations.useMutation({
    onSuccess: async (result) => {
      setReport(result.results);
      setImportRows([]);
      setInvalidRows([]);
      setFileName("");
      toast.success(`${result.createdCount} invitation(s) créée(s), ${result.acceptedExistingCount} compte(s) existant(s) accepté(s), ${result.confirmationEmailSentCount} confirmation(s) envoyée(s).`);
      await utils.admin.listCandidateInvitations.invalidate();
    },
    onError: (error) => toast.error(error.message || "Échec de l’import."),
  });
  const resend = trpc.admin.resendCandidateInvitation.useMutation({
    onSuccess: async (result) => {
      result.emailSent ? toast.success("Invitation renvoyée.") : toast.error("Lien renouvelé, mais l’e-mail a échoué.");
      await utils.admin.listCandidateInvitations.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const revoke = trpc.admin.revokeCandidateInvitation.useMutation({
    onSuccess: async () => {
      toast.success("Invitation annulée.");
      await utils.admin.listCandidateInvitations.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4A9B8E] border-t-transparent" /></div>;
  if (!user) return null;
  if (!isSuperAdmin) return <Navigate to={user.adminRole === "interview_admin" ? "/admin/interviews" : "/admin"} replace />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" lang="fr">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 border bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#4A9B8E]"><FileSpreadsheet className="h-6 w-6" /><span className="text-sm font-semibold">Super administration</span></div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Import et activation des candidats</h1>
            <p className="mt-1 text-sm text-slate-500">Gérez les personnes invitées avant leur apparition parmi les candidats acceptés.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin"><Button variant="outline"><ArrowRight className="mr-2 h-4 w-4" />Tableau de bord</Button></Link>
            <Button variant="outline" onClick={logout} className="text-red-600"><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button>
          </div>
        </header>

        <section className="border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div><h2 className="font-bold">Importer les futurs candidats acceptés</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Formats .xlsx et .csv. Les comptes existants sont acceptés immédiatement ; ceux dont l’e-mail n’est pas confirmé reçoivent un nouveau lien. Les autres reçoivent une invitation d’activation.</p></div>
            <Button type="button" variant="outline" onClick={downloadCandidateImportTemplate}><Download className="mr-2 h-4 w-4" />Télécharger le modèle</Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2"><Label htmlFor="candidate-import">Fichier Excel ou CSV</Label><Input id="candidate-import" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const parsed = await parseCandidateImportFile(file);
                setImportRows(parsed.valid); setInvalidRows(parsed.invalid); setFileName(file.name); setReport([]);
                if (!parsed.valid.length) toast.error("Aucune ligne valide dans ce fichier.");
              } catch (error) {
                setImportRows([]); setInvalidRows([]); setFileName("");
                toast.error(error instanceof Error ? error.message : "Fichier illisible.");
              } finally { event.target.value = ""; }
            }} /></div>
            <Button type="button" className="bg-[#4A9B8E] hover:bg-[#3D7A6F]" disabled={!importRows.length || importInvitations.isPending} onClick={() => importInvitations.mutate({ rows: importRows })}><FileSpreadsheet className="mr-2 h-4 w-4" />{importInvitations.isPending ? "Import et envoi..." : `Importer ${importRows.length || ""} candidat(s)`}</Button>
          </div>
          {fileName ? <div className="mt-4 rounded-lg border bg-slate-50 p-4 text-sm"><p className="font-medium">{fileName}</p><p className="mt-1 text-slate-600">{importRows.length} ligne(s) valide(s) · {invalidRows.length} ligne(s) invalide(s)</p>{importRows.length ? <div className="mt-3 max-h-48 overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="p-2">Prénom</th><th className="p-2">Nom</th><th className="p-2">E-mail</th><th className="p-2">Téléphone</th></tr></thead><tbody>{importRows.slice(0, 20).map((row) => <tr key={row.email} className="border-b last:border-0"><td className="p-2">{row.firstName}</td><td className="p-2">{row.lastName}</td><td className="p-2">{row.email}</td><td className="p-2">{row.phoneNumber || "—"}</td></tr>)}</tbody></table>{importRows.length > 20 ? <p className="mt-2 text-slate-500">Aperçu limité aux 20 premières lignes.</p> : null}</div> : null}{invalidRows.length ? <div className="mt-3 rounded bg-red-50 p-3 text-red-700">{invalidRows.slice(0, 10).map((row) => <p key={row.rowNumber}>Ligne {row.rowNumber} : {row.message}</p>)}</div> : null}</div> : null}
          {report.length ? <div className="mt-4 max-h-64 overflow-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-2">Ligne</th><th className="p-2">E-mail</th><th className="p-2">Résultat</th></tr></thead><tbody>{report.map((row) => <tr key={`${row.rowNumber}-${row.email}`} className="border-t"><td className="p-2">{row.rowNumber}</td><td className="p-2">{row.email}</td><td className="p-2">{row.message}</td></tr>)}</tbody></table></div> : null}
        </section>

        <section className="border bg-white shadow-sm">
          <div className="border-b p-5"><h2 className="font-bold">Suivi des invitations</h2><p className="mt-1 text-sm text-slate-500">Consultez l’état, renvoyez un lien expiré ou annulez une invitation.</p></div>
          <div className="max-h-[38rem] overflow-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-3">Candidat</th><th className="p-3">E-mail</th><th className="p-3">État</th><th className="p-3">Envoi</th><th className="p-3">Expiration</th><th className="p-3">Renvois</th><th className="p-3">Actions</th></tr></thead><tbody>{(invitations.data ?? []).map((invitation) => {
            const expired = invitation.status === "pending" && new Date(invitation.expiresAt).getTime() <= Date.now();
            return <tr key={invitation.id} className="border-t"><td className="p-3 font-medium">{invitation.firstName} {invitation.lastName}</td><td className="p-3">{invitation.email}</td><td className="p-3">{invitation.status === "activated" ? "Compte activé · accepté" : invitation.status === "revoked" ? "Invitation annulée" : expired ? "Lien expiré" : "En attente d’activation"}</td><td className="p-3">{invitation.emailSentAt ? "Envoyé" : <span className="text-red-600">Échec d’envoi</span>}</td><td className="p-3">{new Date(invitation.expiresAt).toLocaleString("fr-MA", { timeZone: "Africa/Casablanca" })}</td><td className="p-3">{invitation.resendCount}</td><td className="p-3">{invitation.status === "pending" ? <div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={resend.isPending} onClick={() => resend.mutate({ invitationId: invitation.id })}><RefreshCw className="mr-1 h-4 w-4" />Renvoyer</Button><Button type="button" size="sm" variant="destructive" disabled={revoke.isPending} onClick={() => { if (window.confirm(`Annuler l’invitation de ${invitation.email} ?`)) revoke.mutate({ invitationId: invitation.id }); }}><Ban className="mr-1 h-4 w-4" />Annuler</Button></div> : "—"}</td></tr>;
          })}</tbody></table>{invitations.isLoading ? <p className="p-6 text-center text-slate-500">Chargement...</p> : null}{!invitations.isLoading && !invitations.data?.length ? <p className="p-6 text-center text-slate-500">Aucune invitation importée.</p> : null}</div>
        </section>
      </div>
    </div>
  );
}
