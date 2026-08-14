import { CalendarDays, Clock3, Download, ExternalLink, LockKeyhole, Moon, Sun, Sunset } from "lucide-react";
import { Link } from "react-router";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";

const programmeUrl = "/api/final-candidate/programme";

type ProgrammeEvent = { time: string; title: string; detail?: string; period: "morning" | "afternoon" | "evening" | "night" };
type ProgrammeDay = { day: string; events: ProgrammeEvent[] };

const programmeDays: ProgrammeDay[] = [
  { day: "اليوم الأول", events: [
    { time: "09:00 — 13:00", title: "الالتحاق والتسجيل", period: "morning" },
    { time: "14:30 — 16:00", title: "رحلة الأكاديمية", period: "afternoon" },
    { time: "16:00 — 17:30", title: "التعارف وكسر الجليد", period: "afternoon" },
    { time: "18:30 — 23:00", title: "حفل الافتتاح", period: "evening" },
  ]},
  { day: "اليوم الثاني", events: [
    { time: "09:00 — 10:30", title: "الصباحية الأولى", detail: "﴿ فاستمسك بالذي أوحي إليك ﴾", period: "morning" },
    { time: "11:00 — 13:00", title: "حوار الأكاديمية الأول", detail: "الصحراء المغربية: السياق التاريخي والتحديات الراهنة", period: "morning" },
    { time: "14:30 — 16:00", title: "تكوين المشاريع", period: "afternoon" },
    { time: "16:00 — 17:30", title: "حزم المهارات", detail: "أدوات الذكاء الاصطناعي", period: "afternoon" },
    { time: "18:30 — 20:00", title: "ورشة تشبيك العلاقات", period: "evening" },
    { time: "21:00 — 23:00", title: "هؤلاء تميزوا", period: "night" },
  ]},
  { day: "اليوم الثالث", events: [
    { time: "09:00 — 10:30", title: "الصباحية الثانية", detail: "﴿ لقد كان لكم في رسول الله أسوة حسنة ﴾", period: "morning" },
    { time: "11:00 — 13:00", title: "حوار الأكاديمية الثاني", detail: "التمكين المعرفي والسياسي للشباب وأثره في تشكيل الوعي والتغيير المجتمعي", period: "morning" },
    { time: "14:30 — 16:00", title: "تكوين المناظرة", period: "afternoon" },
    { time: "16:00 — 17:30", title: "ورشة نقاش", detail: "الهجرة أم البقاء؟ بين تحقيق الطموح الشخصي وواجب خدمة الوطن والأمة", period: "afternoon" },
    { time: "18:30 — 20:00", title: "حزم المهارات", detail: "أدوات الذكاء الاصطناعي", period: "evening" },
    { time: "21:00 — 23:00", title: "برلمان الأكاديمية", detail: "الشباب وسؤال المشاركة السياسية", period: "night" },
  ]},
  { day: "اليوم الرابع", events: [
    { time: "09:00 — 10:30", title: "الصباحية الثالثة", detail: "﴿ ونهى النفس عن الهوى ﴾", period: "morning" },
    { time: "11:00 — 13:00", title: "حوار الأكاديمية الثالث", detail: "أزمة النظام المالي الحديث وأطروحة الاقتصاد الإسلامي كبديل بنيوي", period: "morning" },
    { time: "14:30 — 16:00", title: "تكوين المشاريع", detail: "هندسة المشاريع", period: "afternoon" },
    { time: "16:00 — 17:30", title: "المناظرة — الدور الأول", period: "afternoon" },
    { time: "18:30 — 20:00", title: "حديث الشباب", detail: "الفن والرسالة", period: "evening" },
    { time: "21:00 — 23:00", title: "هؤلاء تميزوا", period: "night" },
  ]},
  { day: "اليوم الخامس", events: [
    { time: "09:00 — 10:30", title: "الصباحية الرابعة", detail: "بين سجدة ونهوض", period: "morning" },
    { time: "11:00 — 13:00", title: "حوار الأكاديمية الرابع", detail: "موازين القوى الجديدة الجيوسياسية العالمية وموقع المغرب من تحولات القطبية", period: "morning" },
    { time: "14:30 — 16:00", title: "تكوين المشاريع", detail: "الدراسة المالية والتمويل الإسلامي", period: "afternoon" },
    { time: "16:00 — 17:30", title: "ورشة نقاش", detail: "الإنسان بين المصالح والمبادئ", period: "afternoon" },
    { time: "18:30 — 20:00", title: "التحضير للأمسية", period: "evening" },
    { time: "21:00 — 23:00", title: "الأمسية القرآنية", period: "night" },
  ]},
  { day: "اليوم السادس", events: [
    { time: "09:00 — 13:00", title: "الخرجة", period: "morning" },
    { time: "14:30 — 16:00", title: "استراحة", period: "afternoon" },
    { time: "16:00 — 17:30", title: "تكوين اللعبة السياسية", period: "afternoon" },
    { time: "18:30 — 20:00", title: "حزم المهارات", detail: "الوعي الأمني نحو تصفح رقمي آمن", period: "evening" },
    { time: "21:00 — 23:00", title: "برلمان الأكاديمية", detail: "منظمة التجديد الطلابي: الترافع والنضال الطلابي", period: "night" },
  ]},
  { day: "اليوم السابع", events: [
    { time: "09:00 — 10:30", title: "الصباحية الخامسة", detail: "﴿ لقد خلقنا الإنسان في كبد ﴾", period: "morning" },
    { time: "11:00 — 13:00", title: "حوار الأكاديمية الخامس", detail: "خطورة ومآلات وجود المشروع الصهيوني الغربي بين الأوطان العربية والإسلامية", period: "morning" },
    { time: "14:30 — 17:30", title: "اللعبة السياسية", period: "afternoon" },
    { time: "18:30 — 20:00", title: "حزمة المهارات", detail: "أدوات البحث العلمي", period: "evening" },
    { time: "21:00 — 23:00", title: "هؤلاء تميزوا", period: "night" },
  ]},
  { day: "اليوم الثامن", events: [
    { time: "09:00 — 10:30", title: "الصباحية السادسة", detail: "﴿ وبالوالدين إحساناً ﴾", period: "morning" },
    { time: "11:00 — 13:00", title: "حوار الأكاديمية السادس", detail: "الإصلاح في المغرب: سؤال الحصيلة والجاهزية", period: "morning" },
    { time: "14:30 — 16:00", title: "المناظرة — الدور الثاني", period: "afternoon" },
    { time: "16:00 — 17:30", title: "ورشة نقاش", detail: "المسؤوليات الأسرية والمسار الشخصي: أي نموذج في عالم اليوم؟", period: "afternoon" },
    { time: "18:30 — 20:00", title: "حديث الشباب", detail: "الصحة النفسية", period: "evening" },
    { time: "21:00 — 23:00", title: "هؤلاء تميزوا", period: "night" },
  ]},
  { day: "اليوم التاسع", events: [
    { time: "09:00 — 10:30", title: "الصباحية السابعة", detail: "﴿ إن خير من استأجرت القوي الأمين ﴾", period: "morning" },
    { time: "11:00 — 13:00", title: "حوار الأكاديمية السابع", detail: "نحو مشروع نهضوي إسلامي معاصر: إشكالية التعثر ومقومات الانبعاث", period: "morning" },
    { time: "14:30 — 16:00", title: "تكوين المشاريع", period: "afternoon" },
    { time: "16:00 — 17:30", title: "ورشة نقاش", detail: "الهوية الإسلامية في عالم متغير: كيف يواجه الشباب تحديات العولمة والقيم الوافدة؟", period: "afternoon" },
    { time: "18:30 — 20:00", title: "نهائي المناظرة", period: "evening" },
    { time: "21:00 — 23:00", title: "برلمان الأكاديمية", detail: "المرأة: موقف التيار الإسلامي بين التأصيل والتحديث", period: "night" },
  ]},
  { day: "اليوم العاشر", events: [
    { time: "09:00 — 10:30", title: "الصباحية الثامنة", detail: "﴿ فاصدع بما تؤمر ﴾ — الإصلاح", period: "morning" },
    { time: "11:00 — 13:00", title: "نهائي مسابقة المشاريع", period: "morning" },
    { time: "14:30 — 18:30", title: "التحضير للحفل الختامي", period: "afternoon" },
    { time: "18:30 — 23:00", title: "الحفل الختامي", period: "evening" },
  ]},
];

const periodStyle = {
  morning: { label: "الفترة الصباحية", Icon: Sun, className: "border-sky-200 bg-sky-50 text-sky-950", icon: "text-sky-600" },
  afternoon: { label: "الفترة الزوالية", Icon: Sun, className: "border-amber-200 bg-amber-50 text-amber-950", icon: "text-amber-600" },
  evening: { label: "الفترة المسائية", Icon: Sunset, className: "border-orange-200 bg-orange-50 text-orange-950", icon: "text-orange-600" },
  night: { label: "الفترة الليلية", Icon: Moon, className: "border-indigo-200 bg-indigo-50 text-indigo-950", icon: "text-indigo-600" },
};

export default function FinalCandidateProgramme() {
  const access = trpc.candidateAuth.finalProgrammeAccess.useQuery(undefined, { retry: false });
  return <div className="min-h-screen bg-[#F4F8F7]" lang="ar" dir="rtl"><Navbar /><main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6">
    {access.isLoading ? <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-[#4A9B8E] border-t-transparent" /></div> : access.isError ? <section className="mx-auto mt-12 max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm"><LockKeyhole className="mx-auto h-14 w-14 text-amber-600" /><h1 className="mt-5 text-2xl font-black text-slate-900">فضاء خاص بالمشاركين المؤكدين</h1><p className="mt-3 leading-8 text-slate-600">{access.error.data?.code === "UNAUTHORIZED" ? "يرجى تسجيل الدخول بالحساب الذي استعملتموه لتأكيد مشاركتكم النهائية." : access.error.message}</p>{access.error.data?.code === "UNAUTHORIZED" ? <Link to="/signin?redirect=/espace-candidat-final"><Button className="mt-6 bg-[#4A9B8E] hover:bg-[#3D7A6F]">تسجيل الدخول</Button></Link> : <Link to="/"><Button className="mt-6" variant="outline">العودة إلى الرئيسية</Button></Link>}</section> : <>
      <header className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#173f39,#4A9B8E)] p-6 text-white shadow-lg sm:p-9"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold"><CalendarDays className="h-4 w-4" />أكاديمية أطر الغد — دورة الأثر</div><h1 className="mt-5 text-3xl font-black sm:text-4xl">البرنامج الكامل للدورة الثامنة عشرة</h1><p className="mt-3 max-w-3xl leading-8 text-white/85">مرحباً {access.data?.firstName} {access.data?.lastName}. هذه الصفحة خاصة بالمشاركين المؤكدين نهائياً، وتضم التخطيط الكامل لجميع أيام الأكاديمية.</p></div><div className="flex flex-wrap gap-3"><a href={programmeUrl} target="_blank" rel="noreferrer"><Button className="bg-white text-[#173f39] hover:bg-white/90"><ExternalLink className="ml-2 h-4 w-4" />فتح البرنامج</Button></a><a href={`${programmeUrl}?download=1`} download="programme-edition-18.pdf"><Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Download className="ml-2 h-4 w-4" />تحميل PDF</Button></a></div></div></header>
      <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-black text-slate-900">تفاصيل البرنامج اليومي</h2><p className="mt-1 text-sm leading-6 text-slate-500">وجبة الفطور من 08:00 إلى 09:00، مع فترات الصلاة والوجبات حسب البرنامج التنظيمي.</p></div><div className="flex flex-wrap gap-2 text-xs">{Object.values(periodStyle).map(({ label, Icon, className }) => <span key={label} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-bold ${className}`}><Icon className="h-3.5 w-3.5" />{label}</span>)}</div></div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">{programmeDays.map((programmeDay, index) => <article key={programmeDay.day} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60"><header className="flex items-center justify-between bg-[#173f39] px-5 py-4 text-white"><h3 className="text-xl font-black">{programmeDay.day}</h3><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 font-black">{index + 1}</span></header><div className="space-y-3 p-4">{programmeDay.events.map((event) => { const style = periodStyle[event.period]; const PeriodIcon = style.Icon; return <div key={`${event.time}-${event.title}`} className={`rounded-xl border p-4 ${style.className}`}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><PeriodIcon className={`h-4 w-4 shrink-0 ${style.icon}`} /><h4 className="font-black leading-7">{event.title}</h4></div>{event.detail ? <p className="mt-1.5 pr-6 text-sm leading-7 opacity-80">{event.detail}</p> : null}</div><span dir="ltr" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-bold shadow-sm"><Clock3 className="h-3.5 w-3.5" />{event.time}</span></div></div>; })}</div></article>)}</div>
      </section>
    </>}
  </main></div>;
}
