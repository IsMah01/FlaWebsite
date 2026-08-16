import { useEffect, useState } from "react";
import { CheckCircle2, LockKeyhole, LogIn, QrCode } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoroccoDateTime } from "@/lib/morocco-time";
import { trpc } from "@/providers/trpc";

export default function AttendanceCheckIn() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [done, setDone] = useState<{
    status: "new" | "existing";
    awardedPoints: number;
    punctual: boolean;
  } | null>(null);
  const session = trpc.attendance.sessionInfo.useQuery(
    { token },
    { enabled: token.length === 48, retry: false },
  );
  const currentCandidate = trpc.candidateAuth.me.useQuery(undefined, {
    retry: false,
  });
  const markDone = (data: {
    alreadyCheckedIn: boolean;
    awardedPoints: number;
    punctual: boolean;
  }) =>
    setDone({
      status: data.alreadyCheckedIn ? "existing" : "new",
      awardedPoints: data.awardedPoints,
      punctual: data.punctual,
    });
  const checkIn = trpc.attendance.checkIn.useMutation({ onSuccess: markDone });
  const automaticCheckIn = trpc.attendance.checkInAuthenticated.useMutation({
    onSuccess: markDone,
  });

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(
      () => navigate("/espace-candidat-final", { replace: true }),
      1800,
    );
    return () => window.clearTimeout(timer);
  }, [done, navigate]);

  const checkingIdentity =
    currentCandidate.isLoading || automaticCheckIn.isPending;

  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-[linear-gradient(145deg,#edf8f5,#ffffff)] p-3 sm:p-4"
      lang="ar"
      dir="rtl"
    >
      <main className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl sm:rounded-3xl sm:p-7">
        {session.isLoading ? (
          <div className="py-16 text-center">جارٍ التحقق من الرمز…</div>
        ) : session.isError ? (
          <div className="text-center">
            <LockKeyhole className="mx-auto h-14 w-14 text-red-500" />
            <h1 className="mt-4 text-2xl font-black">رمز غير صالح</h1>
            <p className="mt-2 text-slate-500">{session.error.message}</p>
          </div>
        ) : done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-black">
              {done.status === "existing"
                ? "تم تسجيل حضوركم مسبقاً"
                : "تم تسجيل حضوركم بنجاح"}
            </h1>
            <p className="mt-3 text-slate-500">{session.data?.title}</p>
            {done.awardedPoints > 0 ? (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                <p className="text-3xl font-black text-amber-700">
                  +{done.awardedPoints} نقاط
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  {done.punctual
                    ? "+10 للوصول قبل بداية الحصة"
                    : "+5 للوصول خلال 10 دقائق من البداية"}
                </p>
              </div>
            ) : done.status === "new" ? (
              <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                <p className="text-xl font-black text-slate-700">0 نقطة</p>
                <p className="mt-1 text-sm text-slate-600">
                  تم تسجيل الحضور بعد مرور 10 دقائق من بداية الحصة.
                </p>
              </div>
            ) : null}
            <p className="mt-4 text-sm font-bold text-[#4A9B8E]">
              سيتم توجيهكم الآن إلى فضاء المشاركين…
            </p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <QrCode className="mx-auto h-12 w-12 text-[#4A9B8E]" />
              <h1 className="mt-4 text-2xl font-black">تسجيل الحضور</h1>
              <p className="mt-2 font-bold text-[#1f5148]">
                {session.data?.title}
              </p>
              {session.data?.delayMinutes ? (
                <div className="mt-2">
                  <p className="text-xs text-slate-400 line-through">
                    {session.data.timeLabel}
                  </p>
                  <p className="mt-1 font-black text-amber-700" dir="ltr">
                    {session.data.startsAt
                      ? formatMoroccoDateTime(session.data.startsAt)
                      : session.data.timeLabel}
                  </p>
                  <p className="mt-1 text-xs font-bold text-amber-600">
                    تأخير معتمد: {session.data.delayMinutes} دقيقة
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  {session.data?.timeLabel}
                </p>
              )}
            </div>
            {!session.data?.isOpen ? (
              <p className="mt-6 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-800">
                تم إغلاق تسجيل الحضور لهذه الحصة.
              </p>
            ) : !session.data.canCheckIn ? (
              <div className="mt-6 rounded-xl bg-sky-50 p-4 text-center font-bold text-sky-800">
                <p>رابط الحضور غير متاح بعد.</p>
                <p className="mt-1 text-sm font-normal">
                  سيفتح قبل بداية الحصة بـ20 دقيقة.
                </p>
              </div>
            ) : checkingIdentity ? (
              <div className="mt-7 rounded-xl bg-emerald-50 p-5 text-center font-bold text-emerald-800">
                جارٍ التحقق من حسابكم…
              </div>
            ) : currentCandidate.data && !automaticCheckIn.error ? (
              <div className="mt-7 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <p className="text-sm text-emerald-700">
                    أنتم على وشك تسجيل حضور
                  </p>
                  <p className="mt-2 text-xl font-black text-emerald-950">
                    {currentCandidate.data.firstName}{" "}
                    {currentCandidate.data.lastName}
                  </p>
                  <p className="mt-2 text-sm font-bold text-emerald-800">
                    {session.data.title}
                  </p>
                </div>
                <Button
                  className="h-12 w-full bg-[#4A9B8E] hover:bg-[#3D7A6F]"
                  onClick={() => automaticCheckIn.mutate({ token })}
                >
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                  نعم، تأكيد حضوري
                </Button>
              </div>
            ) : (
              <form
                className="mt-7 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  checkIn.mutate({
                    token,
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                  });
                }}
              >
                {automaticCheckIn.error ? (
                  <p className="rounded-xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-800">
                    تعذر استعمال الحساب المفتوح في هذا المتصفح. أدخلوا بيانات
                    الحساب الصحيح أدناه.
                  </p>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-600">
                    يرجى تسجيل الدخول لتأكيد حضوركم.
                  </p>
                )}
                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    className="mt-1 h-12 text-base"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    className="mt-1 h-12 text-base"
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                  />
                </div>
                {checkIn.error ? (
                  <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {checkIn.error.message}
                  </p>
                ) : null}
                <Button
                  className="h-12 w-full bg-[#4A9B8E] hover:bg-[#3D7A6F]"
                  disabled={checkIn.isPending}
                >
                  <LogIn className="ml-2 h-4 w-4" />
                  {checkIn.isPending ? "جارٍ التسجيل…" : "تأكيد حضوري"}
                </Button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
