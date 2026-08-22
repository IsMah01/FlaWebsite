import { Eye, LockKeyhole, ShieldAlert, UserRound } from "lucide-react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";
import { useState } from "react";

export default function PoliticalGameRevealPage() {
  const [params] = useSearchParams(); const token = params.get("token") ?? ""; const [opened,setOpened]=useState(false);
  const role = trpc.politicalGame.reveal.useQuery({ token }, { enabled: opened && token.length === 64, retry: false });
  return <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#245c54,#071713)] p-4" lang="ar" dir="rtl"><main className="w-full max-w-2xl rounded-3xl border border-white/15 bg-white p-6 text-center shadow-2xl sm:p-10">
    <LockKeyhole className="mx-auto h-14 w-14 text-[#4A9B8E]"/><h1 className="mt-4 text-3xl font-black">اللعبة السياسية</h1>
    {!opened ? <><p className="mt-4 leading-8 text-slate-600">أنت على وشك كشف دورك السري. تأكد أن لا أحد يرى شاشتك.</p><Button className="mt-7 h-12 bg-[#4A9B8E] px-8 text-lg" disabled={token.length!==64} onClick={()=>setOpened(true)}><Eye className="ml-2 h-5 w-5"/>كشف دوري</Button></> : role.isLoading ? <p className="mt-8">جارٍ كشف الدور…</p> : role.isError ? <p className="mt-8 rounded-xl bg-red-50 p-4 font-bold text-red-700">{role.error.message}</p> : role.data ? <div className="mt-7 space-y-5">
      <div className={`rounded-2xl p-6 ${role.data.isSpy ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}><ShieldAlert className="mx-auto h-10 w-10"/><p className="mt-3 text-2xl font-black">{role.data.isSpy ? "أنت Spy / Imposteur" : "أنت لست Spy"}</p>{role.data.isSpy && role.data.displayedRole ? <p className="mt-3">دورك المزيف: <strong>{role.data.displayedRole}</strong></p> : null}{role.data.isSpy && role.data.spyCountry ? <p className="mt-2">بلد المهمة الحقيقي: <strong>{role.data.spyCountry}</strong></p> : null}{role.data.isSpy && role.data.fakeCountry ? <p className="mt-2">بلد التغطية المزيف: <strong>{role.data.fakeCountry}</strong></p> : null}{role.data.isSpy && role.data.contact ? <p className="mt-2">تواصل مع: <strong>{role.data.contact.firstName} {role.data.contact.lastName}</strong><br/><a dir="ltr" href={`mailto:${role.data.contact.email}`} className="underline">{role.data.contact.email}</a>{role.data.contact.phoneNumber ? <><br/><a dir="ltr" href={`tel:${role.data.contact.phoneNumber}`} className="underline">{role.data.contact.phoneNumber}</a></>:null}</p> : null}</div>
      {role.data.isIntelligencePresident ? <section className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 text-right"><h2 className="flex items-center gap-2 text-xl font-black text-violet-950"><UserRound className="h-6 w-6"/>رئاسة الاستخبارات</h2><p className="mt-2 text-violet-800">هؤلاء هم الـ Spies التابعون لك:</p><div className="mt-4 space-y-3">{role.data.spies.map((spy,i)=><div key={i} className="rounded-xl bg-white p-3"><strong>{spy.firstName} {spy.lastName}</strong>{spy.displayedRole ? <span className="text-slate-500"> — الدور المزيف: {spy.displayedRole}</span>:null}<div className="mt-1 text-sm text-slate-600">البلد الحقيقي: <strong>{spy.spyCountry || "—"}</strong> · بلد التغطية: <strong>{spy.fakeCountry || "—"}</strong></div><a dir="ltr" href={`mailto:${spy.email}`} className="text-sm text-violet-700 underline">{spy.email}</a></div>)}</div></section> : null}
      <p className="text-sm font-bold text-amber-700">حافظ على سرية هذه المعلومات ولا تشارك الرابط.</p>
    </div> : null}
  </main></div>;
}
