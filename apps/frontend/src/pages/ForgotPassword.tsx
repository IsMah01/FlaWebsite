import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBlockedSeconds, useRateLimitBlock } from "@/hooks/useRateLimitBlock";
import { trpc } from "@/providers/trpc";

type AccountType = "candidate" | "admin";
type ResetRequestResult = {
  accountExists?: boolean;
  emailSent?: boolean;
};

export default function ForgotPassword({ accountType }: { accountType: AccountType }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [emailWasSent, setEmailWasSent] = useState(true);
  const isAdmin = accountType === "admin";
  const rateLimit = useRateLimitBlock();
  const requestCandidateReset = trpc.candidateAuth.requestPasswordReset.useMutation({
    onSuccess: (result: ResetRequestResult) => {
      rateLimit.clearBlock();
      if (!result.accountExists) {
        toast.error("Aucun compte n'existe avec cet email.");
        return;
      }
      setEmailWasSent(!!result.emailSent);
      setSubmitted(true);
    },
    onError: (err) => toast.error(rateLimit.blockFromError(err) || err.message || "Impossible d'envoyer le lien"),
  });
  const requestAdminReset = trpc.adminAuth.requestPasswordReset.useMutation({
    onSuccess: (result: ResetRequestResult) => {
      rateLimit.clearBlock();
      if (!result.accountExists) {
        toast.error("Aucun compte n'existe avec cet email.");
        return;
      }
      setEmailWasSent(!!result.emailSent);
      setSubmitted(true);
    },
    onError: (err) => toast.error(rateLimit.blockFromError(err) || err.message || "Impossible d'envoyer le lien"),
  });
  const isPending = requestCandidateReset.isPending || requestAdminReset.isPending;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (rateLimit.blockedSeconds > 0) return;

    const payload = { email: email.trim().toLowerCase() };
    if (isAdmin) {
      requestAdminReset.mutate(payload);
    } else {
      requestCandidateReset.mutate(payload);
    }
  }

  const backPath = isAdmin ? "/admin/login" : "/signin";

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      {!isAdmin ? <Navbar /> : null}
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div dir="ltr" lang="fr" className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm md:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#4A9B8E]/10">
              <KeyRound className="h-8 w-8 text-[#4A9B8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">هل نسيت كلمة المرور؟</h1>
            <p className="mt-2 text-sm text-gray-500">
              {submitted
                ? "Votre demande de réinitialisation a été traitée."
                : "Entrez votre email pour recevoir un lien de réinitialisation."}
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#4A9B8E]/20 bg-[#4A9B8E]/5 p-5 text-center">
                <Mail className="mx-auto mb-3 h-8 w-8 text-[#4A9B8E]" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {emailWasSent ? "Vérifiez votre email" : "Email non envoyé"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {emailWasSent
                    ? "Un lien de réinitialisation vient d'être envoyé. Il expire dans 1 heure. Vérifiez aussi votre dossier spam."
                    : "Le compte existe, mais l'email n'a pas pu être envoyé. Vérifiez la configuration SMTP puis réessayez."}
                </p>
              </div>
              <Link to={backPath} className="block">
                <Button className="h-11 w-full bg-[#4A9B8E] text-white hover:bg-[#3D7A6F]">
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  required
                  className="mt-1 text-left"
                  dir="ltr"
                />
              </div>

              {rateLimit.blockedSeconds > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm font-medium text-amber-800">
                  Trop de tentatives. Réessayez dans {formatBlockedSeconds(rateLimit.blockedSeconds)}.
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full bg-[#4A9B8E] text-white hover:bg-[#3D7A6F]"
                disabled={isPending || rateLimit.blockedSeconds > 0}
              >
                <Mail className="mr-2 h-4 w-4" />
                {rateLimit.blockedSeconds > 0
                  ? `Réessayer dans ${formatBlockedSeconds(rateLimit.blockedSeconds)}`
                  : isPending
                    ? "Envoi..."
                    : "Envoyer le lien"}
              </Button>
            </form>
          )}

          <Link to={backPath} className="mt-6 flex items-center justify-center text-sm font-medium text-[#4A9B8E] hover:text-[#3D7A6F]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </div>
      </div>
    </div>
  );
}
