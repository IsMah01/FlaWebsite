import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, Search, UserPlus } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

type Step = "email" | "existing" | "new" | "pending-email" | "success";

export default function FinalCandidateConfirmation() {
  const [step, setStep] = useState<Step>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", phoneNumber: "", password: "", confirmPassword: "" });
  const email = form.email.trim().toLowerCase();
  const lookup = trpc.candidateAuth.finalConfirmationAccount.useMutation({
    onSuccess: (data) => setStep(data.accountExists ? "existing" : "new"),
    onError: (error) => toast.error(error.message),
  });
  const confirmExisting = trpc.candidateAuth.confirmExistingFinalCandidate.useMutation({
    onSuccess: (data) => {
      setStep(data.needsEmailConfirmation ? "pending-email" : "success");
      if (data.needsEmailConfirmation && !data.emailSent) toast.warning("L’e-mail n’a pas pu être envoyé. Contactez l’administration.");
    },
    onError: (error) => toast.error(error.message),
  });
  const register = trpc.candidateAuth.registerFinalCandidate.useMutation({
    onSuccess: (data) => {
      setStep("pending-email");
      data.emailSent ? toast.success("E-mail de confirmation envoyé.") : toast.warning("Compte créé, mais l’e-mail n’a pas pu être envoyé. Contactez l’administration.");
    },
    onError: (error) => toast.error(error.message),
  });

  const busy = lookup.isPending || confirmExisting.isPending || register.isPending;

  return <div className="min-h-screen bg-[#F8FAF9]" lang="fr" dir="ltr">
    <Navbar />
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 pb-12 pt-24">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-sm md:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"><CheckCircle2 className="h-8 w-8 text-emerald-700" /></div>
          <h1 className="text-2xl font-black text-slate-900">Confirmation définitive</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Confirmez votre participation à l’Académie des Cadres de Demain.</p>
        </div>

        {step === "email" ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); lookup.mutate({ email }); }}>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><div className="flex items-center gap-2 font-bold"><Search className="h-4 w-4" />Recherchez votre adresse e-mail</div><p className="mt-1">Saisissez l’adresse utilisée sur le site. Nous vérifierons automatiquement si vous avez déjà un compte.</p></div>
          <div><Label htmlFor="final-email">Adresse e-mail</Label><Input id="final-email" type="email" required autoFocus value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="vous@exemple.com" className="mt-1" /></div>
          <Button className="h-11 w-full bg-[#4A9B8E] hover:bg-[#3D7A6F]" disabled={!email || busy}>{lookup.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recherche de votre adresse…</> : "Rechercher mon adresse"}</Button>
        </form> : null}

        {step === "existing" ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); confirmExisting.mutate({ email, password: form.password }); }}>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4" />Compte trouvé</div><p className="mt-1">Votre adresse existe déjà. Saisissez votre mot de passe pour confirmer définitivement votre participation.</p></div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{email}</strong><button type="button" className="ml-2 text-[#4A9B8E] underline" onClick={() => setStep("email")}>Modifier</button></div>
          <div className="relative"><Label htmlFor="existing-password">Mot de passe</Label><Input id="existing-password" type={showPassword ? "text" : "password"} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 pr-10" /><button type="button" aria-label="Afficher le mot de passe" className="absolute right-3 top-9 text-slate-400" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
          <Button className="h-11 w-full bg-emerald-700 hover:bg-emerald-800" disabled={busy}>{confirmExisting.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirmation en cours…</> : "Confirmer définitivement ma participation"}</Button>
          <Link className="block text-center text-sm text-[#4A9B8E] underline" to="/forgot-password">Mot de passe oublié ?</Link>
        </form> : null}

        {step === "new" ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); register.mutate({ ...form, email }); }}>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><div className="flex items-center gap-2 font-bold"><UserPlus className="h-4 w-4" />Aucun compte trouvé</div><p className="mt-1">Complétez les informations suivantes pour créer votre compte. Vous devrez ensuite confirmer votre adresse par e-mail.</p></div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{email}</strong><button type="button" className="ml-2 text-[#4A9B8E] underline" onClick={() => setStep("email")}>Modifier</button></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="first-name">Prénom</Label><Input id="first-name" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="mt-1" /></div><div><Label htmlFor="last-name">Nom</Label><Input id="last-name" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="mt-1" /></div></div>
          <div><Label htmlFor="phone">Téléphone</Label><Input id="phone" required value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} placeholder="+212..." className="mt-1" /></div>
          <div><Label htmlFor="new-password">Mot de passe</Label><Input id="new-password" type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1" /><p className="mt-1 text-xs text-slate-500">8 caractères minimum, dont une lettre majuscule.</p></div>
          <div><Label htmlFor="confirm-password">Confirmer le mot de passe</Label><Input id="confirm-password" type="password" required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} className="mt-1" /></div>
          {form.confirmPassword && form.password !== form.confirmPassword ? <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">Les deux mots de passe ne correspondent pas.</p> : null}
          <Button className="h-11 w-full bg-emerald-700 hover:bg-emerald-800" disabled={busy || form.password !== form.confirmPassword}>{register.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création du compte…</> : "Créer mon compte et recevoir l’e-mail"}</Button>
        </form> : null}

        {step === "pending-email" ? <div className="text-center"><Mail className="mx-auto h-12 w-12 text-[#4A9B8E]" /><h2 className="mt-4 text-xl font-bold">Confirmez votre adresse e-mail</h2><p className="mt-2 leading-6 text-slate-600">Nous avons envoyé un lien à <strong>{email}</strong>. Ouvrez cet e-mail et cliquez sur le bouton de confirmation.</p><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900"><strong>Vous ne trouvez pas l’e-mail ?</strong><br />Patientez quelques minutes, puis vérifiez les dossiers Spam, Courrier indésirable et Promotions.</div><p className="mt-4 text-sm font-semibold text-slate-700">Votre participation sera confirmée automatiquement après le clic sur le lien reçu.</p></div> : null}
        {step === "success" ? <div className="text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><h2 className="mt-4 text-xl font-bold text-emerald-900">Votre participation est confirmée définitivement</h2><p className="mt-2 leading-6 text-slate-600">Votre adresse <strong>{email}</strong> figure maintenant dans la liste finale des candidats confirmés. Aucune autre action n’est nécessaire.</p></div> : null}
      </section>
    </main>
  </div>;
}
