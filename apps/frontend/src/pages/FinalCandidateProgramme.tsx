import { AlertTriangle, Award, Check, CheckCircle2, Download, ExternalLink, ListChecks, LockKeyhole, Moon, Sparkles, Sun, Sunset, UserRound } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";

const programmeUrl = "/api/final-candidate/programme";
export const PROGRAMME_EDITION_NUMBER = 18;
export const PROGRAMME_START_DATE = "2026-08-14";
export const PROGRAMME_TIMEZONE_OFFSET = "+01:00";

export type ProgrammeEvent = { time: string; title: string; detail?: string; period: "morning" | "afternoon" | "evening" | "night" };
export type ProgrammeDay = { day: string; events: ProgrammeEvent[] };

export const programmeDays: ProgrammeDay[] = [
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

const scheduleSlots = [
  { time: "08:00", end: "09:00", label: "وجبة الفطور" },
  { time: "09:00", end: "10:30" },
  { time: "11:00", end: "13:00" },
  { time: "13:00", end: "14:30", label: "صلاة الظهر ووجبة الغذاء" },
  { time: "14:30", end: "16:00" },
  { time: "16:00", end: "17:30" },
  { time: "17:30", end: "18:30", label: "صلاة العصر واللمجة" },
  { time: "18:30", end: "20:00" },
  { time: "20:00", end: "21:00", label: "صلاة المغرب ووجبة العشاء" },
  { time: "21:00", end: "23:00" },
];

const eventGrid: Record<string, { start: number; span: number }> = {
  "09:00 — 10:30": { start: 2, span: 1 }, "09:00 — 13:00": { start: 2, span: 2 },
  "11:00 — 13:00": { start: 3, span: 1 }, "14:30 — 16:00": { start: 5, span: 1 },
  "14:30 — 17:30": { start: 5, span: 2 }, "14:30 — 18:30": { start: 5, span: 3 },
  "16:00 — 17:30": { start: 6, span: 1 }, "18:30 — 20:00": { start: 8, span: 1 },
  "18:30 — 23:00": { start: 8, span: 3 }, "21:00 — 23:00": { start: 10, span: 1 },
};

const scheduleColumns = "110px 76px 180px 230px 82px 180px 180px 82px 190px 82px 180px";

export default function FinalCandidateProgramme() {
  const access = trpc.candidateAuth.finalProgrammeAccess.useQuery(undefined, { retry: false });
  return <div className="min-h-screen bg-[#F4F8F7]" lang="ar" dir="rtl"><Navbar /><main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6">
    {access.isLoading ? <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-[#4A9B8E] border-t-transparent" /></div> : access.isError ? <section className="mx-auto mt-12 max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm"><LockKeyhole className="mx-auto h-14 w-14 text-amber-600" /><h1 className="mt-5 text-2xl font-black text-slate-900">فضاء خاص بالمشاركين المؤكدين</h1><p className="mt-3 leading-8 text-slate-600">{access.error.data?.code === "UNAUTHORIZED" ? "يرجى تسجيل الدخول بالحساب الذي استعملتموه لتأكيد مشاركتكم النهائية." : access.error.message}</p>{access.error.data?.code === "UNAUTHORIZED" ? <Link to="/signin?redirect=/espace-candidat-final"><Button className="mt-6 bg-[#4A9B8E] hover:bg-[#3D7A6F]">تسجيل الدخول</Button></Link> : <Link to="/"><Button className="mt-6" variant="outline">العودة إلى الرئيسية</Button></Link>}</section> : <>
      <header className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(125deg,#102f2b_0%,#1f5b52_48%,#4A9B8E_100%)] text-white shadow-[0_24px_70px_-30px_rgba(23,63,57,0.75)]">
        <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[#f5b73e]/20 blur-3xl" /><div className="absolute -bottom-28 right-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" /><div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_280px] lg:items-center lg:p-12">
          <div><div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur"><Sparkles className="h-4 w-4 text-amber-300" />أكاديمية أطر الغد — الدورة 18</span></div><p className="mt-7 text-sm font-bold text-amber-200">أهلاً وسهلاً بكم في فضائكم الخاص</p><h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">مرحباً {access.data?.firstName}،<br /><span className="text-[#f8ca68]">رحلتكم نحو الأثر تبدأ من هنا</span></h1><p className="mt-5 max-w-3xl text-base leading-8 text-white/80 sm:text-lg">يسعدنا أن تكونوا ضمن المشاركين في «دورة الأثر». ستجدون هنا برنامج الأيام العشرة، معلوماتكم الشخصية، والوثائق التي سترافقكم خلال هذه التجربة الاستثنائية.</p><div className="mt-7 flex flex-col gap-3 [&>a]:w-full [&_button]:w-full sm:flex-row sm:flex-wrap sm:[&>a]:w-auto sm:[&_button]:w-auto"><Link to="/espace-candidat-final/points"><Button className="h-11 bg-amber-300 px-5 font-bold text-slate-950 shadow-lg hover:bg-amber-200"><Award className="ml-2 h-4 w-4" />نقاطي والترتيب</Button></Link><Link to="/espace-candidat-final/profil"><Button className="h-11 bg-white px-5 font-bold text-[#173f39] shadow-lg hover:bg-white/90"><UserRound className="ml-2 h-4 w-4" />ملفي الشخصي</Button></Link><a href={programmeUrl} target="_blank" rel="noreferrer"><Button variant="outline" className="h-11 border-white/30 bg-white/10 px-5 font-bold text-white backdrop-blur hover:bg-white/20 hover:text-white"><ExternalLink className="ml-2 h-4 w-4" />البرنامج الأصلي</Button></a><a href={`${programmeUrl}?download=1`} download="programme-edition-18.pdf"><Button variant="outline" className="h-11 border-white/30 bg-transparent px-5 font-bold text-white hover:bg-white/10 hover:text-white"><Download className="ml-2 h-4 w-4" />تحميل PDF</Button></a></div></div>
          <div className="mx-auto w-full max-w-[280px]"><div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full border-4 border-white/80 bg-white shadow-2xl">{access.data?.profileImageUrl ? <img src={access.data.profileImageUrl} alt="الصورة الشخصية" className="h-full w-full object-cover" /> : <UserRound className="h-full w-full p-9 text-[#4A9B8E]/50" />}</div><div className="relative -mt-5 rounded-2xl border border-white/20 bg-white/10 p-5 pt-8 text-center backdrop-blur-xl"><p className="text-xl font-black">{access.data?.firstName} {access.data?.lastName}</p><p className="mt-1 truncate text-sm text-white/65" dir="ltr">{access.data?.email}</p><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-1.5 text-xs font-bold text-emerald-100"><CheckCircle2 className="h-4 w-4" />تم تأكيد المشاركة</div></div></div>
        </div>
      </header>

      <DailyTasksCard />
      <DailyFormsCard accountEmail={access.data?.email ?? ""} />
      <section className="mt-6 rounded-3xl border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="text-xl font-black text-slate-900 sm:text-2xl">برنامج أكاديمية أطر الغد — دورة الأثر</h2><p className="mt-1 hidden text-sm leading-6 text-slate-500 md:block">اسحبوا الجدول أفقياً للاطلاع على جميع الفترات والأنشطة.</p><p className="mt-1 text-sm leading-6 text-slate-500 md:hidden">اضغطوا على اليوم لعرض برنامجه.</p></div>
        <div className="space-y-3 md:hidden">
          {programmeDays.map((programmeDay, index) => <details key={programmeDay.day} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white" open={index === 0}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 bg-slate-100 px-4 py-3"><div><span className="font-black text-slate-900">{programmeDay.day}</span><span className="mr-2 text-xs font-bold text-slate-500">اليوم {index + 1}</span></div><span className="text-xl text-[#4A9B8E] transition group-open:rotate-180">⌄</span></summary>
            <div className="space-y-2 p-3">{programmeDay.events.map((event) => { const style = periodStyle[event.period]; const Icon = style.Icon; return <article key={`${event.time}-${event.title}`} className={`rounded-xl border p-3 ${style.className}`}><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1 text-xs font-black"><Icon className="h-3.5 w-3.5"/>{style.label}</span><time className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-black" dir="ltr">{event.time}</time></div><h3 className="mt-2 font-black leading-6">{event.title}</h3>{event.detail ? <p className="mt-1 text-sm font-semibold leading-6 opacity-80">{event.detail}</p> : null}</article>; })}</div>
          </details>)}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-2 md:block" dir="rtl">
          <div className="min-w-[1690px] space-y-1.5">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: scheduleColumns }}>
              <div className="rounded-xl bg-[#173f39] p-3 text-center font-black text-white">اليوم</div>
              <div className="col-span-4 rounded-xl bg-[#F5B73E] p-3 text-center font-black text-slate-950">الفترة الصباحية</div>
              <div className="col-span-3 rounded-xl bg-[#F2A238] p-3 text-center font-black text-slate-950">الفترة الزوالية</div>
              <div className="col-span-2 rounded-xl bg-[#EE8A29] p-3 text-center font-black text-slate-950">الفترة المسائية</div>
              <div className="rounded-xl bg-[#ED741F] p-3 text-center font-black text-slate-950">الفترة الليلية</div>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: scheduleColumns }}><div className="rounded-lg bg-slate-300" />{scheduleSlots.map((slot) => <div key={slot.time} dir="ltr" className="rounded-lg bg-slate-300 px-2 py-2 text-center text-xs font-black text-slate-800"><div>{slot.time}</div><div>{slot.end}</div></div>)}</div>
            {programmeDays.map((programmeDay, index) => <div key={programmeDay.day} className="grid min-h-[142px] gap-1.5" style={{ gridTemplateColumns: scheduleColumns }}>
              <div style={{ gridRow: 1 }} className="flex flex-col items-center justify-center rounded-xl bg-slate-300 p-3 text-center"><span className="text-lg font-black text-slate-900">{programmeDay.day}</span><span className="mt-1 text-xs font-bold text-slate-500">{index + 1}</span></div>
              {[1, 4, 7, 9].map((slotIndex) => { const slot = scheduleSlots[slotIndex - 1]; return <div key={slotIndex} style={{ gridColumn: `${slotIndex + 1} / span 1`, gridRow: 1 }} className="flex items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 px-2 py-3 text-center text-xs font-bold leading-5 text-cyan-950 [writing-mode:vertical-rl]">{slot.label}</div>; })}
              {programmeDay.events.map((event) => { const grid = eventGrid[event.time]; const style = periodStyle[event.period]; if (!grid) return null; return <div key={`${event.time}-${event.title}`} style={{ gridColumn: `${grid.start + 1} / span ${grid.span}`, gridRow: 1 }} className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center shadow-sm ${style.className}`}><h4 className="font-black leading-6">{event.title}</h4>{event.detail ? <p className="mt-1 text-xs font-semibold leading-5 opacity-80">{event.detail}</p> : null}</div>; })}
            </div>)}
          </div>
        </div>
        <div className="mt-4 hidden flex-wrap justify-center gap-2 text-xs md:flex">{Object.values(periodStyle).map(({ label, Icon, className }) => <span key={label} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-bold ${className}`}><Icon className="h-3.5 w-3.5" />{label}</span>)}</div>
      </section>
    </>}
  </main></div>;
}

function DailyTasksCard() {
  const daily = trpc.candidateAuth.dailyTasks.useQuery(undefined, { retry: false, refetchInterval: 30000 });
  const utils = trpc.useUtils();
  const toggle = trpc.candidateAuth.setDailyTask.useMutation({ onSuccess: async (_, input) => { toast.success(input.completed ? "تم إنجاز المهمة وإضافة نقطة" : "تم إلغاء المهمة وسحب النقطة"); await Promise.all([utils.candidateAuth.dailyTasks.invalidate(), utils.attendance.candidateScoreDashboard.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const completed = new Set((daily.data?.completions ?? []).filter((item) => item.dayNumber === daily.data?.currentDay).map((item) => item.taskKey));
  return <section className="mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm sm:rounded-3xl"><div className="bg-[linear-gradient(120deg,#173f39,#4A9B8E)] p-5 text-white sm:p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-white/15 p-2.5"><ListChecks className="h-6 w-6"/></div><div><h2 className="text-xl font-black sm:text-2xl">مهام اليوم</h2><p className="mt-1 text-sm text-white/75">أنجزوا مهامكم اليومية واكسبوا نقطة عن كل مهمة.</p></div></div>{daily.data?.editionActive ? <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"><span>اليوم {daily.data.currentDay} من 10</span><span>{completed.size} / 5 نقاط</span></div> : null}</div><div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-5">{daily.isLoading ? <p className="col-span-full py-6 text-center text-slate-500">جارٍ تحميل المهام…</p> : !daily.data?.editionActive ? <p className="col-span-full rounded-xl bg-amber-50 p-5 text-center font-bold text-amber-800">المهام اليومية متاحة خلال أيام الأكاديمية فقط.</p> : daily.data.tasks.map((task) => { const checked = completed.has(task.key); const busy = toggle.isPending && toggle.variables?.taskKey === task.key; const unavailable = !task.available; return <button key={task.key} type="button" disabled={toggle.isPending || unavailable} onClick={() => toggle.mutate({ dayNumber: daily.data.currentDay, taskKey: task.key, completed: !checked })} className={`flex min-h-24 items-center gap-3 rounded-2xl border p-4 text-right transition sm:flex-col sm:justify-center sm:text-center ${unavailable ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70" : checked ? "border-emerald-300 bg-emerald-50 text-emerald-900 active:scale-[.98]" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40 active:scale-[.98]"}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${checked ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>{checked ? <Check className="h-6 w-6"/> : <span className="h-5 w-5 rounded-md border-2 border-current"/>}</span><span><span className="block font-black">{task.label}</span><span className={`mt-1 block text-xs ${checked ? "text-emerald-700" : "text-slate-400"}`}>{busy ? "جارٍ الحفظ…" : unavailable ? "متاحة من 05:15 إلى 06:45" : checked ? "+1 نقطة · تم الإنجاز" : "+1 نقطة"}</span></span></button>; })}</div></section>;
}

function DailyFormsCard({ accountEmail }: { accountEmail: string }) {
  const daily = trpc.candidateAuth.dailyTasks.useQuery(undefined, { retry: false, refetchInterval: 30000 });
  const submitted = new Set((daily.data?.formSubmissions ?? []).map((form) => form.formKey));
  const pendingForms = (daily.data?.dailyForms ?? []).filter((form) => !submitted.has(form.formKey));
  if (daily.isLoading || daily.isError || pendingForms.length === 0) return null;
  return <section className="mt-6 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
    <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><ListChecks className="h-6 w-6" /></div><div><h2 className="text-xl font-black text-slate-900 sm:text-2xl">استمارات الأيام</h2><p className="mt-1 text-sm leading-6 text-slate-500">يرجى تعبئة استمارة كل يوم، وستظهر الاستمارات الجديدة هنا حسب ترتيب الأيام.</p></div></div>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="font-black">تنبيه مهم قبل تعبئة الاستمارة</p><p className="mt-1 text-sm leading-7">يجب استعمال نفس البريد الإلكتروني المسجل في حسابكم على المنصة حتى يتم احتساب إرسالكم تلقائياً.</p>{accountEmail ? <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 text-left font-bold" dir="ltr">{accountEmail}</p> : null}</div></div>
    <div className="mt-5 space-y-3">{pendingForms.map((form) => <a key={form.formKey} href={form.formUrl} target="_blank" rel="noreferrer" className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-sky-50 active:scale-[.99]"><div><p className="text-xs font-bold text-sky-700">استمارة متاحة</p><h3 className="mt-1 font-black text-slate-900">{form.title}</h3><p className="mt-1 text-xs text-slate-500">5 نقاط خلال أول 24 ساعة، ثم 3 نقاط بعد ذلك.</p></div><span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white"><ExternalLink className="h-4 w-4" />تعبئة الاستمارة</span></a>)}</div>
  </section>;
}
