import { useEffect, useState } from "react";
import { CalendarDays, Camera, Download, ExternalLink, LockKeyhole, Moon, Save, Sun, Sunset, UserRound } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const utils = trpc.useUtils();
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<{ mimeType: "image/jpeg" | "image/png"; data: string; preview: string } | null>(null);
  useEffect(() => { if (access.data) setDescription(access.data.profileDescription || ""); }, [access.data]);
  const updateProfile = trpc.candidateAuth.updateFinalCandidateProfile.useMutation({
    onSuccess: async () => { toast.success("تم حفظ الملف الشخصي بنجاح"); setImage(null); await utils.candidateAuth.finalProgrammeAccess.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  async function selectProfileImage(file?: File) {
    if (!file) return;
    if (!(["image/jpeg", "image/png"] as string[]).includes(file.type)) { toast.error("يرجى اختيار صورة JPG أو PNG"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("يجب ألا يتجاوز حجم الصورة 2 ميغابايت"); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    setImage({ mimeType: file.type as "image/jpeg" | "image/png", data: dataUrl.split(",")[1], preview: dataUrl });
  }
  return <div className="min-h-screen bg-[#F4F8F7]" lang="ar" dir="rtl"><Navbar /><main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6">
    {access.isLoading ? <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-[#4A9B8E] border-t-transparent" /></div> : access.isError ? <section className="mx-auto mt-12 max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm"><LockKeyhole className="mx-auto h-14 w-14 text-amber-600" /><h1 className="mt-5 text-2xl font-black text-slate-900">فضاء خاص بالمشاركين المؤكدين</h1><p className="mt-3 leading-8 text-slate-600">{access.error.data?.code === "UNAUTHORIZED" ? "يرجى تسجيل الدخول بالحساب الذي استعملتموه لتأكيد مشاركتكم النهائية." : access.error.message}</p>{access.error.data?.code === "UNAUTHORIZED" ? <Link to="/signin?redirect=/espace-candidat-final"><Button className="mt-6 bg-[#4A9B8E] hover:bg-[#3D7A6F]">تسجيل الدخول</Button></Link> : <Link to="/"><Button className="mt-6" variant="outline">العودة إلى الرئيسية</Button></Link>}</section> : <>
      <header className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#173f39,#4A9B8E)] p-6 text-white shadow-lg sm:p-9"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold"><CalendarDays className="h-4 w-4" />أكاديمية أطر الغد — دورة الأثر</div><h1 className="mt-5 text-3xl font-black sm:text-4xl">البرنامج الكامل للدورة الثامنة عشرة</h1><p className="mt-3 max-w-3xl leading-8 text-white/85">مرحباً {access.data?.firstName} {access.data?.lastName}. هذه الصفحة خاصة بالمشاركين المؤكدين نهائياً، وتضم التخطيط الكامل لجميع أيام الأكاديمية.</p></div><div className="flex flex-wrap gap-3"><a href={programmeUrl} target="_blank" rel="noreferrer"><Button className="bg-white text-[#173f39] hover:bg-white/90"><ExternalLink className="ml-2 h-4 w-4" />فتح البرنامج</Button></a><a href={`${programmeUrl}?download=1`} download="programme-edition-18.pdf"><Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Download className="ml-2 h-4 w-4" />تحميل PDF</Button></a></div></div></header>

      <section className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b bg-[linear-gradient(135deg,#f0faf7,#ffffff)] px-5 py-5 sm:px-7"><div className="flex items-center gap-3"><UserRound className="h-6 w-6 text-[#4A9B8E]" /><div><h2 className="text-2xl font-black text-slate-900">ملفي الشخصي</h2><p className="mt-1 text-sm text-slate-500">أضيفوا صورتكم ونبذة قصيرة للتعريف بأنفسكم.</p></div></div></div>
        <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[240px_1fr] lg:items-start">
          <div className="text-center"><div className="relative mx-auto h-44 w-44 overflow-hidden rounded-full border-4 border-white bg-[#EAF7F3] shadow-lg">{image?.preview || access.data?.profileImageUrl ? <img src={image?.preview || access.data?.profileImageUrl || ""} alt="الصورة الشخصية" className="h-full w-full object-cover" /> : <UserRound className="h-full w-full p-10 text-[#4A9B8E]/45" />}</div><label className="mx-auto mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#4A9B8E]/30 bg-white px-4 py-2 text-sm font-bold text-[#1f5148] transition hover:bg-[#EAF7F3]"><Camera className="h-4 w-4" />اختيار صورة<input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(event) => { void selectProfileImage(event.target.files?.[0]); event.target.value = ""; }} /></label><p className="mt-2 text-xs text-slate-400">JPG أو PNG · أقل من 2 MB</p></div>
          <div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">الاسم الكامل</p><p className="mt-1 text-lg font-black text-slate-900">{access.data?.firstName} {access.data?.lastName}</p><p className="mt-1 text-sm text-slate-500" dir="ltr">{access.data?.email}</p></div><label htmlFor="profile-description" className="mt-5 block text-sm font-bold text-slate-800">نبذة تعريفية</label><Textarea id="profile-description" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="عرّف بنفسك، تخصصك، اهتماماتك وطموحاتك…" className="mt-2 min-h-32 resize-y text-right leading-7" /><div className="mt-2 flex items-center justify-between text-xs text-slate-400"><span>{description.length} / 500</span><span>يمكنكم تعديل الملف في أي وقت</span></div><Button className="mt-4 bg-[#4A9B8E] hover:bg-[#3D7A6F]" disabled={updateProfile.isPending} onClick={() => updateProfile.mutate({ description, image: image ? { mimeType: image.mimeType, data: image.data } : undefined })}><Save className="ml-2 h-4 w-4" />{updateProfile.isPending ? "جارٍ الحفظ…" : "حفظ الملف الشخصي"}</Button></div>
        </div>
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
