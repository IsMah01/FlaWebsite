import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { trpc } from "../providers/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function ActivateCandidate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [completed, setCompleted] = useState(false);
  const invitation = trpc.candidateAuth.candidateInvitation.useQuery(
    { token },
    { enabled: token.length >= 32, retry: false },
  );
  const activate = trpc.candidateAuth.activateCandidateInvitation.useMutation({
    onSuccess: () => setCompleted(true),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) return;
    activate.mutate({ token, password, confirmPassword });
  }

  if (!token) {
    return <ActivationMessage title="رابط غير صالح" body="رابط التفعيل غير مكتمل. يرجى استعمال الرابط الموجود في رسالة الدعوة." />;
  }
  if (invitation.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-[#4A9B8E]" /></div>;
  }
  if (invitation.error) {
    return <ActivationMessage title="تعذر تفعيل الحساب" body={invitation.error.message} />;
  }
  if (completed) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <section className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">تم تفعيل حسابكم بنجاح</h1>
          <p className="mt-3 leading-8 text-slate-600">أصبحتم الآن ضمن المرشحين المقبولين. سجلوا الدخول ثم توجهوا إلى فضاء المقابلة.</p>
          <Button className="mt-6 w-full bg-[#4A9B8E] hover:bg-[#3D7A6F]" onClick={() => navigate(`/signin?redirect=${encodeURIComponent("/interview")}`)}>
            تسجيل الدخول واختيار موعد المقابلة
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-7 shadow-sm sm:p-9">
        <div className="text-center">
          <LockKeyhole className="mx-auto h-12 w-12 text-[#4A9B8E]" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">تفعيل حساب المرشح</h1>
          <p className="mt-3 leading-7 text-slate-600">
            مرحباً {invitation.data?.firstName} {invitation.data?.lastName}، اختاروا كلمة مرور لتأكيد قبولكم.
          </p>
          <p dir="ltr" className="mt-2 text-sm text-slate-500">{invitation.data?.email}</p>
        </div>
        <form className="mt-7 space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} pattern="(?=.*[A-Z]).{8,}" required className="pl-11" autoComplete="new-password" />
              <button type="button" className="absolute left-3 top-2.5 text-slate-500" onClick={() => setShowPassword((value) => !value)} aria-label="إظهار كلمة المرور">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">8 أحرف على الأقل، مع حرف لاتيني كبير واحد على الأقل.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
            <Input id="confirm-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" />
            {confirmPassword && password !== confirmPassword ? <p className="text-sm text-red-600">كلمتا المرور غير متطابقتين.</p> : null}
          </div>
          {activate.error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{activate.error.message}</p> : null}
          <Button className="w-full bg-[#4A9B8E] hover:bg-[#3D7A6F]" disabled={activate.isPending || password !== confirmPassword}>
            {activate.isPending ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري التفعيل...</> : "تفعيل الحساب وتأكيد القبول"}
          </Button>
        </form>
      </section>
    </main>
  );
}

function ActivationMessage({ title, body }: { title: string; body: string }) {
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-4 leading-7 text-slate-600">{body}</p>
        <Link className="mt-6 inline-block font-medium text-[#4A9B8E]" to="/">العودة إلى الصفحة الرئيسية</Link>
      </section>
    </main>
  );
}
