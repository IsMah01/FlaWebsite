import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Home, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = trpc.adminAuth.login.useMutation({
    onSuccess: () => {
      toast.success("تسجيل دخول الإدارة ناجح!");
      navigate("/admin");
    },
    onError: (err) => toast.error(err.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة."),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email, password });
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
          <label className="text-sm font-medium">كلمة المرور</label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            dir="ltr"
          />
        </div>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? "جاري الاتصال..." : "تسجيل الدخول"}
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
