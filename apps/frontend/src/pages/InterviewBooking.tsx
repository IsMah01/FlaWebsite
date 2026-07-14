import { CalendarCheck, Clock, ExternalLink, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useViewerSession } from "@/hooks/useViewerSession";
import { trpc } from "@/providers/trpc";

function formatInterviewDate(value: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function InterviewBooking() {
  const { viewer, isLoading, isAcceptedCandidate } = useViewerSession();
  const utils = trpc.useUtils();
  const overview = trpc.interview.candidateOverview.useQuery(undefined, {
    enabled: !!viewer && isAcceptedCandidate,
    retry: false,
  });
  const bookSlot = trpc.interview.bookSlot.useMutation({
    onSuccess: async () => {
      toast.success("تم تأكيد موعد المقابلة بنجاح");
      await utils.interview.candidateOverview.invalidate();
    },
    onError: (error) => toast.error(error.message || "تعذر حجز الموعد"),
  });

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
              <section className={`mt-8 rounded-2xl border p-6 shadow-sm ${booking.status === "active" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <h2 className="text-xl font-bold text-gray-900">
                  {booking.status === "active" ? "موعدكم المؤكد" : "تم إلغاء هذا الموعد من طرف الإدارة"}
                </h2>
                <p className="mt-3 font-semibold text-gray-800">{formatInterviewDate(booking.startTime)}</p>
                {booking.interviewerName ? (
                  <p className="mt-2 flex items-center gap-2 text-gray-600"><UserRound className="h-4 w-4" /> {booking.interviewerName}</p>
                ) : null}
                {booking.status === "active" ? (
                  <a href={booking.meetingUrl} target="_blank" rel="noreferrer">
                    <Button className="mt-5 bg-emerald-600 hover:bg-emerald-700">
                      الدخول إلى Google Meet <ExternalLink className="mr-2 h-4 w-4" />
                    </Button>
                  </a>
                ) : null}
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900">{booking?.status === "active" ? "تغيير الموعد" : "المواعيد المتاحة"}</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {availableSlots.map((slot) => {
                  const isCurrent = booking?.slotId === slot.id && booking.status === "active";
                  return (
                    <article key={slot.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <p className="flex items-center gap-2 font-bold text-gray-900">
                        <Clock className="h-5 w-5 text-[#4A9B8E]" /> {formatInterviewDate(slot.startTime)}
                      </p>
                      {slot.interviewerName ? <p className="mt-3 text-sm text-gray-500">المشرف: {slot.interviewerName}</p> : null}
                      <Button
                        className="mt-5 w-full bg-[#4A9B8E] hover:bg-[#3D7A6F]"
                        variant={isCurrent ? "outline" : "default"}
                        disabled={isCurrent || bookSlot.isPending}
                        onClick={() => {
                          if (window.confirm("هل تريد تأكيد هذا الموعد للمقابلة؟")) bookSlot.mutate({ slotId: slot.id });
                        }}
                      >
                        {isCurrent ? "الموعد الحالي" : "اختيار هذا الموعد"}
                      </Button>
                    </article>
                  );
                })}
              </div>
              {availableSlots.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed bg-white p-8 text-center text-gray-500">
                  لا توجد مواعيد متاحة حاليًا. يرجى المحاولة لاحقًا.
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
