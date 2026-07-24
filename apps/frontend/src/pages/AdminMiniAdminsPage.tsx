import { useState } from "react";
import {
  ArrowRight,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  UserCog,
  UserPlus,
} from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

type AdminDraft = { name: string; email: string; password: string };

export default function AdminMiniAdminsPage() {
  const { user, isLoading, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/admin/login",
  });
  const isSuperAdmin =
    user?.role === "admin" && user.adminRole === "super_admin";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [drafts, setDrafts] = useState<Record<number, AdminDraft>>({});
  const utils = trpc.useUtils();
  const admins = trpc.admin.listInterviewAdmins.useQuery(undefined, {
    enabled: isSuperAdmin,
    retry: false,
  });

  const createAdmin = trpc.admin.createInterviewAdmin.useMutation({
    onSuccess: async () => {
      toast.success("Mini-admin créé");
      setName("");
      setEmail("");
      setPassword("");
      await utils.admin.listInterviewAdmins.invalidate();
    },
    onError: (error) =>
      toast.error(error.message || "Impossible de créer le mini-admin"),
  });
  const updateAdmin = trpc.admin.updateInterviewAdmin.useMutation({
    onSuccess: async (_, variables) => {
      toast.success("Compte mis à jour");
      setDrafts((current) => ({
        ...current,
        [variables.id]: {
          name: variables.name,
          email: variables.email,
          password: "",
        },
      }));
      await utils.admin.listInterviewAdmins.invalidate();
    },
    onError: (error) =>
      toast.error(error.message || "Impossible de modifier ce compte"),
  });
  const setActive = trpc.admin.setInterviewAdminActive.useMutation({
    onSuccess: async () => utils.admin.listInterviewAdmins.invalidate(),
    onError: (error) =>
      toast.error(error.message || "Impossible de modifier ce compte"),
  });

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4A9B8E] border-t-transparent" />
      </div>
    );
  if (!user) return null;
  if (!isSuperAdmin)
    return (
      <Navigate
        to={
          user.adminRole === "interview_admin" ? "/admin/interviews" : "/admin"
        }
        replace
      />
    );

  const getDraft = (entry: { id: number; name: string; email: string }) =>
    drafts[entry.id] ?? { name: entry.name, email: entry.email, password: "" };
  const setDraft = (id: number, draft: AdminDraft) =>
    setDrafts((current) => ({ ...current, [id]: draft }));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" lang="fr">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 border bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#4A9B8E]">
              <UserCog className="h-6 w-6" />
              <span className="text-sm font-semibold">
                Super administration
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Gestion des mini-admins
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Comptes chargés de la gestion des entretiens.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin">
              <Button variant="outline">
                <ArrowRight className="mr-2 h-4 w-4" />
                Tableau de bord
              </Button>
            </Link>
            <Button variant="outline" onClick={logout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </header>

        <section className="border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-[#4A9B8E]" />
            <div>
              <h2 className="font-bold">Ajouter un mini-admin</h2>
              <p className="text-sm text-slate-500">
                Le mot de passe doit contenir au moins 8 caractères et une
                majuscule.
              </p>
            </div>
          </div>
          <form
            className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              createAdmin.mutate({ name, email, password });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-name">Nom</Label>
              <Input
                id="new-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">E-mail</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                pattern="(?=.*[A-Z]).{8,}"
                title="8 caractères minimum, dont une majuscule"
              />
            </div>
            <Button className="self-end" disabled={createAdmin.isPending}>
              <UserPlus className="mr-2 h-4 w-4" />
              Créer le compte
            </Button>
          </form>
        </section>

        <section className="border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-bold">Comptes existants</h2>
            <p className="text-sm text-slate-500">
              Laissez le mot de passe vide pour le conserver.
            </p>
          </div>
          {admins.isLoading ? (
            <p className="p-6 text-sm text-slate-500">Chargement...</p>
          ) : null}
          {admins.error ? (
            <p className="p-6 text-sm text-red-600">{admins.error.message}</p>
          ) : null}
          <div className="divide-y">
            {(admins.data ?? []).map((entry) => {
              const draft = getDraft(entry);
              return (
                <form
                  key={entry.id}
                  className="grid gap-4 p-5 lg:grid-cols-[1fr_1.2fr_1fr_auto] lg:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateAdmin.mutate({ id: entry.id, ...draft });
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor={`name-${entry.id}`}>Nom</Label>
                    <Input
                      id={`name-${entry.id}`}
                      value={draft.name}
                      onChange={(event) =>
                        setDraft(entry.id, {
                          ...draft,
                          name: event.target.value,
                        })
                      }
                      required
                      minLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`email-${entry.id}`}>E-mail</Label>
                    <Input
                      id={`email-${entry.id}`}
                      type="email"
                      value={draft.email}
                      onChange={(event) =>
                        setDraft(entry.id, {
                          ...draft,
                          email: event.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`password-${entry.id}`}>
                      Nouveau mot de passe
                    </Label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id={`password-${entry.id}`}
                        className="pl-9"
                        type="password"
                        value={draft.password}
                        onChange={(event) =>
                          setDraft(entry.id, {
                            ...draft,
                            password: event.target.value,
                          })
                        }
                        autoComplete="new-password"
                        pattern="(?=.*[A-Z]).{8,}"
                        title="8 caractères minimum, dont une majuscule"
                        placeholder="Inchangé"
                      />
                    </div>
                  </div>
                  <div className="flex min-w-48 items-center justify-between gap-3 lg:pb-0.5">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={entry.isActive}
                        disabled={
                          setActive.isPending &&
                          setActive.variables?.id === entry.id
                        }
                        onCheckedChange={(checked) => {
                          if (
                            !checked &&
                            !window.confirm(
                              `Désactiver le compte de ${entry.name} ?`,
                            )
                          )
                            return;
                          setActive.mutate({ id: entry.id, isActive: checked });
                        }}
                        aria-label={`Activer ${entry.name}`}
                      />
                      <span className="text-sm">
                        {entry.isActive ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      type="submit"
                      disabled={
                        updateAdmin.isPending &&
                        updateAdmin.variables?.id === entry.id
                      }
                      title="Enregistrer"
                    >
                      <Save className="h-4 w-4" />
                      <span className="sr-only">Enregistrer</span>
                    </Button>
                  </div>
                </form>
              );
            })}
            {!admins.isLoading && !admins.data?.length ? (
              <div className="flex flex-col items-center p-10 text-center text-slate-500">
                <ShieldCheck className="mb-3 h-8 w-8" />
                <p>Aucun mini-admin.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
