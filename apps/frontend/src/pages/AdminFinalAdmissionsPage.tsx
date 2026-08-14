import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, LogOut, Mail, RefreshCw, Search, UserCheck, Users, XCircle } from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

const PAGE_SIZE = 25;
type FinalStatus = "pending" | "admitted" | "not_admitted_after_interview";

function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(value));
}

function finalLabel(status: string) {
  if (status === "admitted") return "Admis définitivement";
  if (status === "not_admitted_after_interview") return "Liste d’attente";
  return "Décision en attente";
}

function finalBadge(status: string) {
  if (status === "admitted") return "bg-emerald-100 text-emerald-800";
  if (status === "not_admitted_after_interview") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

export default function AdminFinalAdmissionsPage() {
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super_admin";
  const [search, setSearch] = useState("");
  const [finalStatus, setFinalStatus] = useState("all");
  const [interviewStatus, setInterviewStatus] = useState("all");
  const [recommendation, setRecommendation] = useState("all");
  const [emailStatus, setEmailStatus] = useState("all");
  const [interviewer, setInterviewer] = useState("all");
  const [page, setPage] = useState(1);
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [pendingFileName, setPendingFileName] = useState("");
  const utils = trpc.useUtils();
  const candidates = trpc.admin.listFinalAdmissionCandidates.useQuery(undefined, { enabled: isSuperAdmin, retry: false });
  const confirmations = trpc.admin.listFinalCandidateConfirmations.useQuery(undefined, { enabled: isSuperAdmin, retry: false });
  const setConfirmationStatus = trpc.admin.setFinalCandidateConfirmationStatus.useMutation({
    onSuccess: async () => {
      toast.success("Liste des confirmations mise à jour.");
      await utils.admin.listFinalCandidateConfirmations.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const refresh = async () => {
    await Promise.all([candidates.refetch(), confirmations.refetch()]);
    toast.success("Liste actualisée");
  };
  const updateStatus = trpc.admin.updateFinalAdmissionStatus.useMutation({
    onSuccess: async () => {
      toast.success("Statut final mis à jour. Aucun e-mail n’a été envoyé.");
      await utils.admin.listFinalAdmissionCandidates.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const importFinal = trpc.admin.importFinalAdmittedCandidates.useMutation({
    onSuccess: async (result) => {
      setPendingEmails([]);
      setPendingFileName("");
      const warning = result.notFoundOrIneligible.length ? ` · ${result.notFoundOrIneligible.length} e-mail(s) sans correspondance` : "";
      toast.success(`${result.admittedCount} admis · ${result.notAdmittedAfterInterviewCount} en liste d’attente${warning}`, { duration: 12000 });
      await utils.admin.listFinalAdmissionCandidates.invalidate();
    },
    onError: (error) => toast.error(error.message, { duration: 12000 }),
  });
  const sendEmails = trpc.admin.sendFinalAdmissionEmails.useMutation({
    onSuccess: async (result) => {
      const message = `${result.sentCount}/${result.targetedCount} e-mail(s) envoyé(s)${result.failedCount ? ` · ${result.failedCount} échec(s)` : ""}`;
      result.failedCount ? toast.warning(message, { duration: 12000 }) : toast.success(message, { duration: 10000 });
      await utils.admin.listFinalAdmissionCandidates.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const allCandidates = candidates.data ?? [];
  const allConfirmations = confirmations.data ?? [];
  const confirmedParticipants = allConfirmations.filter((item) => item.status === "confirmed");
  const pendingEmailParticipants = allConfirmations.filter((item) => item.status === "pending_email");
  const removedParticipants = allConfirmations.filter((item) => item.status === "removed");
  const interviewers = useMemo(() => [...new Set(allCandidates.map((candidate) => candidate.interviewerName).filter(Boolean))].sort(), [allCandidates]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allCandidates.filter((candidate) => {
      const emailState = candidate.finalAdmissionEmailSentAt ? "sent" : candidate.finalAdmissionEmailError && candidate.finalAdmissionEmailError !== "SENDING" ? "failed" : "unsent";
      return (!needle || `${candidate.firstName} ${candidate.lastName} ${candidate.email} ${candidate.phoneNumber ?? ""}`.toLowerCase().includes(needle))
        && (finalStatus === "all" || candidate.finalAdmissionStatus === finalStatus)
        && (interviewStatus === "all" || (candidate.interviewStatus ?? "not_booked") === interviewStatus)
        && (recommendation === "all" || (candidate.recommendation ?? "pending") === recommendation)
        && (emailStatus === "all" || emailState === emailStatus)
        && (interviewer === "all" || candidate.interviewerName === interviewer);
    });
  }, [allCandidates, search, finalStatus, interviewStatus, recommendation, emailStatus, interviewer]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const admitted = allCandidates.filter((candidate) => candidate.finalAdmissionStatus === "admitted");
  const waiting = allCandidates.filter((candidate) => candidate.finalAdmissionStatus === "not_admitted_after_interview");
  const undecided = allCandidates.filter((candidate) => candidate.finalAdmissionStatus === "pending");
  const unsentAdmitted = admitted.filter((candidate) => !candidate.finalAdmissionEmailSentAt && candidate.finalAdmissionEmailError !== "SENDING");
  const matchedPending = pendingEmails.filter((email) => allCandidates.some((candidate) => candidate.email.toLowerCase() === email));
  const unknownPending = pendingEmails.filter((email) => !allCandidates.some((candidate) => candidate.email.toLowerCase() === email));

  function resetFilters() {
    setSearch(""); setFinalStatus("all"); setInterviewStatus("all"); setRecommendation("all"); setEmailStatus("all"); setInterviewer("all"); setPage(1);
  }

  async function readCsv(file?: File) {
    if (!file) return;
    const lines = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const header = lines.shift()?.replace(/^"|"$/g, "").trim().toLowerCase();
    if (!header || !["email", "e-mail", "adresse email", "adresse e-mail"].includes(header)) {
      toast.error("La première ligne doit être uniquement : email"); return;
    }
    const invalid: number[] = [];
    const pattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    const parsed = lines.map((line, index) => {
      const email = line.replace(/^"|"$/g, "").trim().toLowerCase();
      if (line.includes(";") || line.includes(",") || !pattern.test(email)) invalid.push(index + 2);
      return email;
    });
    if (invalid.length) { toast.error(`Lignes invalides : ${invalid.slice(0, 12).join(", ")}`); return; }
    const unique = [...new Set(parsed)];
    if (!unique.length) { toast.error("Le fichier ne contient aucun e-mail"); return; }
    setPendingEmails(unique); setPendingFileName(file.name);
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4A9B8E] border-t-transparent" /></div>;
  if (!user) return null;
  if (!isSuperAdmin) return <Navigate to={user.adminRole === "interview_admin" ? "/admin/interviews" : "/admin"} replace />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" lang="fr" dir="ltr">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><div className="flex items-center gap-2 text-[#4A9B8E]"><UserCheck className="h-6 w-6" /><span className="text-sm font-bold">Super administration</span></div><h1 className="mt-2 text-3xl font-black text-slate-900">Liste finale officielle</h1><p className="mt-1 text-slate-500">Cette liste est alimentée exclusivement par le lien public de confirmation définitive.</p></div>
            <div className="flex flex-wrap gap-2"><Link to="/admin"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Tableau de bord</Button></Link><Button variant="outline" onClick={refresh} disabled={candidates.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${candidates.isFetching ? "animate-spin" : ""}`} />Actualiser</Button><Button variant="outline" className="text-red-600" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button></div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Confirmés définitivement", confirmedParticipants.length, CheckCircle2, "text-emerald-700"], ["E-mails à confirmer", pendingEmailParticipants.length, Mail, "text-amber-700"], ["Retirés par le super admin", removedParticipants.length, XCircle, "text-red-700"], ["Total des demandes", allConfirmations.length, Users, "text-blue-700"],
          ].map(([label, value, Icon, color]) => <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><Icon className={`h-6 w-6 ${color}`} /><p className="mt-3 text-sm text-slate-500">{String(label)}</p><p className="text-3xl font-black text-slate-900">{String(value)}</p></div>)}
        </section>

        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-bold text-emerald-950">Candidats acceptés — liste finale</h2><p className="mt-1 text-sm text-emerald-800">Seuls les statuts « Confirmé définitivement » appartiennent à la liste officielle · lien public : <strong>/confirmation-finale</strong></p></div>
            <Button variant="outline" onClick={() => downloadText("liste-finale-officielle.csv", ["nom,email,telephone,date_confirmation", ...confirmedParticipants.map((item) => [csvCell(`${item.firstName} ${item.lastName}`), csvCell(item.email), csvCell(item.phoneNumber), csvCell(formatDate(item.confirmedAt))].join(","))].join("\n"))}><Download className="mr-2 h-4 w-4" />Exporter la liste finale</Button>
          </div>
          {confirmations.isLoading ? <div className="p-8 text-center text-slate-500">Chargement…</div> : !allConfirmations.length ? <div className="p-8 text-center text-slate-500">Aucune confirmation reçue pour le moment.</div> : <div className="max-h-[32rem] overflow-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-3">Candidat</th><th className="p-3">Contact</th><th className="p-3">État</th><th className="p-3">Date</th><th className="p-3">Action super admin</th></tr></thead><tbody>{allConfirmations.map((item) => <tr key={item.id} className="border-t"><td className="p-3 font-semibold">{item.firstName} {item.lastName}</td><td className="p-3"><div>{item.email}</div><div className="text-slate-500">{item.phoneNumber || "—"}</div></td><td className="p-3">{item.status === "confirmed" ? <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">Confirmé définitivement</span> : item.status === "pending_email" ? <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">E-mail à confirmer</span> : <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-800">Retiré</span>}</td><td className="p-3">{formatDate(item.confirmedAt || item.createdAt)}</td><td className="p-3">{item.status === "confirmed" ? <Button size="sm" variant="destructive" disabled={setConfirmationStatus.isPending} onClick={() => { if (window.confirm(`Retirer ${item.firstName} ${item.lastName} de la liste définitive ?`)) setConfirmationStatus.mutate({ id: item.id, status: "removed" }); }}>Retirer</Button> : item.status === "removed" ? <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={setConfirmationStatus.isPending} onClick={() => setConfirmationStatus.mutate({ id: item.id, status: "confirmed" })}>Réintégrer</Button> : "—"}</td></tr>)}</tbody></table></div>}
        </section>

        <div className="rounded-2xl border border-slate-300 bg-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-800">Historique de l’ancienne sélection</h2>
          <p className="mt-1 text-sm text-slate-600">Les outils ci-dessous sont conservés uniquement pour consulter la phase d’entretien et les anciennes décisions. Ils ne déterminent plus la liste finale officielle.</p>
        </div>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><h2 className="flex items-center gap-2 text-xl font-bold"><FileSpreadsheet className="h-5 w-5 text-[#4A9B8E]" />Importer les admis définitifs</h2><p className="mt-1 text-sm text-slate-500">CSV UTF-8, une seule colonne « email ». L’import ne déclenche aucun e-mail.</p></div><Button variant="outline" onClick={() => downloadText("modele-admis-definitifs.csv", "email\nexemple@email.com\n")}><Download className="mr-2 h-4 w-4" />Télécharger le modèle</Button></div>
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center"><Input type="file" accept=".csv,text/csv" className="md:max-w-xl" onChange={(event) => { void readCsv(event.target.files?.[0]); event.target.value = ""; }} /><Button className="bg-emerald-700 hover:bg-emerald-800" disabled={!pendingEmails.length || importFinal.isPending} onClick={() => { if (window.confirm(`Confirmer l'import ?\n\n${matchedPending.length} admis correspondants\n${allCandidates.length - matchedPending.length} candidats placés en liste d'attente\n${unknownPending.length} sans correspondance\n\nAucun e-mail ne sera envoyé.`)) importFinal.mutate({ emails: pendingEmails }); }}>{importFinal.isPending ? "Importation…" : `Confirmer ${pendingEmails.length || ""} e-mail(s)`}</Button></div>
          {pendingFileName ? <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-sm"><p className="font-semibold" dir="ltr">{pendingFileName}</p><p className="mt-1 text-slate-600"><strong>{matchedPending.length}</strong> correspondance(s) · <strong>{unknownPending.length}</strong> sans correspondance · <strong>{allCandidates.length - matchedPending.length}</strong> candidat(s) placé(s) en liste d’attente</p>{unknownPending.length ? <p className="mt-2 break-words text-red-700" dir="ltr">Sans correspondance : {unknownPending.slice(0, 15).join(", ")}{unknownPending.length > 15 ? "…" : ""}</p> : null}<Button className="mt-3" size="sm" variant="outline" onClick={() => { setPendingEmails([]); setPendingFileName(""); }}>Annuler cet import</Button></div> : null}
        </section>

        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="flex items-center gap-2 text-xl font-bold text-violet-950"><Mail className="h-5 w-5" />Envoi des admissions</h2><p className="mt-1 text-sm text-violet-800">Le message et le PDF seront envoyés uniquement aux admis définitifs qui ne les ont pas encore reçus. La liste d’attente est toujours exclue.</p></div><Button className="bg-violet-700 hover:bg-violet-800" disabled={!unsentAdmitted.length || sendEmails.isPending} onClick={() => { if (window.confirm(`Envoyer maintenant l'e-mail et le PDF à ${unsentAdmitted.length} admis définitif(s) ?`)) sendEmails.mutate(); }}>{sendEmails.isPending ? "Envoi…" : `Envoyer à ${unsentAdmitted.length} admis`}</Button></div></section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Nom, e-mail ou téléphone…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>{[
            [finalStatus, setFinalStatus, [["all","Tous les statuts finaux"],["pending","Décision en attente"],["admitted","Admis définitifs"],["not_admitted_after_interview","Liste d’attente"]]],
            [interviewStatus, setInterviewStatus, [["all","Tous les entretiens"],["completed","Entretien terminé"],["absent","Absent"],["scheduled","Planifié"],["cancelled","Annulé"],["not_booked","Sans réservation"]]],
            [recommendation, setRecommendation, [["all","Toutes les recommandations"],["accepted","Recommandé"],["rejected","Non recommandé"],["pending","Sans recommandation"]]],
            [emailStatus, setEmailStatus, [["all","Tous les e-mails"],["unsent","Non envoyé"],["sent","Envoyé"],["failed","Échec"]]],
          ].map(([value, setter, options], index) => <select key={index} className="h-10 rounded-md border bg-white px-3 text-sm" value={value as string} onChange={(event) => { (setter as (value: string) => void)(event.target.value); setPage(1); }}>{(options as string[][]).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>)}<select className="h-10 rounded-md border bg-white px-3 text-sm" value={interviewer} onChange={(event) => { setInterviewer(event.target.value); setPage(1); }}><option value="all">Tous les responsables</option>{interviewers.map((name) => <option key={String(name)} value={String(name)}>{String(name)}</option>)}</select><Button variant="outline" onClick={resetFilters}>Réinitialiser</Button><Button variant="outline" onClick={() => downloadText("admissions-finales-filtrees.csv", ["nom,email,telephone,entretien,recommandation,decision_finale,email_admission", ...filtered.map((candidate) => [csvCell(`${candidate.firstName} ${candidate.lastName}`), csvCell(candidate.email), csvCell(candidate.phoneNumber), csvCell(candidate.interviewStatus), csvCell(candidate.recommendation), csvCell(finalLabel(candidate.finalAdmissionStatus)), csvCell(candidate.finalAdmissionEmailSentAt ? "envoye" : "non envoye")].join(","))].join("\n"))}><Download className="mr-2 h-4 w-4" />Exporter</Button></div><p className="mt-3 text-sm text-slate-500">{filtered.length} résultat(s) sur {allCandidates.length}</p></div>
          {candidates.isLoading ? <div className="p-12 text-center text-slate-500">Chargement des candidats de la phase orale…</div> : candidates.isError ? <div className="p-8 text-center text-red-700">{candidates.error.message}</div> : !allCandidates.length ? <div className="p-12 text-center"><XCircle className="mx-auto h-12 w-12 text-slate-300" /><h3 className="mt-3 font-bold text-slate-800">Aucun candidat retenu pour l’entretien</h3><p className="mt-1 text-sm text-slate-500">Cette page affiche tous les dossiers dont le statut de première étape est « accepted ».</p></div> : (
            <><div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead className="bg-slate-100 text-slate-700"><tr><th className="p-3">Candidat</th><th className="p-3">Contact</th><th className="p-3">Entretien</th><th className="p-3">Évaluation</th><th className="p-3">Décision finale</th><th className="p-3">E-mail</th><th className="p-3">Actions</th></tr></thead><tbody>{visible.map((candidate) => <tr key={candidate.id} className="border-t align-top hover:bg-slate-50"><td className="p-3"><p className="font-bold text-slate-900">{candidate.firstName} {candidate.lastName}</p><p className="mt-1 text-xs text-slate-500">ID {candidate.id}</p></td><td className="p-3"><p>{candidate.email}</p><p className="mt-1 text-slate-500">{candidate.phoneNumber || "—"}</p></td><td className="p-3"><p className="font-medium">{candidate.interviewStatus === "completed" ? "Terminé" : candidate.interviewStatus === "absent" ? "Absent" : candidate.interviewStatus === "scheduled" ? "Planifié" : candidate.interviewStatus === "cancelled" ? "Annulé" : "Sans réservation"}</p><p className="mt-1 text-xs text-slate-500">{formatDate(candidate.interviewDate)} · {candidate.interviewerName || "Non attribué"}</p></td><td className="p-3"><p>{candidate.recommendation === "accepted" ? "Recommandé" : candidate.recommendation === "rejected" ? "Non recommandé" : "En attente"}</p><p className="mt-1 text-xs text-slate-500">Scores : {[candidate.communicationScore, candidate.motivationScore, candidate.leadershipScore].map((score) => score ?? "—").join(" / ")}</p></td><td className="p-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${finalBadge(candidate.finalAdmissionStatus)}`}>{finalLabel(candidate.finalAdmissionStatus)}</span></td><td className="p-3">{candidate.finalAdmissionEmailSentAt ? <><span className="font-semibold text-emerald-700">Envoyé</span><p className="mt-1 text-xs text-slate-500">{formatDate(candidate.finalAdmissionEmailSentAt)}</p></> : candidate.finalAdmissionEmailError === "SENDING" ? <span className="text-blue-700">Envoi en cours</span> : candidate.finalAdmissionEmailError ? <><span className="font-semibold text-red-700">Échec</span><p className="mt-1 max-w-52 break-words text-xs text-red-600">{candidate.finalAdmissionEmailError}</p></> : <span className="text-slate-500">Non envoyé</span>}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={updateStatus.isPending || candidate.finalAdmissionStatus === "admitted"} onClick={() => { if (window.confirm(`Admettre définitivement ${candidate.firstName} ${candidate.lastName} ? Aucun e-mail ne sera envoyé maintenant.`)) updateStatus.mutate({ candidateId: candidate.id, status: "admitted" as FinalStatus }); }}>Admettre</Button><Button size="sm" variant="outline" disabled={updateStatus.isPending || candidate.finalAdmissionStatus === "not_admitted_after_interview" || !!candidate.finalAdmissionEmailSentAt} onClick={() => updateStatus.mutate({ candidateId: candidate.id, status: "not_admitted_after_interview" as FinalStatus })}>Liste d’attente</Button><Button size="sm" variant="outline" disabled={updateStatus.isPending || candidate.finalAdmissionStatus === "pending" || !!candidate.finalAdmissionEmailSentAt} onClick={() => updateStatus.mutate({ candidateId: candidate.id, status: "pending" as FinalStatus })}>À décider</Button></div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t p-4"><p className="text-sm text-slate-500">Page {safePage} sur {pages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Précédent</Button><Button variant="outline" size="sm" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>Suivant</Button></div></div></>
          )}
        </section>
      </div>
    </div>
  );
}
