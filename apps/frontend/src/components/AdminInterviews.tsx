import { useMemo, useState } from "react";
import { CalendarPlus, ExternalLink, Link2, Save, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Casablanca",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const statusLabels: Record<string, string> = {
  scheduled: "Planifié",
  completed: "Terminé",
  absent: "Absent",
  cancelled: "Annulé",
};

function EvaluationForm({ slot }: { slot: any }) {
  const utils = trpc.useUtils();
  const [communicationScore, setCommunicationScore] = useState(slot.communicationScore ?? 3);
  const [motivationScore, setMotivationScore] = useState(slot.motivationScore ?? 3);
  const [leadershipScore, setLeadershipScore] = useState(slot.leadershipScore ?? 3);
  const [recommendation, setRecommendation] = useState(slot.recommendation ?? "pending");
  const [evaluationNotes, setEvaluationNotes] = useState(slot.evaluationNotes ?? "");
  const save = trpc.interview.saveEvaluation.useMutation({
    onSuccess: async () => {
      toast.success("Évaluation enregistrée");
      await utils.interview.adminList.invalidate();
    },
    onError: (error) => toast.error(error.message || "Impossible d’enregistrer l’évaluation"),
  });

  return (
    <details className="mt-3 rounded-lg border bg-slate-50 p-3">
      <summary className="cursor-pointer font-semibold">Fiche d’évaluation</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {[
          ["Communication", communicationScore, setCommunicationScore],
          ["Motivation", motivationScore, setMotivationScore],
          ["Leadership", leadershipScore, setLeadershipScore],
        ].map(([label, value, setter]) => (
          <label key={label as string} className="text-xs font-medium">
            {label as string} / 5
            <Input
              className="mt-1"
              type="number"
              min={1}
              max={5}
              value={value as number}
              onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))}
            />
          </label>
        ))}
      </div>
      <Label className="mt-3 block">Recommandation</Label>
      <select className="mt-1 h-10 w-full rounded-md border bg-white px-3" value={recommendation} onChange={(event) => setRecommendation(event.target.value)}>
        <option value="pending">À décider</option>
        <option value="accepted">Recommandé</option>
        <option value="rejected">Non recommandé</option>
      </select>
      <Label className="mt-3 block">Commentaires du jury</Label>
      <textarea className="mt-1 min-h-24 w-full rounded-md border bg-white p-3 text-sm" value={evaluationNotes} onChange={(event) => setEvaluationNotes(event.target.value)} />
      <Button
        type="button"
        size="sm"
        className="mt-3 bg-[#4A9B8E] hover:bg-[#3D7A6F]"
        disabled={save.isPending}
        onClick={() => save.mutate({
          bookingId: slot.bookingId,
          communicationScore,
          motivationScore,
          leadershipScore,
          recommendation,
          evaluationNotes: evaluationNotes || undefined,
        })}
      >
        <Save className="mr-2 h-4 w-4" /> Enregistrer l’évaluation
      </Button>
    </details>
  );
}

export default function AdminInterviews({ enabled, adminRole, adminName }: { enabled: boolean; adminRole?: string; adminName?: string | null }) {
  const isInterviewAdmin = adminRole === "interview_admin";
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [interviewerName, setInterviewerName] = useState(isInterviewAdmin ? adminName || "" : "");
  const [notes, setNotes] = useState("");
  const [repeatCount, setRepeatCount] = useState(1);
  const [gapMinutes, setGapMinutes] = useState(0);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState<"all" | "mine" | "booked" | "available">("all");
  const utils = trpc.useUtils();
  const slots = trpc.interview.adminList.useQuery(undefined, { enabled, retry: false });
  const acceptedCandidates = trpc.interview.acceptedCandidates.useQuery(undefined, { enabled, retry: false });
  const googleStatus = trpc.interview.adminGoogleStatus.useQuery(undefined, { enabled, retry: false });

  const createSlot = trpc.interview.createSlot.useMutation({
    onSuccess: async (result) => {
      toast.success(`${result.createdCount} créneau(x) ajouté(s)`);
      setStartTime("");
      setEndTime("");
      setNotes("");
      await utils.interview.adminList.invalidate();
    },
    onError: (error) => toast.error(error.message || "Impossible d’ajouter les créneaux"),
  });
  const updateStatus = trpc.interview.updateSlotStatus.useMutation({
    onSuccess: async (result) => {
      if (result.calendarSynced === false) {
        toast.warning("Créneau annulé, mais la suppression Google Calendar doit être réessayée");
      } else {
        toast.success("État mis à jour");
      }
      await utils.interview.adminList.invalidate();
    },
    onError: (error) => toast.error(error.message || "Impossible de modifier l’état"),
  });
  const retryCalendarSync = trpc.interview.retryCalendarSync.useMutation({
    onSuccess: async (result) => {
      if (result.calendarSynced) toast.success("Google Calendar est de nouveau synchronisé");
      else toast.error("La synchronisation Google Calendar a encore échoué");
      await utils.interview.adminList.invalidate();
    },
    onError: (error) => toast.error(error.message || "Impossible de relancer la synchronisation"),
  });
  const disconnectGoogle = trpc.interview.adminDisconnectGoogle.useMutation({
    onSuccess: async () => {
      toast.success("Google Calendar déconnecté");
      await utils.interview.adminGoogleStatus.invalidate();
    },
    onError: (error) => toast.error(error.message || "Impossible de déconnecter Google"),
  });
  const deleteOwnSlot = trpc.interview.deleteOwnSlot.useMutation({
    onSuccess: async (result) => {
      toast.success(result.deleted ? "Créneau supprimé" : "Créneau annulé et candidat prévenu");
      await utils.interview.adminList.invalidate();
    },
    onError: (error) => toast.error(error.message || "Impossible de supprimer le créneau"),
  });

  const visibleCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();
    if (!query) return acceptedCandidates.data ?? [];
    return (acceptedCandidates.data ?? []).filter((candidate) =>
      `${candidate.firstName} ${candidate.lastName} ${candidate.email} ${candidate.phoneNumber || ""}`.toLowerCase().includes(query),
    );
  }, [acceptedCandidates.data, candidateSearch]);

  const visibleSlots = useMemo(() => (slots.data ?? []).filter((slot) => {
    if (slotFilter === "mine") return slot.isOwn;
    if (slotFilter === "booked") return !!slot.bookingId;
    if (slotFilter === "available") return !slot.bookingId && slot.status === "scheduled";
    return true;
  }), [slots.data, slotFilter]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!googleStatus.data?.connected) return toast.error("Connectez d’abord Google Calendar");
    if (!startTime || !endTime) return toast.error("La date et l’heure sont obligatoires");
    createSlot.mutate({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      interviewerName: interviewerName || undefined,
      notes: notes || undefined,
      repeatCount,
      gapMinutes,
    });
  }

  return (
    <div className="space-y-5">
      <section className={`rounded-2xl border p-5 shadow-sm ${googleStatus.data?.connected ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Link2 className="h-5 w-5" /> Google Calendar et Meet</h2>
            <p className="mt-1 text-sm text-slate-600">
              {!googleStatus.data?.configured
                ? "Les identifiants OAuth Google ne sont pas configurés."
                : googleStatus.data.connected
                  ? "Compte Google connecté. Les liens Meet sont créés automatiquement."
                  : googleStatus.data.needsReconnect
                    ? "La connexion Google a expiré. Reconnectez le compte."
                    : "Connectez le compte Google qui organisera les entretiens."}
            </p>
          </div>
          {!isInterviewAdmin ? <div className="flex flex-wrap gap-2">
            {googleStatus.data?.configured ? (
              <a href="/api/google/calendar/connect"><Button type="button" className="bg-[#4A9B8E] hover:bg-[#3D7A6F]">{googleStatus.data.connected ? "Reconnecter" : "Connecter"}</Button></a>
            ) : null}
            {googleStatus.data?.connected ? (
              <Button type="button" variant="destructive" disabled={disconnectGoogle.isPending} onClick={() => {
                if (window.confirm("Déconnecter Google Calendar ? Les événements déjà créés seront conservés.")) disconnectGoogle.mutate();
              }}>Déconnecter</Button>
            ) : null}
          </div> : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Candidats acceptés</p><p className="mt-1 text-2xl font-bold">{acceptedCandidates.data?.length ?? 0}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Créneaux planifiés</p><p className="mt-1 text-2xl font-bold">{(slots.data ?? []).filter((slot) => slot.status === "scheduled").length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Réservés</p><p className="mt-1 text-2xl font-bold">{(slots.data ?? []).filter((slot) => slot.bookingId).length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Disponibles</p><p className="mt-1 text-2xl font-bold">{(slots.data ?? []).filter((slot) => !slot.bookingId && slot.status === "scheduled").length}</p></div>
      </section>

      <form onSubmit={submit} className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarPlus className="h-6 w-6 text-[#4A9B8E]" />
          <div><h2 className="text-lg font-bold">Ajouter des créneaux d’entretien</h2><p className="text-sm text-slate-500">Chaque créneau reçoit son propre lien Google Meet. Fuseau : Maroc.</p></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div><Label htmlFor="interview-start">Début du premier créneau</Label><Input id="interview-start" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} required /></div>
          <div><Label htmlFor="interview-end">Fin du premier créneau</Label><Input id="interview-end" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} required /></div>
          <div><Label htmlFor="interviewer">Membre du jury</Label><Input id="interviewer" value={interviewerName} disabled={isInterviewAdmin} onChange={(event) => setInterviewerName(event.target.value)} placeholder="Nom du responsable" /></div>
          <div><Label htmlFor="repeat-count">Nombre de créneaux</Label><Input id="repeat-count" type="number" min={1} max={30} value={repeatCount} onChange={(event) => setRepeatCount(Number(event.target.value))} /></div>
          <div><Label htmlFor="gap-minutes">Pause entre les créneaux (minutes)</Label><Input id="gap-minutes" type="number" min={0} max={240} value={gapMinutes} onChange={(event) => setGapMinutes(Number(event.target.value))} /></div>
          <div><Label htmlFor="interview-notes">Notes internes</Label><Input id="interview-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
        </div>
        {!googleStatus.isLoading && !googleStatus.data?.connected ? (
          <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {isInterviewAdmin
              ? "Création temporairement indisponible : l’administrateur principal doit d’abord connecter le compte Google Calendar central."
              : "Connectez Google Calendar ci-dessus pour activer la création des créneaux et des liens Meet."}
          </div>
        ) : null}
        <Button
          type="submit"
          disabled={createSlot.isPending || googleStatus.isLoading || !googleStatus.data?.connected}
          title={!googleStatus.data?.connected ? "Google Calendar central n’est pas connecté" : undefined}
          className="mt-5 bg-[#4A9B8E] hover:bg-[#3D7A6F]"
        >
          {createSlot.isPending
            ? "Création des liens Meet..."
            : !googleStatus.data?.connected
              ? "Google Calendar non connecté"
              : `Créer ${repeatCount} créneau(x)`}
        </Button>
      </form>

      <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">Candidats acceptés</h2>
          <Input className="max-w-sm" placeholder="Rechercher par nom, e-mail ou téléphone" value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} />
        </div>
        <table className="w-full min-w-[650px] text-sm">
          <thead className="bg-slate-100"><tr><th className="p-3 text-left">Nom</th><th className="p-3 text-left">E-mail</th><th className="p-3 text-left">Téléphone</th></tr></thead>
          <tbody>
            {visibleCandidates.map((candidate) => (
              <tr key={candidate.id} className="border-b last:border-b-0">
                <td className="p-3 font-medium">{candidate.firstName} {candidate.lastName}</td>
                <td className="p-3">{candidate.email}</td>
                <td className="p-3">{candidate.phoneNumber || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Tous les créneaux et réservations</h2>
          <select className="h-10 rounded-md border bg-white px-3 text-sm" value={slotFilter} onChange={(event) => setSlotFilter(event.target.value as typeof slotFilter)}>
            <option value="all">Tous les créneaux</option>
            <option value="mine">Mes créneaux</option>
            <option value="booked">Créneaux réservés</option>
            <option value="available">Créneaux disponibles</option>
          </select>
        </div>
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-100"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Jury</th><th className="p-3 text-left">Candidat</th><th className="p-3 text-left">Meet</th><th className="p-3 text-left">État</th><th className="p-3 text-left">Suivi</th></tr></thead>
          <tbody>
            {visibleSlots.map((slot) => (
              <tr key={slot.id} className="border-b align-top last:border-b-0">
                <td className="p-3 font-medium">{formatDate(slot.startTime)} – {formatDate(slot.endTime)}</td>
                <td className="p-3"><p>{slot.interviewerName || "-"}</p><p className="text-xs text-slate-500">Créé par : {slot.createdByAdminName || "ancien compte"}</p></td>
                <td className="p-3">
                  {slot.candidateId ? <div><p className="flex items-center gap-2 font-medium"><UserRound className="h-4 w-4" /> {slot.candidateFirstName} {slot.candidateLastName}</p><p className="text-xs text-slate-500">{slot.candidateEmail}</p></div> : "Disponible"}
                </td>
                <td className="p-3"><a href={slot.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#4A9B8E] underline">Ouvrir <ExternalLink className="h-3 w-3" /></a></td>
                <td className="p-3">
                  {!isInterviewAdmin ? <select className="h-9 rounded-md border bg-white px-2" value={slot.status} disabled={updateStatus.isPending} onChange={(event) => {
                    const status = event.target.value as "scheduled" | "completed" | "absent" | "cancelled";
                    if (status === "cancelled" && !window.confirm("Annuler ce créneau et prévenir le candidat ?")) return;
                    updateStatus.mutate({ slotId: slot.id, status });
                  }}>
                    <option value="scheduled">Planifié</option>
                    <option value="completed" disabled={!slot.candidateId}>Terminé</option>
                    <option value="absent" disabled={!slot.candidateId}>Absent</option>
                    <option value="cancelled">Annulé</option>
                  </select> : null}
                  <p className="mt-1 text-xs text-slate-500">{statusLabels[slot.status]}</p>
                  {slot.calendarSyncStatus === "failed" ? (
                    <div className="mt-2 max-w-64 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                      <p className="font-semibold">Synchronisation Google échouée</p>
                      {slot.calendarSyncError ? <p className="mt-1 break-words">{slot.calendarSyncError}</p> : null}
                      {!isInterviewAdmin ? <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 border-red-300 bg-white text-xs"
                        disabled={retryCalendarSync.isPending}
                        onClick={() => retryCalendarSync.mutate({ slotId: slot.id })}
                      >
                        Réessayer
                      </Button> : null}
                    </div>
                  ) : null}
                </td>
                <td className="p-3">
                  {!isInterviewAdmin && slot.bookingId && slot.status === "completed" ? <EvaluationForm slot={slot} /> : <span className="text-xs text-slate-500">{slot.bookingId ? "Candidat réservé" : "En attente de réservation"}</span>}
                  {slot.canDelete && slot.status !== "cancelled" ? (
                    <Button type="button" size="sm" variant="destructive" className="mt-2" disabled={deleteOwnSlot.isPending} onClick={() => {
                      if (window.confirm("Supprimer ce créneau et prévenir le candidat réservé ?")) deleteOwnSlot.mutate({ slotId: slot.id });
                    }}>
                      <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!slots.isLoading && (slots.data?.length ?? 0) === 0 ? <p className="p-8 text-center text-slate-500">Aucun créneau créé.</p> : null}
      </section>
    </div>
  );
}
