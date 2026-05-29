import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

type AccountType = "candidate" | "admin";

export default function ForgotPassword({ accountType }: { accountType: AccountType }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const isAdmin = accountType === "admin";
  const requestCandidateReset = trpc.candidateAuth.requestPasswordReset.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err.message || "Impossible d'envoyer le lien"),
  });
  const requestAdminReset = trpc.adminAuth.requestPasswordReset.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err.message || "Impossible d'envoyer le lien"),
  });
  const isPending = requestCandidateReset.isPending || requestAdminReset.isPending;

  function submit(event: FormEvent) {
    event.preventDefault();
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
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#4A9B8E]/10">
              <KeyRound className="h-8 w-8 text-[#4A9B8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublie</h1>
            <p className="mt-2 text-sm text-gray-500">
              {submitted
                ? "Si un compte existe avec cet email, un lien de reinitialisation a ete envoye."
                : "Entrez votre email pour recevoir un lien de reinitialisation."}
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#4A9B8E]/20 bg-[#4A9B8E]/5 p-4 text-sm text-gray-700">
                Le lien expire dans 1 heure. Verifiez aussi votre dossier spam.
              </div>
              <Link to={backPath} className="block">
                <Button className="h-11 w-full bg-[#4A9B8E] text-white hover:bg-[#3D7A6F]">
                  Retour a la connexion
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
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-[#4A9B8E] text-white hover:bg-[#3D7A6F]"
                disabled={isPending}
              >
                <Mail className="mr-2 h-4 w-4" />
                {isPending ? "Envoi..." : "Envoyer le lien"}
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
