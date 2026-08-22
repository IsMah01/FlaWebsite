import { ArrowRight, LockKeyhole, ShieldAlert, UserRound } from "lucide-react";
import { Link } from "react-router";
import Navbar from "@/components/Navbar";
import { trpc } from "@/providers/trpc";

export default function CandidatePoliticalGamePage() {
  const role = trpc.politicalGame.myAssignment.useQuery(undefined, { retry: false });
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,#245c54,#071713)] p-4" lang="ar" dir="rtl"><Navbar/><main className="mx-auto mt-20 w-full max-w-2xl rounded-3xl border border-white/15 bg-white p-6 text-center shadow-2xl sm:p-10">
    <Link to="/espace-candidat-final" className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700"><ArrowRight className="h-4 w-4"/>العودة</Link>
    <LockKeyhole className="mx-auto mt-6 h-14 w-14 text-[#4A9B8E]"/><h1 className="mt-4 text-3xl font-black">دوري في اللعبة السياسية</h1>
    {role.isLoading ? <p className="mt-8">جارٍ تحميل الدور…</p> : role.isError ? <p className="mt-8 rounded-xl bg-red-50 p-4 font-bold text-red-700">يرجى تسجيل الدخول بحساب المشارك المؤكد.</p> : !role.data ? <p className="mt-8 rounded-xl bg-amber-50 p-5 font-bold text-amber-800">لم يتم نشر دورك بعد.</p> : <div className="mt-7 space-y-5">
      <div className={`rounded-2xl p-6 ${role.data.isSpy ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}><ShieldAlert className="mx-auto h-10 w-10"/><p className="mt-3 text-2xl font-black">{role.data.isSpy ? "أنت Spy / Imposteur" : "أنت لست Spy"}</p>{role.data.isSpy ? <div className="mt-4 space-y-2"><p>الدور المزيف: <strong>{role.data.displayedRole}</strong></p><p>بلد المهمة الحقيقي: <strong>{role.data.spyCountry}</strong></p><p>بلد التغطية المزيف: <strong>{role.data.fakeCountry}</strong></p>{role.data.contact ? <p>تواصل مع: <strong>{role.data.contact.firstName} {role.data.contact.lastName}</strong><br/><a dir="ltr" href={`mailto:${role.data.contact.email}`} className="underline">{role.data.contact.email}</a></p>:null}</div>:null}</div>
      {role.data.isIntelligencePresident ? <section className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 text-right"><h2 className="flex items-center gap-2 text-xl font-black text-violet-950"><UserRound className="h-6 w-6"/>رئاسة الاستخبارات</h2><p className="mt-2 text-violet-800">الـ Spies الذين يجب عليهم التواصل معك:</p><div className="mt-4 space-y-3">{role.data.spies.map((spy,i)=><div key={i} className="rounded-xl bg-white p-3"><strong>{spy.firstName} {spy.lastName}</strong><div className="mt-1 text-sm text-slate-600">الدور المزيف: <strong>{spy.displayedRole}</strong><br/>البلد الحقيقي: <strong>{spy.spyCountry}</strong> · بلد التغطية: <strong>{spy.fakeCountry}</strong></div></div>)}</div></section>:null}
      <p className="text-sm font-bold text-amber-700">هذه المعلومات سرية ولا يجب مشاركتها.</p>
    </div>}
  </main></div>;
}
