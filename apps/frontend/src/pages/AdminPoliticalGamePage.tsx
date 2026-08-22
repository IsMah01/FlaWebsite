import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { ArrowLeft, Mail, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

type Draft = { candidateId: number; isSpy: boolean; isIntelligencePresident: boolean; displayedRole: string; spyCountry: string; fakeCountry: string; contactCandidateId: number | null };

const countryOptions = ["الولايات المتحدة الأمريكية", "روسيا", "الصين", "تركيا", "العراق", "إيران", "الاتحاد الأوروبي"];
const roleOptions = [
  "وزير/وزيرة الاقتصاد", "وزير/وزيرة الإعلام", "وزير/وزيرة المالية",
  "وزير/وزيرة الطاقة النووية", "وزير/وزيرة الفلاحة", "وزير/وزيرة الخارجية",
  "مستشار/مستشارة الأمن القومي", "مستشار/مستشارة رئاسة الاستخبارات الصحية",
];
const personLabel = (person: { firstName:string; lastName:string; email:string; phoneNumber?:string }) => `${person.firstName} ${person.lastName} — ${person.email}${person.phoneNumber ? ` — ${person.phoneNumber}` : ""}`;

export default function AdminPoliticalGamePage() {
  const { user, isLoading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  const allowed = user?.role === "admin" && user.adminRole === "super_admin";
  const overview = trpc.politicalGame.adminOverview.useQuery(undefined, { enabled: allowed });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [contactSearch, setContactSearch] = useState<Record<number,string>>({});
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!overview.data) return;
    const saved = new Map(overview.data.assignments.map(a => [a.id, a]));
    setDrafts(overview.data.candidates.map(c => { const a = saved.get(c.id); return { candidateId: c.id, isSpy: a?.isSpy ?? false, isIntelligencePresident: a?.isIntelligencePresident ?? false, displayedRole: a?.displayedRole ?? "", spyCountry: a?.spyCountry ?? "", fakeCountry: a?.fakeCountry ?? "", contactCandidateId: a?.contactCandidateId ?? null }; }));
    setContactSearch(Object.fromEntries(overview.data.assignments.map(a => { const contact=overview.data.candidates.find(c=>c.id===a.contactCandidateId); return [a.id,contact?personLabel(contact):""]; })));
  }, [overview.data]);
  const mutation = trpc.politicalGame.saveAndSend.useMutation({
    onSuccess: async r => { toast.success(`${r.saved} attribution(s) enregistrée(s) dans les comptes candidats.`); await overview.refetch(); },
    onError: e => toast.error(e.message),
  });
  const saveOne = trpc.politicalGame.saveOne.useMutation({
    onSuccess: async () => { toast.success("Un seul compte candidat a été publié. Aucun autre compte n’a été modifié."); await overview.refetch(); },
    onError: e => toast.error(e.message),
  });
  const people = overview.data?.candidates ?? [];
  const filtered = useMemo(() => people.filter(p => `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(search.toLowerCase())), [people, search]);
  const update = (id: number, patch: Partial<Draft>) => setDrafts(current => current.map(d => d.candidateId === id ? { ...d, ...patch } : d));
  if (isLoading) return <div className="p-20 text-center">Chargement…</div>;
  if (!allowed) return <Navigate to="/admin" replace />;
  return <div className="min-h-screen bg-slate-50 p-4 md:p-8" lang="fr">
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-[linear-gradient(125deg,#102f2b,#4A9B8E)] p-6 text-white shadow-xl md:p-8">
        <Link to="/admin" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-bold"><ArrowLeft className="h-4 w-4"/>Tableau de bord</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="font-bold text-emerald-100">Configuration confidentielle</p><h1 className="mt-1 text-3xl font-black">Jeu politique</h1><p className="mt-2 text-white/75">Choisissez chaque Spy, son pays, sa couverture, son faux rôle et son contact.</p></div><Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={mutation.isPending || !drafts.length} onClick={() => mutation.mutate({ assignments: drafts })}><Mail className="mr-2 h-4 w-4"/>{mutation.isPending ? "Enregistrement…" : "Publier dans les comptes"}</Button></div>
      </header>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Parcours simple :</strong> cochez Spy, remplissez les quatre informations demandées, puis envoyez. La personne choisie comme contact verra automatiquement ce Spy dans son message secret.</section>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><Input className="bg-white pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un participant…"/></div>
      <section className="grid gap-4">
        {filtered.map(person => { const d = drafts.find(x => x.candidateId === person.id); if (!d) return null; return <article key={person.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${d.isSpy ? "border-red-300" : d.isIntelligencePresident ? "border-violet-300" : ""}`}>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_auto_1fr_1fr_1fr_1fr] lg:items-center">
            <div><p className="font-black text-slate-900">{person.firstName} {person.lastName}</p><p className="text-sm text-slate-500">{person.email}</p></div>
            <label className="flex cursor-pointer items-center gap-2 font-bold text-red-700"><input type="checkbox" checked={d.isSpy} onChange={e => {if(!e.target.checked)setContactSearch(current=>({...current,[person.id]:""}));update(person.id,{isSpy:e.target.checked, displayedRole:e.target.checked ? d.displayedRole : "", spyCountry:e.target.checked ? d.spyCountry : "", fakeCountry:e.target.checked ? d.fakeCountry : "", contactCandidateId:e.target.checked ? d.contactCandidateId : null});}}/><Shield className="h-4 w-4"/>Spy</label>
            <select disabled={!d.isSpy} className="h-10 rounded-md border bg-white px-3 text-sm disabled:opacity-50" value={d.displayedRole} onChange={e=>update(person.id,{displayedRole:e.target.value})}><option value="">Faux rôle…</option>{roleOptions.map(role=><option key={role} value={role}>{role}</option>)}</select>
            <select disabled={!d.isSpy} className="h-10 rounded-md border bg-white px-3 text-sm disabled:opacity-50" value={d.spyCountry} onChange={e=>update(person.id,{spyCountry:e.target.value})}><option value="">Pays réel…</option>{countryOptions.map(country=><option key={country} value={country}>{country}</option>)}</select>
            <select disabled={!d.isSpy} className="h-10 rounded-md border bg-white px-3 text-sm disabled:opacity-50" value={d.fakeCountry} onChange={e=>update(person.id,{fakeCountry:e.target.value})}><option value="">Faux pays…</option>{countryOptions.filter(country=>country!==d.spyCountry).map(country=><option key={country} value={country}>{country}</option>)}</select>
            <div><Input disabled={!d.isSpy} list={`contacts-${person.id}`} value={contactSearch[person.id] ?? ""} onChange={e=>{const value=e.target.value;setContactSearch(current=>({...current,[person.id]:value}));const needle=value.trim().toLowerCase();const match=people.find(p=>p.id!==person.id&&(personLabel(p).toLowerCase()===needle||p.email.toLowerCase()===needle||p.phoneNumber?.toLowerCase()===needle));update(person.id,{contactCandidateId:match?.id??null});}} placeholder="Écrire un nom, e-mail ou téléphone…"/><datalist id={`contacts-${person.id}`}>{people.filter(p=>p.id!==person.id).map(p=><option key={p.id} value={personLabel(p)}/>)}</datalist></div>
          </div>
          <div className="mt-4 flex justify-end"><Button variant="outline" disabled={saveOne.isPending} onClick={() => saveOne.mutate({candidateId:d.candidateId,isSpy:d.isSpy,displayedRole:d.displayedRole,spyCountry:d.spyCountry,fakeCountry:d.fakeCountry,contactCandidateId:d.contactCandidateId})}>{saveOne.isPending && saveOne.variables?.candidateId === d.candidateId ? "Publication…" : "Publier uniquement ce candidat"}</Button></div>
        </article>; })}
      </section>
      {!overview.isLoading && !people.length ? <div className="rounded-2xl border bg-white p-10 text-center">Aucun participant confirmé.</div> : null}
    </main>
  </div>;
}
