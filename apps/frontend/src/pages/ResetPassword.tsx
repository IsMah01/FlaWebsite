import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

type AccountType = "candidate" | "admin";

export default function ResetPassword({ accountType }: { accountType: AccountType }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const isAdmin = accountType === "admin";
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const successPath = isAdmin ? "/admin/login" : "/signin";

  const resetCandidatePassword = trpc.candidateAuth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Mot de passe mis à jour");
      navigate(successPath);
    },
    onError: (err) => toast.error(err.message || "Lien invalide ou expiré"),
  });
  const resetAdminPassword = trpc.adminAuth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Mot de passe mis à jour");
      navigate(successPath);
    },
    onError: (err) => toast.error(err.message || "Lien invalide ou expiré"),
  });
  const isPending = resetCandidatePassword.isPending || resetAdminPassword.isPending;

  function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      token,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };
    if (isAdmin) {
      resetAdminPassword.mutate(payload);
    } else {
      resetCandidatePassword.mutate(payload);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      {!isAdmin ? <Navbar /> : null}
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div dir="ltr" lang="fr" className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm md:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#4A9B8E]/10">
              <KeyRound className="h-8 w-8 text-[#4A9B8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
            <p className="mt-2 text-sm text-gray-500">Choisissez un mot de passe sécurisé.</p>
          </div>

          {!token ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Le lien de réinitialisation est incomplet.
              </div>
              <Link to={isAdmin ? "/admin/forgot-password" : "/forgot-password"} className="block">
                <Button className="h-11 w-full bg-[#4A9B8E] text-white hover:bg-[#3D7A6F]">
                  Demander un nouveau lien
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="relative">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  required
                  minLength={isAdmin ? 8 : 6}
                  className="mt-1 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                  required
                  minLength={isAdmin ? 8 : 6}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-[#4A9B8E] text-white hover:bg-[#3D7A6F]"
                disabled={isPending}
              >
                {isPending ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
