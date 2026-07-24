import { useEffect, useState } from "react";
import { CalendarCheck, CalendarDays, CalendarPlus, Clock, ExternalLink, Loader2, ShieldCheck, UserRound, Video } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useViewerSession } from "@/hooks/useViewerSession";
import { trpc } from "@/providers/trpc";

const INTERVIEW_TIME_ZONE = "Africa/Casablanca";

function formatInterviewDate(value: Date | string) {
  return new Intl.DateTimeFormat("ar-MA", {
    timeZone: INTERVIEW_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function interviewDayKey(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: INTERVIEW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatInterviewDay(value: Date | string) {
  return new Intl.DateTimeFormat("ar-MA", {
    timeZone: INTERVIEW_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatInterviewTime(value: Date | string) {
  return new Intl.DateTimeFormat("ar-MA", {
    timeZone: INTERVIEW_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function interviewHour(value: Date | string) {
  const hour = new Intl.DateTimeFormat("en", {
    timeZone: INTERVIEW_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
  return Number(hour);
}

function formatCountdown(startTime: Date | string, now: number) {
  const milliseconds = new Date(startTime).getTime() - now;
  if (milliseconds <= 0) return "بدأ موعد المقابلة";
  const totalMinutes = Math.ceil(milliseconds / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `متبقي ${days} يوم و${hours} ساعة`;
  if (hours > 0) return `متبقي ${hours} ساعة و${minutes} دقيقة`;
  return `متبقي ${minutes} دقيقة`;
}

function downloadCalendarEvent(booking: { startTime: Date | string; endTime: Date | string; meetingUrl: string }) {
  const toIcsDate = (value: Date | string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Future Leaders Foundation//Interview//AR",
    "BEGIN:VEVENT",
    `UID:interview-${new Date(booking.startTime).getTime()}@futureleaders.ma`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(booking.startTime)}`,
    `DTEND:${toIcsDate(booking.endTime)}`,
    "SUMMARY:المقابلة الشفوية - Future Leaders Foundation",
    `DESCRIPTION:رابط Google Meet: ${booking.meetingUrl}`,
    `URL:${booking.meetingUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "future-leaders-interview.ics";
  link.click();
  URL.revokeObjectURL(url);
}

export default function InterviewBooking() {
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [activeDay, setActiveDay] = useState("");
  const [period, setPeriod] = useState<"all" | "morning" | "afternoon">("all");
  const [now, setNow] = useState(Date.now());
  const { viewer, isLoading, isAcceptedCandidate } = useViewerSession();
  const utils = trpc.useUtils();
  const overview = trpc.interview.candidateOverview.useQuery(undefined, {
    enabled: !!viewer && isAcceptedCandidate,
    retry: false,
  });
  const bookSlot = trpc.interview.bookSlot.useMutation({
    onSuccess: async (result) => {
      toast.success("تم تأكيد موعد المقابلة بنجاح");
      if (!result.calendarInviteSent) {
        toast.warning("تم حفظ الموعد، لكن تعذر إرسال دعوة Google Calendar. ستتواصل الإدارة معكم.");
      }
      await utils.interview.candidateOverview.invalidate();
      setSelectedSlot(null);
    },
    onError: (error) => toast.error(error.message || "تعذر حجز الموعد"),
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) return <div className="min-h-screen bg-[#F8FAF9]" />;

  if (!viewer || !isAcceptedCandidate) {
    return (
      <div className="min-h-screen bg-[#F8FAF9]" dir="rtl">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 pb-20 pt-32 text-center">
          <ShieldCheck className="mx-auto h-14 w-14 text-[#4A9B8E]" />
          <h1 className="mt-5 text-2xl font-bold text-gray-900">فضاء المقابلات الشفوية</h1>
          <p className="mt-3 leading-7 text-gray-600">هذه الصفحة متاحة فقط للمترشحين الذين تم قبول ملفاتهم.</p>
          <Link to={viewer ? "/" : "/signin"}>
            <Button className="mt-7 bg-[#4A9B8E] hover:bg-[#3D7A6F]">
              {viewer ? "العودة إلى الرئيسية" : "تسجيل الدخول"}
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const booking = overview.data?.booking;
  const availableSlots = overview.data?.availableSlots ?? [];
  const slotsByDay = availableSlots.reduce<Array<{ key: string; date: Date | string; slots: typeof availableSlots }>>(
    (groups, slot) => {
      const key = interviewDayKey(slot.startTime);
      const currentGroup = groups[groups.length - 1];
      if (currentGroup?.key === key) currentGroup.slots.push(slot);
      else groups.push({ key, date: slot.startTime, slots: [slot] });
      return groups;
    },
    [],
  );
  const selectedDayKey = slotsByDay.some((group) => group.key === activeDay) ? activeDay : (slotsByDay[0]?.key ?? "");
  const selectedDayGroup = slotsByDay.find((group) => group.key === selectedDayKey);
  const visibleSlots = (selectedDayGroup?.slots ?? []).filter((slot) => {
    const hour = interviewHour(slot.startTime);
    return period === "all" || (period === "morning" ? hour < 12 : hour >= 12);
  });
  const meetOpensAt = booking ? new Date(booking.startTime).getTime() - 15 * 60 * 1000 : 0;
  const meetClosesAt = booking ? new Date(booking.endTime).getTime() : 0;
  const canJoinMeet = !!booking && now >= meetOpensAt && now <= meetClosesAt;

  return (
    <div className="min-h-screen bg-[#F8FAF9]" dir="rtl">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,#1f5148_0%,#4A9B8E_100%)] p-7 text-white shadow-lg md:p-10">
          <CalendarCheck className="h-10 w-10" />
          <h1 className="mt-4 text-3xl font-bold">اختيار موعد المقابلة الشفوية</h1>
          <p className="mt-3 max-w-3xl leading-8 text-white/90">
            تهانينا على قبول ملفكم. اختاروا الموعد المناسب، ويمكنكم تغييره لاحقًا ما دام الموعد الجديد متاحًا.
          </p>
        </section>

        {overview.isLoading ? (
          <div className="mt-8 rounded-2xl border bg-white p-8 text-center text-gray-500">جاري تحميل المواعيد...</div>
        ) : overview.isError ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{overview.error.message}</div>
        ) : (
          <>
            {booking ? (
              <section className={`sticky top-20 z-10 mt-8 rounded-2xl border p-5 shadow-md backdrop-blur sm:p-6 ${booking.status === "scheduled" ? "border-emerald-200 bg-emerald-50/95" : "border-amber-200 bg-amber-50/95"}`} aria-label="ملخص موعد المقابلة">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <CalendarCheck className="h-6 w-6 text-emerald-600" />
                      <h2 className="text-xl font-bold text-gray-900">
                        {booking.status === "scheduled"
                          ? "موعدكم المؤكد"
                          : booking.status === "completed"
                            ? "تم إجراء المقابلة"
                            : booking.status === "absent"
                              ? "تم تسجيل الغياب عن المقابلة"
                              : "تم إلغاء هذا الموعد من طرف الإدارة"}
                      </h2>
                      {booking.status === "scheduled" ? <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white" aria-live="polite">{formatCountdown(booking.startTime, now)}</span> : null}
                    </div>
                    <p className="mt-3 font-semibold text-gray-800">{formatInterviewDate(booking.startTime)}</p>
                    <p className="mt-1 text-xs text-gray-500">بتوقيت المغرب</p>
                    {booking.interviewerName ? <p className="mt-2 flex items-center gap-2 text-gray-600"><UserRound className="h-4 w-4" /> {booking.interviewerName}</p> : null}
                  </div>
                  {booking.status === "scheduled" ? (
                    <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
                      <Button type="button" variant="outline" onClick={() => downloadCalendarEvent(booking)}>
                        <CalendarPlus className="ml-2 h-4 w-4" /> إضافة إلى التقويم
                      </Button>
                      {canJoinMeet ? (
                        <a href={booking.meetingUrl} target="_blank" rel="noreferrer">
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700">الدخول إلى Google Meet <ExternalLink className="mr-2 h-4 w-4" /></Button>
                        </a>
                      ) : (
                        <Button disabled className="bg-gray-300 text-gray-600"><Video className="ml-2 h-4 w-4" /> {now > meetClosesAt ? "انتهى وقت المقابلة" : "متاح قبل الموعد بـ15 دقيقة"}</Button>
                      )}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900">{booking?.status === "scheduled" ? "تغيير الموعد" : "المواعيد المتاحة"}</h2>
              <p className="mt-2 text-sm text-gray-500">جميع المواعيد معروضة بتوقيت المغرب</p>
              <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-sm leading-6 text-gray-600">يمكن حجز موعد واحد فقط، ويمكن تغييره ما دامت هناك مواعيد أخرى متاحة.</p>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="أيام المقابلات">
                  {slotsByDay.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      role="tab"
                      aria-selected={selectedDayKey === group.key}
                      onClick={() => { setActiveDay(group.key); setPeriod("all"); }}
                      className={`min-w-max rounded-xl px-4 py-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#4A9B8E] focus-visible:ring-offset-2 ${selectedDayKey === group.key ? "bg-[#4A9B8E] text-white shadow-sm" : "border border-gray-200 bg-white text-gray-700 hover:border-[#4A9B8E]/50"}`}
                    >
                      {formatInterviewDay(group.date)}
                      <span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${selectedDayKey === group.key ? "bg-white/20" : "bg-gray-100"}`}>{group.slots.length}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2" aria-label="تصفية المواعيد حسب الفترة">
                  {(["all", "morning", "afternoon"] as const).map((value) => (
                    <Button key={value} type="button" size="sm" variant={period === value ? "default" : "outline"} className={period === value ? "bg-[#4A9B8E] hover:bg-[#3D7A6F]" : ""} onClick={() => setPeriod(value)}>
                      {value === "all" ? "الكل" : value === "morning" ? "صباحًا" : "بعد الظهر"}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedDayGroup ? (
                <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" role="tabpanel">
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-[#4A9B8E]/[0.07] px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-[#4A9B8E]" /><h3 className="font-bold text-gray-900">{formatInterviewDay(selectedDayGroup.date)}</h3></div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#3D7A6F] shadow-sm">{visibleSlots.length} مواعيد</span>
                  </header>
                  {visibleSlots.length > 0 ? (
                    <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                      {visibleSlots.map((slot) => {
                        const isCurrent = booking?.slotId === slot.id && booking.status === "scheduled";
                        const isSubmitting = bookSlot.isPending && selectedSlot?.id === slot.id;
                        return (
                          <article
                            key={slot.id}
                            className={`rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-[#4A9B8E]/40 ${isCurrent ? "border-[#4A9B8E] bg-[#4A9B8E]/5 ring-1 ring-[#4A9B8E]/20" : "border-gray-200 hover:border-[#4A9B8E]/50 hover:shadow-sm"}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="flex items-center gap-2 text-lg font-bold text-gray-900">
                                <Clock className="h-5 w-5 text-[#4A9B8E]" />
                                {formatInterviewTime(slot.startTime)}
                              </p>
                              {isCurrent ? <span className="rounded-full bg-[#4A9B8E] px-2.5 py-1 text-[11px] font-semibold text-white">موعدك الحالي</span> : null}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              إلى {formatInterviewTime(slot.endTime)}
                            </p>
                            {slot.interviewerName ? <p className="mt-3 truncate text-sm text-gray-500">المشرف: {slot.interviewerName}</p> : null}
                            <Button
                              className="mt-4 w-full bg-[#4A9B8E] hover:bg-[#3D7A6F]"
                              variant={isCurrent ? "outline" : "default"}
                              disabled={isCurrent || isSubmitting}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {isSubmitting ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري التأكيد...</> : isCurrent ? "الموعد الحالي" : booking?.status === "scheduled" ? "تغيير إلى هذا الموعد" : "اختيار هذا الموعد"}
                            </Button>
                          </article>
                        );
                      })}
                    </div>
                  ) : <div className="p-8 text-center text-gray-500">لا توجد مواعيد في هذه الفترة. اختر فترة أخرى أو يومًا مختلفًا.</div>}
                </section>
              ) : null}
              {availableSlots.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed bg-white p-8 text-center text-gray-500">
                  {overview.data?.awaitingAssignment
                    ? "تم قبول ترشحكم. سيظهر جدول المواعيد فور تعيين مسؤول المقابلة الخاص بكم."
                    : "لا توجد مواعيد متاحة حاليًا. يرجى المحاولة لاحقًا."}
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>
      <div className="sr-only" aria-live="polite">{bookSlot.isPending ? "جاري تأكيد موعد المقابلة" : ""}</div>
      <AlertDialog open={!!selectedSlot} onOpenChange={(open) => { if (!open && !bookSlot.isPending) setSelectedSlot(null); }}>
        <AlertDialogContent dir="rtl" className="text-right sm:text-right">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>{booking?.status === "scheduled" ? "تأكيد تغيير الموعد" : "تأكيد موعد المقابلة"}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-right leading-6">
              {booking?.status === "scheduled" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3"><span className="text-xs text-gray-500">الموعد الحالي</span><p className="mt-1 font-semibold text-gray-800">{formatInterviewDate(booking.startTime)}</p></div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><span className="text-xs text-emerald-700">الموعد الجديد</span><p className="mt-1 font-semibold text-gray-800">{selectedSlot ? formatInterviewDate(selectedSlot.startTime) : ""}</p></div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-gray-800">{selectedSlot ? formatInterviewDate(selectedSlot.startTime) : ""}</div>
              )}
              <p>{booking?.status === "scheduled" ? "سيتم إلغاء دعوتك السابقة وإرسال دعوة Google Calendar جديدة." : "سيتم حجز هذا الموعد وإرسال دعوة Google Calendar إليك."}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row-reverse sm:justify-start">
            <Button
              type="button"
              className="bg-[#4A9B8E] hover:bg-[#3D7A6F]"
              disabled={!selectedSlot || bookSlot.isPending}
              onClick={() => selectedSlot && bookSlot.mutate({ slotId: selectedSlot.id })}
            >
              {bookSlot.isPending ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري التأكيد...</> : "تأكيد الموعد"}
            </Button>
            <AlertDialogCancel disabled={bookSlot.isPending}>{booking?.status === "scheduled" ? "الاحتفاظ بالموعد الحالي" : "العودة"}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </div>
  );
}
