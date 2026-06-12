import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBlockedSeconds, useRateLimitBlock } from "@/hooks/useRateLimitBlock";
import { trpc } from "@/providers/trpc";

export default function SignIn() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const rateLimit = useRateLimitBlock();

  const candidateLogout = trpc.candidateAuth.logout.useMutation();
  const loginMutation = trpc.candidateAuth.login.useMutation({
    onSuccess: async () => {
      rateLimit.clearBlock();
      await utils.candidateAuth.me.invalidate();
      await utils.auth.me.invalidate();
      toast.success("تم تسجيل الدخول بنجاح!");
      navigate("/");
    },
    onError: (err) => {
      toast.error(rateLimit.blockFromError(err) || err.message || "Erreur pendant la connexion");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimit.blockedSeconds > 0) return;

    void (async () => {
      try {
        await candidateLogout.mutateAsync();
      } catch {
        // Continue with candidate login even if there was no previous session.
      }

      utils.candidateAuth.me.setData(undefined, undefined);
      try {
        await loginMutation.mutateAsync({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });
      } catch {
        // Error toast is handled by the mutation onError callback.
      }
    })();
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Navbar />
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#4A9B8E]/10">
                <LogIn className="h-8 w-8 text-[#4A9B8E]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">تسجيل الدخول</h1>
              <p className="mt-2 text-sm text-gray-500">أدخل بياناتك للوصول إلى حسابك</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  className="mt-1 text-right"
                />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">كلمة المرور *</Label>
                  <Link to="/forgot-password" dir="ltr" className="text-sm font-medium text-[#4A9B8E] hover:text-[#3D7A6F]">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="******"
                  required
                  className="mt-1 pr-10 text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-[34px] text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {rateLimit.blockedSeconds > 0 ? (
                <div dir="ltr" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm font-medium text-amber-800">
                  Trop de tentatives. Réessayez dans {formatBlockedSeconds(rateLimit.blockedSeconds)}.
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full bg-[#4A9B8E] text-white hover:bg-[#3D7A6F]"
                disabled={loginMutation.isPending || candidateLogout.isPending || rateLimit.blockedSeconds > 0}
              >
                {rateLimit.blockedSeconds > 0 ? (
                  `Réessayer dans ${formatBlockedSeconds(rateLimit.blockedSeconds)}`
                ) : loginMutation.isPending || candidateLogout.isPending ? (
                  "جاري تسجيل الدخول..."
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    تسجيل الدخول
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              ليس لديك حساب؟{" "}
              <Link to="/signup" className="font-medium text-[#4A9B8E] hover:text-[#3D7A6F]">
                سجل الآن
              </Link>
            </p>

            <div className="mt-6 border-t border-gray-100 pt-6 text-center">
              <p className="text-xs text-gray-400">
                بتسجيل الدخول، فإنك توافق على شروط الاستخدام وسياسة الخصوصية
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
