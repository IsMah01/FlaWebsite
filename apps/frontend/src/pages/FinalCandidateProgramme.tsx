import { CalendarCheck2, CalendarDays, CheckCircle2, Download, ExternalLink, LockKeyhole, MapPin, Moon, ShieldCheck, Sparkles, Sun, Sunset, UserRound } from "lucide-react";
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
          <div><div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur"><Sparkles className="h-4 w-4 text-amber-300" />أكاديمية أطر الغد — الدورة 18</span><span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/15 px-4 py-2 text-sm font-bold text-emerald-50"><ShieldCheck className="h-4 w-4" />مشارك مؤكد نهائياً</span></div><p className="mt-7 text-sm font-bold text-amber-200">أهلاً وسهلاً بكم في فضائكم الخاص</p><h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">مرحباً {access.data?.firstName}،<br /><span className="text-[#f8ca68]">رحلتكم نحو الأثر تبدأ من هنا</span></h1><p className="mt-5 max-w-3xl text-base leading-8 text-white/80 sm:text-lg">يسعدنا أن تكونوا ضمن المشاركين في «دورة الأثر». ستجدون هنا برنامج الأيام العشرة، معلوماتكم الشخصية، والوثائق التي سترافقكم خلال هذه التجربة الاستثنائية.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/espace-candidat-final/profil"><Button className="h-11 bg-white px-5 font-bold text-[#173f39] shadow-lg hover:bg-white/90"><UserRound className="ml-2 h-4 w-4" />ملفي الشخصي</Button></Link><a href={programmeUrl} target="_blank" rel="noreferrer"><Button variant="outline" className="h-11 border-white/30 bg-white/10 px-5 font-bold text-white backdrop-blur hover:bg-white/20 hover:text-white"><ExternalLink className="ml-2 h-4 w-4" />البرنامج الأصلي</Button></a><a href={`${programmeUrl}?download=1`} download="programme-edition-18.pdf"><Button variant="outline" className="h-11 border-white/30 bg-transparent px-5 font-bold text-white hover:bg-white/10 hover:text-white"><Download className="ml-2 h-4 w-4" />تحميل PDF</Button></a></div></div>
          <div className="mx-auto w-full max-w-[280px]"><div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full border-4 border-white/80 bg-white shadow-2xl">{access.data?.profileImageUrl ? <img src={access.data.profileImageUrl} alt="الصورة الشخصية" className="h-full w-full object-cover" /> : <UserRound className="h-full w-full p-9 text-[#4A9B8E]/50" />}</div><div className="relative -mt-5 rounded-2xl border border-white/20 bg-white/10 p-5 pt-8 text-center backdrop-blur-xl"><p className="text-xl font-black">{access.data?.firstName} {access.data?.lastName}</p><p className="mt-1 truncate text-sm text-white/65" dir="ltr">{access.data?.email}</p><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-1.5 text-xs font-bold text-emerald-100"><CheckCircle2 className="h-4 w-4" />تم تأكيد المشاركة</div></div></div>
        </div>
      </header>

      <section className="relative z-10 -mt-1 grid gap-4 pt-6 sm:grid-cols-3">
        <div className="group rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><CalendarCheck2 className="h-5 w-5" /></div><p className="mt-4 text-sm font-bold text-slate-500">مدة الأكاديمية</p><p className="mt-1 text-xl font-black text-slate-900">10 أيام من التعلّم والأثر</p></div>
        <div className="group rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CalendarDays className="h-5 w-5" /></div><p className="mt-4 text-sm font-bold text-slate-500">موعد الانطلاق</p><p className="mt-1 text-xl font-black text-slate-900">ابتداءً من 14 غشت 2026</p></div>
        <div className="group rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><MapPin className="h-5 w-5" /></div><p className="mt-4 text-sm font-bold text-slate-500">المدينة</p><p className="mt-1 text-xl font-black text-slate-900">الرباط، المغرب</p></div>
      </section>
      <section className="mt-6 rounded-3xl border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="text-2xl font-black text-slate-900">برنامج أكاديمية أطر الغد — دورة الأثر</h2><p className="mt-1 text-sm leading-6 text-slate-500">اسحبوا الجدول أفقياً للاطلاع على جميع الفترات والأنشطة.</p></div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-2" dir="rtl">
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
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">{Object.values(periodStyle).map(({ label, Icon, className }) => <span key={label} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-bold ${className}`}><Icon className="h-3.5 w-3.5" />{label}</span>)}</div>
      </section>
    </>}
  </main></div>;
}
