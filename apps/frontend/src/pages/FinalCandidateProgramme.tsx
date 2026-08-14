import { CalendarDays, Download, ExternalLink, LockKeyhole } from "lucide-react";
import { Link } from "react-router";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";

const programmeUrl = "/api/final-candidate/programme";

export default function FinalCandidateProgramme() {
  const access = trpc.candidateAuth.finalProgrammeAccess.useQuery(undefined, { retry: false });
  return <div className="min-h-screen bg-[#F4F8F7]" lang="ar" dir="rtl"><Navbar /><main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6">
    {access.isLoading ? <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-[#4A9B8E] border-t-transparent" /></div> : access.isError ? <section className="mx-auto mt-12 max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm"><LockKeyhole className="mx-auto h-14 w-14 text-amber-600" /><h1 className="mt-5 text-2xl font-black text-slate-900">فضاء خاص بالمشاركين المؤكدين</h1><p className="mt-3 leading-8 text-slate-600">{access.error.data?.code === "UNAUTHORIZED" ? "يرجى تسجيل الدخول بالحساب الذي استعملتموه لتأكيد مشاركتكم النهائية." : access.error.message}</p>{access.error.data?.code === "UNAUTHORIZED" ? <Link to="/signin?redirect=/espace-candidat-final"><Button className="mt-6 bg-[#4A9B8E] hover:bg-[#3D7A6F]">تسجيل الدخول</Button></Link> : <Link to="/"><Button className="mt-6" variant="outline">العودة إلى الرئيسية</Button></Link>}</section> : <>
      <header className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#173f39,#4A9B8E)] p-6 text-white shadow-lg sm:p-9"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold"><CalendarDays className="h-4 w-4" />أكاديمية أطر الغد — دورة الأثر</div><h1 className="mt-5 text-3xl font-black sm:text-4xl">البرنامج الكامل للدورة الثامنة عشرة</h1><p className="mt-3 max-w-3xl leading-8 text-white/85">مرحباً {access.data?.firstName} {access.data?.lastName}. هذه الصفحة خاصة بالمشاركين المؤكدين نهائياً، وتضم التخطيط الكامل لجميع أيام الأكاديمية.</p></div><div className="flex flex-wrap gap-3"><a href={programmeUrl} target="_blank" rel="noreferrer"><Button className="bg-white text-[#173f39] hover:bg-white/90"><ExternalLink className="ml-2 h-4 w-4" />فتح البرنامج</Button></a><a href={`${programmeUrl}?download=1`} download="programme-edition-18.pdf"><Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Download className="ml-2 h-4 w-4" />تحميل PDF</Button></a></div></div></header>
      <section className="mt-6 overflow-hidden rounded-3xl border bg-white p-2 shadow-sm sm:p-4"><iframe src={programmeUrl} title="البرنامج الكامل للدورة الثامنة عشرة" className="h-[75vh] min-h-[620px] w-full rounded-2xl border bg-slate-100" /><p className="p-3 text-center text-sm leading-6 text-slate-500">إذا لم يظهر البرنامج داخل الصفحة على هاتفكم، استعملوا زر «فتح البرنامج» أو «تحميل PDF».</p></section>
    </>}
  </main></div>;
}
