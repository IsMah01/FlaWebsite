import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Home, ShieldCheck } from "lucide-react";
import { formatBlockedSeconds, useRateLimitBlock } from "@/hooks/useRateLimitBlock";

export default function AdminLogin() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const rateLimit = useRateLimitBlock();

  const candidateLogout = trpc.candidateAuth.logout.useMutation();
  const login = trpc.adminAuth.login.useMutation({
    onSuccess: async () => {
      rateLimit.clearBlock();
      utils.candidateAuth.me.setData(undefined, undefined);
      await utils.auth.me.invalidate();
      toast.success("تسجيل دخول الإدارة ناجح!");
      navigate("/admin");
    },
    onError: (err) => toast.error(rateLimit.blockFromError(err) || err.message || "Email ou mot de passe incorrect."),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (rateLimit.blockedSeconds > 0) return;

    void (async () => {
      try {
        await candidateLogout.mutateAsync();
      } catch {
        // Continue with admin login even if there was no candidate session to clear.
      }

      utils.candidateAuth.me.setData(undefined, undefined);
      try {
        await login.mutateAsync({ email, password });
      } catch {
        // Error toast is handled by the mutation onError callback.
      }
    })();
  }

  return (
    <div
    dir="rtl"
    lang="ar"
    className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border space-y-5"
      >
        <div className="text-center space-y-2">
          <ShieldCheck className="mx-auto h-12 w-12 text-[#4A9B8E]" />
          <h1 className="text-2xl font-bold">تسجيل دخول الإدارة</h1>
          <p className="text-sm text-slate-500">الوصول محظور للإدارة فقط.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">البريد الإلكتروني</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">كلمة المرور</label>
            <Link to="/admin/forgot-password" dir="ltr" className="text-sm font-medium text-[#4A9B8E] hover:text-[#3D7A6F]">
              Mot de passe oublié ?
            </Link>
          </div>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            dir="ltr"
          />
        </div>

        {rateLimit.blockedSeconds > 0 ? (
          <div dir="ltr" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm font-medium text-amber-800">
            Trop de tentatives. Réessayez dans {formatBlockedSeconds(rateLimit.blockedSeconds)}.
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={login.isPending || candidateLogout.isPending || rateLimit.blockedSeconds > 0}>
          {rateLimit.blockedSeconds > 0
            ? `Réessayer dans ${formatBlockedSeconds(rateLimit.blockedSeconds)}`
            : login.isPending || candidateLogout.isPending
              ? "جاري الاتصال..."
              : "تسجيل الدخول"}
        </Button>

        <Link to="/" className="block">
          <Button type="button" variant="outline" className="w-full">
            <Home className="ml-2 h-4 w-4" /> Retour a la page principale
          </Button>
        </Link>
      </form>
    </div>
  );
}
