import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { ArrowLeft, Eye, Search, Shield, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

type Draft = { candidateId: number; isSpy: boolean; isIntelligencePresident: boolean; displayedRole: string; spyCountry: string; fakeCountry: string; contactCandidateId: number | null };

const countryOptions = ["الولايات المتحدة الأمريكية", "روسيا", "الصين", "تركيا", "الخليج", "إيران", "الاتحاد الأوروبي"];
const roleOptions = [
  "وزير/وزيرة الاقتصاد", "وزير/وزيرة الإعلام", "وزير/وزيرة المالية",
  "وزير/وزيرة الطاقة النووية", "وزير/وزيرة الفلاحة", "وزير/وزيرة الخارجية", "وزير/وزيرة الداخلية",
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
  const [presidentPreviewId, setPresidentPreviewId] = useState<number | null>(null);
  const [testPresidentIds, setTestPresidentIds] = useState<Set<number>>(() => new Set());
  useEffect(() => {
    if (!overview.data) return;
    const saved = new Map(overview.data.assignments.map(a => [a.id, a]));
    setDrafts(overview.data.candidates.map(c => { const a = saved.get(c.id); return { candidateId: c.id, isSpy: a?.isSpy ?? false, isIntelligencePresident: a?.isIntelligencePresident ?? false, displayedRole: a?.displayedRole ?? "", spyCountry: a?.spyCountry ?? "", fakeCountry: a?.fakeCountry ?? "", contactCandidateId: a?.contactCandidateId ?? null }; }));
    setContactSearch(Object.fromEntries(overview.data.assignments.map(a => { const contact=overview.data.candidates.find(c=>c.id===a.contactCandidateId); return [a.id,contact?personLabel(contact):""]; })));
  }, [overview.data]);
  const mutation = trpc.politicalGame.saveAndSend.useMutation({
    onSuccess: async r => { toast.success(`تم نشر ${r.saved} دوراً في حسابات المشاركين.`); await overview.refetch(); },
    onError: e => toast.error(e.message),
  });
  const saveOne = trpc.politicalGame.saveOne.useMutation({
    onSuccess: async () => { toast.success("تم نشر الدور في حساب هذا المشارك فقط."); await overview.refetch(); },
    onError: e => toast.error(e.message),
  });
  const people = overview.data?.candidates ?? [];
  const presidentPreview = presidentPreviewId ? people.find(person=>person.id===presidentPreviewId) : null;
  const presidentSpies = presidentPreviewId ? drafts.filter(draft=>draft.isSpy&&draft.contactCandidateId===presidentPreviewId).map(draft=>({draft,person:people.find(person=>person.id===draft.candidateId)})).filter(item=>item.person) : [];
  const filtered = useMemo(() => people.filter(p => `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(search.toLowerCase())), [people, search]);
  const update = (id: number, patch: Partial<Draft>) => setDrafts(current => current.map(d => d.candidateId === id ? { ...d, ...patch } : d));
  if (isLoading) return <div className="p-20 text-center">جارٍ التحميل…</div>;
  if (!allowed) return <Navigate to="/admin" replace />;
  return <div className="min-h-screen bg-slate-50 p-4 md:p-8" lang="ar" dir="rtl">
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-[linear-gradient(125deg,#102f2b,#4A9B8E)] p-6 text-white shadow-xl md:p-8">
        <Link to="/admin" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-bold"><ArrowLeft className="h-4 w-4"/>لوحة الإدارة</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="font-bold text-emerald-100">إعدادات سرية</p><h1 className="mt-1 text-3xl font-black">اللعبة السياسية</h1><p className="mt-2 text-white/75">اختر كل جاسوس وبلده الحقيقي وبلد التغطية والدور المزيف والشخص الذي سيتواصل معه.</p></div><Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={mutation.isPending || !drafts.length} onClick={() => mutation.mutate({ assignments: drafts })}><Shield className="ml-2 h-4 w-4"/>{mutation.isPending ? "جارٍ النشر…" : "نشر الأدوار في الحسابات"}</Button></div>
      </header>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>المسار:</strong> حدد الجاسوس ثم أدخل المعلومات المطلوبة. الشخص المختار للتواصل سيظهر تلقائياً ضمن رئاسة الاستخبارات.</section>
      <div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400"/><Input className="bg-white pr-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="البحث عن مشارك…"/></div>
      <section className="grid gap-4">
        {filtered.map(person => { const d = drafts.find(x => x.candidateId === person.id); if (!d) return null; return <article key={person.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${d.isSpy ? "border-red-300" : d.isIntelligencePresident ? "border-violet-300" : ""}`}>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_auto_auto_1fr_1fr_1fr_1fr] lg:items-center">
            <div><p className="font-black text-slate-900">{person.firstName} {person.lastName}</p><p className="text-sm text-slate-500">{person.email}</p></div>
            <label className="flex cursor-pointer items-center gap-2 font-bold text-red-700"><input type="checkbox" checked={d.isSpy} onChange={e => {if(!e.target.checked)setContactSearch(current=>({...current,[person.id]:""}));update(person.id,{isSpy:e.target.checked, displayedRole:e.target.checked ? d.displayedRole : "", spyCountry:e.target.checked ? d.spyCountry : "", fakeCountry:e.target.checked ? d.fakeCountry : "", contactCandidateId:e.target.checked ? d.contactCandidateId : null});}}/><Shield className="h-4 w-4"/>جاسوس</label>
            <label className="flex cursor-pointer items-center gap-2 font-bold text-violet-700"><input type="checkbox" checked={testPresidentIds.has(person.id)} onChange={e=>setTestPresidentIds(current=>{const next=new Set(current);if(e.target.checked)next.add(person.id);else next.delete(person.id);return next;})}/><UserRound className="h-4 w-4"/>اختبار رئاسة الاستخبارات</label>
            <select disabled={!d.isSpy} className="h-10 rounded-md border bg-white px-3 text-sm disabled:opacity-50" value={d.displayedRole} onChange={e=>update(person.id,{displayedRole:e.target.value})}><option value="">الدور المزيف…</option>{roleOptions.map(role=><option key={role} value={role}>{role}</option>)}</select>
            <select disabled={!d.isSpy} className="h-10 rounded-md border bg-white px-3 text-sm disabled:opacity-50" value={d.spyCountry} onChange={e=>update(person.id,{spyCountry:e.target.value})}><option value="">البلد الحقيقي…</option>{countryOptions.map(country=><option key={country} value={country}>{country}</option>)}</select>
            <select disabled={!d.isSpy} className="h-10 rounded-md border bg-white px-3 text-sm disabled:opacity-50" value={d.fakeCountry} onChange={e=>update(person.id,{fakeCountry:e.target.value})}><option value="">بلد التغطية…</option>{countryOptions.filter(country=>country!==d.spyCountry).map(country=><option key={country} value={country}>{country}</option>)}</select>
            <div><Input disabled={!d.isSpy} list={`contacts-${person.id}`} value={contactSearch[person.id] ?? ""} onChange={e=>{const value=e.target.value;setContactSearch(current=>({...current,[person.id]:value}));const needle=value.trim().toLowerCase();const match=people.find(p=>p.id!==person.id&&(personLabel(p).toLowerCase()===needle||p.email.toLowerCase()===needle||p.phoneNumber?.toLowerCase()===needle));update(person.id,{contactCandidateId:match?.id??null});}} placeholder="اكتب الاسم أو البريد أو الهاتف…"/><datalist id={`contacts-${person.id}`}>{people.filter(p=>p.id!==person.id).map(p=><option key={p.id} value={personLabel(p)}/>)}</datalist></div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">{d.isSpy&&d.contactCandidateId?<Button variant="outline" className="border-violet-300 text-violet-800" onClick={()=>setPresidentPreviewId(d.contactCandidateId)}><Eye className="ml-2 h-4 w-4"/>اختبار ما يراه رئيس الاستخبارات</Button>:null}{(testPresidentIds.has(person.id)||d.isIntelligencePresident||drafts.some(spy=>spy.isSpy&&spy.contactCandidateId===person.id))?<Button variant="outline" className="border-violet-300 text-violet-800" onClick={()=>setPresidentPreviewId(person.id)}><Eye className="ml-2 h-4 w-4"/>معاينة كرئاسة الاستخبارات</Button>:null}<Button variant="outline" disabled={saveOne.isPending} onClick={() => saveOne.mutate({candidateId:d.candidateId,isSpy:d.isSpy,isIntelligencePresident:testPresidentIds.has(person.id),displayedRole:d.displayedRole,spyCountry:d.spyCountry,fakeCountry:d.fakeCountry,contactCandidateId:d.contactCandidateId})}>{saveOne.isPending && saveOne.variables?.candidateId === d.candidateId ? "جارٍ النشر…" : "نشر دور هذا المشارك فقط"}</Button></div>
        </article>; })}
      </section>
      {presidentPreview ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={()=>setPresidentPreviewId(null)}><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={event=>event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-violet-700">معاينة الحساب</p><h2 className="mt-1 flex items-center gap-2 text-2xl font-black"><UserRound className="h-6 w-6"/>رئاسة الاستخبارات</h2><p className="mt-2 text-slate-600">سيشاهد {presidentPreview.firstName} {presidentPreview.lastName} الجواسيس الآتين فقط.</p></div><Button size="icon" variant="ghost" onClick={()=>setPresidentPreviewId(null)}><X className="h-5 w-5"/></Button></div><div className="mt-6 space-y-3">{presidentSpies.map(({draft,person})=><article key={draft.candidateId} className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><p className="font-black">{person!.firstName} {person!.lastName}</p><p className="mt-2 text-sm text-slate-700">الدور المزيف: <strong>{draft.displayedRole||"غير محدد"}</strong><br/>البلد الحقيقي: <strong>{draft.spyCountry||"غير محدد"}</strong><br/>بلد التغطية: <strong>{draft.fakeCountry||"غير محدد"}</strong></p></article>)}</div></section></div>:null}
      {!overview.isLoading && !people.length ? <div className="rounded-2xl border bg-white p-10 text-center">لا يوجد مشاركون مؤكدون.</div> : null}
    </main>
  </div>;
}
