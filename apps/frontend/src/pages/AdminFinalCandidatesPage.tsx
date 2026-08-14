import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clipboard, Download, LogOut, Mail, RefreshCw, Search, ShieldCheck, UserMinus, UserRound, Users, XCircle } from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

function csvCell(value: unknown) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
function downloadCsv(rows: string[]) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", rows.join("\n")], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "liste-finale-officielle.csv"; anchor.click(); URL.revokeObjectURL(url);
}
function formatDate(value: Date | string | null) { return value ? new Intl.DateTimeFormat("fr-MA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(value)) : "—"; }

export default function AdminFinalCandidatesPage() {
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super_admin";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("confirmed");
  const utils = trpc.useUtils();
  const confirmations = trpc.admin.listFinalCandidateConfirmations.useQuery(undefined, { enabled: isSuperAdmin, retry: false });
  const updateStatus = trpc.admin.setFinalCandidateConfirmationStatus.useMutation({
    onSuccess: async () => { toast.success("La liste finale a été mise à jour."); await utils.admin.listFinalCandidateConfirmations.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const rows = confirmations.data ?? [];
  const confirmed = rows.filter((item) => item.status === "confirmed");
  const pending = rows.filter((item) => item.status === "pending_email");
  const removed = rows.filter((item) => item.status === "removed");
  const filtered = useMemo(() => { const needle = search.trim().toLowerCase(); return rows.filter((item) => (status === "all" || item.status === status) && (!needle || `${item.firstName} ${item.lastName} ${item.email} ${item.phoneNumber}`.toLowerCase().includes(needle))); }, [rows, search, status]);
  const publicLink = `${window.location.origin}/confirmation-finale`;

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-11 w-11 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" /></div>;
  if (!user) return null;
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  return <div className="min-h-screen bg-[#F3F7F6] p-4 md:p-8" lang="fr" dir="ltr"><div className="mx-auto max-w-[1450px] space-y-6">
    <header className="relative overflow-hidden rounded-3xl bg-[linear-gradient(125deg,#102f2b,#24675d,#4A9B8E)] p-6 text-white shadow-xl md:p-8"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl" /><div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex items-center gap-2 text-emerald-100"><ShieldCheck className="h-5 w-5" /><span className="text-sm font-bold">Super administration</span></div><h1 className="mt-3 text-3xl font-black md:text-4xl">Candidats définitifs</h1><p className="mt-2 max-w-2xl leading-7 text-white/75">Interface officielle et isolée pour gérer les participants ayant utilisé le lien de confirmation finale.</p></div><div className="flex flex-wrap gap-2"><Link to="/admin"><Button className="bg-white text-[#173f39] hover:bg-white/90"><ArrowLeft className="mr-2 h-4 w-4" />Tableau de bord</Button></Link><Link to="/admin/final-admissions"><Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">Historique de sélection</Button></Link><Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button></div></div></header>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Confirmés définitivement", confirmed.length, CheckCircle2, "border-emerald-200 text-emerald-700"], ["E-mails à confirmer", pending.length, Mail, "border-amber-200 text-amber-700"], ["Retirés", removed.length, UserMinus, "border-red-200 text-red-700"], ["Total des demandes", rows.length, Users, "border-sky-200 text-sky-700"],
    ].map(([label, count, Icon, color]) => <div key={String(label)} className={`rounded-2xl border bg-white p-5 shadow-sm ${color}`}><Icon className="h-6 w-6" /><p className="mt-4 text-sm font-semibold text-slate-500">{String(label)}</p><p className="mt-1 text-3xl font-black text-slate-900">{String(count)}</p></div>)}</section>

    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-black text-emerald-950">Lien public de confirmation</h2><p className="mt-1 break-all text-sm text-emerald-800">{publicLink}</p></div><Button variant="outline" className="border-emerald-300 bg-white" onClick={async () => { await navigator.clipboard.writeText(publicLink); toast.success("Lien copié."); }}><Clipboard className="mr-2 h-4 w-4" />Copier le lien</Button></div></section>

    <section className="overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="border-b p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Rechercher par nom, e-mail ou téléphone…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select className="h-10 rounded-md border bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="confirmed">Confirmés définitivement</option><option value="pending_email">E-mail à confirmer</option><option value="removed">Retirés</option><option value="all">Tous les statuts</option></select><Button variant="outline" onClick={() => confirmations.refetch()} disabled={confirmations.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${confirmations.isFetching ? "animate-spin" : ""}`} />Actualiser</Button><Button variant="outline" disabled={!confirmed.length} onClick={() => downloadCsv(["nom,email,telephone,date_confirmation,description", ...confirmed.map((item) => [csvCell(`${item.firstName} ${item.lastName}`), csvCell(item.email), csvCell(item.phoneNumber), csvCell(formatDate(item.confirmedAt)), csvCell(item.profileDescription)].join(","))])}><Download className="mr-2 h-4 w-4" />Exporter la liste finale</Button></div><p className="mt-3 text-sm text-slate-500">{filtered.length} résultat(s)</p></div>
      {confirmations.isLoading ? <div className="p-12 text-center text-slate-500">Chargement de la liste finale…</div> : confirmations.isError ? <div className="p-10 text-center text-red-700">{confirmations.error.message}</div> : !filtered.length ? <div className="p-12 text-center"><XCircle className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-3 font-bold text-slate-700">Aucun candidat dans cette catégorie</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-100 text-slate-700"><tr><th className="p-4">Candidat</th><th className="p-4">Contact</th><th className="p-4">Profil</th><th className="p-4">Statut</th><th className="p-4">Date</th><th className="p-4">Action</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t align-middle hover:bg-slate-50"><td className="p-4"><div className="flex items-center gap-3"><div className="h-12 w-12 overflow-hidden rounded-full bg-emerald-50">{item.profileImageUrl ? <img src={item.profileImageUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-full w-full p-2.5 text-emerald-300" />}</div><div><p className="font-black text-slate-900">{item.firstName} {item.lastName}</p><p className="text-xs text-slate-400">ID {item.id}</p></div></div></td><td className="p-4"><p>{item.email}</p><p className="mt-1 text-slate-500">{item.phoneNumber || "—"}</p></td><td className="max-w-xs p-4 text-slate-600">{item.profileDescription || <span className="text-slate-400">Profil non complété</span>}</td><td className="p-4">{item.status === "confirmed" ? <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">Confirmé définitivement</span> : item.status === "pending_email" ? <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">E-mail à confirmer</span> : <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800">Retiré</span>}</td><td className="p-4 text-slate-500">{formatDate(item.confirmedAt || item.createdAt)}</td><td className="p-4">{item.status === "confirmed" ? <Button size="sm" variant="destructive" disabled={updateStatus.isPending} onClick={() => { if (window.confirm(`Retirer ${item.firstName} ${item.lastName} de la liste finale ?`)) updateStatus.mutate({ id: item.id, status: "removed" }); }}>Retirer</Button> : item.status === "removed" ? <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: item.id, status: "confirmed" })}>Réintégrer</Button> : "—"}</td></tr>)}</tbody></table></div>}
    </section>
  </div></div>;
}
