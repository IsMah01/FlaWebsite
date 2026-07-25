import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CalendarPlus, Camera, Clock3, Coffee, ExternalLink, Link2, Save, Trash2, UserCheck, UserRound, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function parseMoroccoDateTime(value: string) {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const expectedUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = expectedUtc;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(instant))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const representedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    instant += expectedUtc - representedUtc;
  }
  return new Date(instant);
}

function addMinutesToWallTime(value: string, minutes: number) {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}T${String(result.getUTCHours()).padStart(2, "0")}:${String(result.getUTCMinutes()).padStart(2, "0")}`;
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
      await Promise.all([
        utils.interview.adminList.invalidate(),
        utils.interview.upcomingInterviews.invalidate(),
      ]);
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
  const isSuperAdmin = adminRole === "super_admin";
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [interviewerName, setInterviewerName] = useState(isInterviewAdmin ? adminName || "" : "");
  const [notes, setNotes] = useState("");
  const [repeatCount, setRepeatCount] = useState(1);
  const [gapMinutes, setGapMinutes] = useState(0);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateView, setCandidateView] = useState<"available" | "mine">("available");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<"all" | "unassigned" | "assigned" | "unbooked" | "booked">("all");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [slotFilter, setSlotFilter] = useState<"all" | "mine" | "booked" | "available">("all");
  const [slotView, setSlotView] = useState<"list" | "planning">("list");
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profilePhoneNumber, setProfilePhoneNumber] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profileInitialized, setProfileInitialized] = useState(false);
  const profileImageInput = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const slots = trpc.interview.adminList.useQuery(undefined, { enabled, retry: false, refetchInterval: 30000 });
  const upcomingInterviews = trpc.interview.upcomingInterviews.useQuery(undefined, {
    enabled,
    retry: false,
    refetchInterval: 30000,
  });
  const assignmentCandidates = trpc.interview.assignmentCandidates.useQuery(undefined, { enabled, retry: false });
  const assignmentAdmins = trpc.interview.assignmentAdmins.useQuery(undefined, { enabled: enabled && isSuperAdmin, retry: false });
  const assignmentAdminStats = trpc.interview.assignmentAdminStats.useQuery(undefined, { enabled: enabled && isSuperAdmin, retry: false });
  const recentAudit = trpc.interview.recentAudit.useQuery(undefined, { enabled, retry: false });
  const myProfile = trpc.interview.myProfile.useQuery(undefined, {
    enabled: enabled && isInterviewAdmin,
    retry: false,
  });
  useEffect(() => {
    if (isInterviewAdmin && myProfile.data && !profileInitialized) {
      setProfileImageUrl(myProfile.data.imageUrl);
      setProfilePhoneNumber(myProfile.data.phoneNumber || "");
      setProfileDescription(myProfile.data.description || "");
      setProfileInitialized(true);
    }
  }, [isInterviewAdmin, myProfile.data, profileInitialized]);
  const googleStatus = trpc.interview.adminGoogleStatus.useQuery(undefined, { enabled, retry: false });

  const createSlot = trpc.interview.createSlot.useMutation({
    onSuccess: async (result) => {
      toast.success(`${result.createdCount} créneau(x) ajouté(s)`);
      setStartTime("");
      setEndTime("");
      setNotes("");
      await Promise.all([
        utils.interview.adminList.invalidate(),
        utils.interview.upcomingInterviews.invalidate(),
        utils.interview.recentAudit.invalidate(),
      ]);
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
      await Promise.all([
        utils.interview.adminList.invalidate(),
        utils.interview.upcomingInterviews.invalidate(),
      ]);
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
      await Promise.all([
        utils.interview.adminList.invalidate(),
        utils.interview.upcomingInterviews.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message || "Impossible de supprimer le créneau"),
  });
  const assignCandidates = trpc.interview.assignCandidates.useMutation({
    onSuccess: async (result) => {
      if (result.emailFailedCount > 0) {
        toast.warning(
          `${result.assignedCount} candidat(s) affecté(s) · ${result.emailSentCount} e-mail(s) envoyé(s) · ${result.emailFailedCount} envoi(s) échoué(s) après 3 tentatives`,
        );
      } else {
        toast.success(
          `${result.assignedCount} candidat(s) affecté(s) · ${result.emailSentCount} e-mail(s) envoyé(s)`,
        );
      }
      setSelectedCandidateIds([]);
      setCandidateView("mine");
      await Promise.all([
        utils.interview.assignmentCandidates.invalidate(),
        utils.interview.recentAudit.invalidate(),
      ]);
    },
    onError: async (error) => {
      toast.error(error.message || "Impossible d’affecter les candidats");
      setSelectedCandidateIds([]);
      await utils.interview.assignmentCandidates.invalidate();
    },
  });
  const releaseCandidate = trpc.interview.releaseCandidate.useMutation({
    onSuccess: async () => {
      toast.success("Candidat remis dans la liste disponible");
      await Promise.all([
        utils.interview.assignmentCandidates.invalidate(),
        utils.interview.recentAudit.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message || "Impossible de libérer ce candidat"),
  });
  const reassignCandidate = trpc.interview.reassignCandidate.useMutation({
    onSuccess: async () => {
      toast.success("Affectation mise à jour");
      await Promise.all([
        utils.interview.assignmentCandidates.invalidate(),
        utils.interview.assignmentAdminStats.invalidate(),
        utils.interview.recentAudit.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message || "Impossible de réattribuer ce candidat"),
  });
  const cancelCandidateBooking = trpc.interview.cancelCandidateBooking.useMutation({
    onSuccess: async (result) => {
      if (result.emailSent) {
        toast.success("Réservation annulée et candidat prévenu");
      } else {
        toast.warning("Réservation annulée, mais l’e-mail au candidat n’a pas pu être envoyé");
      }
      await Promise.all([
        utils.interview.assignmentCandidates.invalidate(),
        utils.interview.adminList.invalidate(),
        utils.interview.upcomingInterviews.invalidate(),
        utils.interview.assignmentAdminStats.invalidate(),
        utils.interview.recentAudit.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message || "Impossible d’annuler cette réservation"),
  });
  const bulkRemoveSlots = trpc.interview.bulkRemoveSlots.useMutation({
    onSuccess: async (result) => {
      toast.success(`${result.deletedCount} supprimé(s), ${result.cancelledCount} annulé(s)`);
      setSelectedSlotIds([]);
      await Promise.all([
        utils.interview.adminList.invalidate(),
        utils.interview.upcomingInterviews.invalidate(),
        utils.interview.assignmentAdminStats.invalidate(),
        utils.interview.recentAudit.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message || "Impossible de retirer les créneaux"),
  });
  const uploadProfileImage = trpc.upload.interviewerImage.useMutation({
    onError: (error) => toast.error(error.message || "Impossible d’importer l’image"),
  });
  const updateProfile = trpc.interview.updateMyProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profil d’entretien enregistré");
      await Promise.all([
        utils.interview.myProfile.invalidate(),
        utils.interview.recentAudit.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message || "Impossible d’enregistrer le profil"),
  });

  async function handleProfileImage(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return toast.error("Choisissez une image JPG ou PNG");
    if (file.size > 2 * 1024 * 1024) return toast.error("L’image doit peser moins de 2 Mo");
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    try {
      const result = await uploadProfileImage.mutateAsync({
        fileName: file.name,
        mimeType: file.type as "image/jpeg" | "image/png",
        data,
      });
      setProfileImageUrl(result.imageUrl);
      toast.success("Image importée");
    } catch {
      // The mutation displays the server error.
    }
  }

  const availableCandidates = useMemo(
    () => (assignmentCandidates.data ?? []).filter((candidate) => !candidate.assignedAdminId),
    [assignmentCandidates.data],
  );
  const myCandidates = useMemo(
    () => (assignmentCandidates.data ?? []).filter((candidate) => candidate.assignedAdminId),
    [assignmentCandidates.data],
  );
  const visibleCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();
    const candidates = isInterviewAdmin
      ? candidateView === "available" ? availableCandidates : myCandidates
      : assignmentCandidates.data ?? [];
    const statusFiltered = candidates.filter((candidate) => {
      if (candidateStatusFilter === "unassigned") return !candidate.assignedAdminId;
      if (candidateStatusFilter === "assigned") return !!candidate.assignedAdminId;
      if (candidateStatusFilter === "unbooked") return !candidate.bookingId;
      if (candidateStatusFilter === "booked") return !!candidate.bookingId;
      return true;
    });
    if (!query) return statusFiltered;
    return statusFiltered.filter((candidate) =>
      `${candidate.firstName} ${candidate.lastName} ${candidate.email} ${candidate.phoneNumber || ""}`.toLowerCase().includes(query),
    );
  }, [assignmentCandidates.data, availableCandidates, candidateSearch, candidateStatusFilter, candidateView, isInterviewAdmin, myCandidates]);

  const visibleSlots = useMemo(() => (slots.data ?? []).filter((slot) => {
    if (slotFilter === "mine") return slot.isOwn;
    if (slotFilter === "booked") return !!slot.bookingId;
    if (slotFilter === "available") return !slot.bookingId && slot.status === "scheduled";
    return true;
  }), [slots.data, slotFilter]);
  const planningDays = useMemo(() => {
    const groups = new Map<string, typeof visibleSlots>();
    for (const slot of visibleSlots) {
      const key = new Intl.DateTimeFormat("fr-CA", {
        timeZone: "Africa/Casablanca",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(slot.startTime));
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return Array.from(groups.entries());
  }, [visibleSlots]);
  const candidatesNeedingSlot = myCandidates.filter((candidate) => !candidate.bookingId).length;
  const openSlotCount = (slots.data ?? []).filter((slot) => slot.status === "scheduled" && !slot.bookingId).length;
  const missingSlotCount = Math.max(0, candidatesNeedingSlot - openSlotCount);

  const availabilitySlots = useMemo(() => {
    if (!isInterviewAdmin || !startTime || !endTime) return [];
    const start = parseMoroccoDateTime(startTime);
    const end = parseMoroccoDateTime(endTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return [];

    const durationMs = 30 * 60 * 1000;
    const stepMs = durationMs + gapMinutes * 60 * 1000;
    const generated: Array<{ start: Date; end: Date }> = [];
    for (let slotStart = start.getTime(); slotStart + durationMs <= end.getTime() && generated.length < 31; slotStart += stepMs) {
      generated.push({ start: new Date(slotStart), end: new Date(slotStart + durationMs) });
    }
    return generated;
  }, [endTime, gapMinutes, isInterviewAdmin, startTime]);
  const availabilityWindowMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return Math.max(0, Math.round(
      (parseMoroccoDateTime(endTime).getTime() - parseMoroccoDateTime(startTime).getTime()) / 60000,
    ));
  }, [endTime, startTime]);
  const unusedAvailabilityMinutes = availabilitySlots.length > 0
    ? Math.max(0, Math.round(
      (parseMoroccoDateTime(endTime).getTime() - availabilitySlots.at(-1)!.end.getTime()) / 60000,
    ))
    : 0;
  const availabilityError = isInterviewAdmin && startTime && endTime
    ? availabilityWindowMinutes < 30
      ? "La période doit contenir au moins 30 minutes."
      : availabilityWindowMinutes > 12 * 60
        ? "La période ne peut pas dépasser 12 heures."
        : availabilitySlots.length > 30
          ? "La période génère plus de 30 créneaux. Réduisez sa durée."
          : null
    : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!googleStatus.data?.connected) return toast.error("Connectez d’abord Google Calendar");
    if (!startTime || !endTime) return toast.error("La date et l’heure sont obligatoires");
    if (availabilityError) return toast.error(availabilityError);
    createSlot.mutate({
      startTime: parseMoroccoDateTime(startTime),
      endTime: parseMoroccoDateTime(endTime),
      interviewerName: interviewerName || undefined,
      notes: notes || undefined,
      repeatCount,
      gapMinutes,
      availabilityMode: isInterviewAdmin,
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

      {isInterviewAdmin ? (
        <section className="border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6 text-[#4A9B8E]" />
            <div><h2 className="text-lg font-bold">Mon profil d’intervieweur</h2><p className="text-sm text-slate-500">Ces informations seront visibles par vos candidats.</p></div>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-[160px_1fr]">
            <div>
              <button type="button" className="group relative flex aspect-square w-40 items-center justify-center overflow-hidden border bg-slate-100" onClick={() => profileImageInput.current?.click()}>
                {profileImageUrl ? <img src={profileImageUrl} alt="Photo de profil" className="h-full w-full object-cover" /> : <Camera className="h-10 w-10 text-slate-400" />}
                <span className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-2 text-xs text-white">{uploadProfileImage.isPending ? "Import..." : "Changer l’image"}</span>
              </button>
              <input ref={profileImageInput} className="sr-only" type="file" accept="image/jpeg,image/png" onChange={(event) => void handleProfileImage(event.target.files?.[0])} />
              <p className="mt-2 text-xs text-slate-500">JPG ou PNG, 2 Mo maximum.</p>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="profile-phone">Numéro de téléphone</Label>
              <Input
                id="profile-phone"
                className="mt-1"
                type="tel"
                maxLength={50}
                value={profilePhoneNumber}
                onChange={(event) => setProfilePhoneNumber(event.target.value)}
                placeholder="+212 6 00 00 00 00"
              />
              <Label htmlFor="profile-description">Présentation</Label>
              <Textarea id="profile-description" className="mt-1 min-h-32 flex-1 resize-y" maxLength={1000} value={profileDescription} onChange={(event) => setProfileDescription(event.target.value)} placeholder="Votre rôle, votre parcours et quelques mots pour accueillir les candidats." />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">{profileDescription.length}/1000</span>
                <Button type="button" disabled={updateProfile.isPending || uploadProfileImage.isPending} onClick={() => updateProfile.mutate({ imageUrl: profileImageUrl, phoneNumber: profilePhoneNumber, description: profileDescription })}>
                  <Save className="mr-2 h-4 w-4" />Enregistrer le profil
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{isInterviewAdmin ? "Mes candidats" : "Candidats acceptés"}</p><p className="mt-1 text-2xl font-bold">{isInterviewAdmin ? myCandidates.length : assignmentCandidates.data?.length ?? 0}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Créneaux planifiés</p><p className="mt-1 text-2xl font-bold">{(slots.data ?? []).filter((slot) => slot.status === "scheduled").length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Réservés</p><p className="mt-1 text-2xl font-bold">{(slots.data ?? []).filter((slot) => slot.bookingId).length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Disponibles</p><p className="mt-1 text-2xl font-bold">{(slots.data ?? []).filter((slot) => !slot.bookingId && slot.status === "scheduled").length}</p></div>
      </section>

      <section className="rounded-2xl border border-[#4A9B8E]/30 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Video className="h-5 w-5 text-[#4A9B8E]" />
              Prochains entretiens réservés
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Accès direct aux rendez-vous confirmés, sans chercher dans la liste des créneaux.
            </p>
          </div>
          <span className="rounded-full bg-[#4A9B8E]/10 px-3 py-1 text-sm font-semibold text-[#3D7A6F]">
            {upcomingInterviews.data?.length ?? 0} à venir
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(upcomingInterviews.data ?? []).map((interview) => (
            <article key={interview.id} className="flex flex-col gap-4 rounded-xl border bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-900">
                  {interview.candidateFirstName} {interview.candidateLastName}
                </p>
                <p className="mt-1 text-sm font-medium text-[#3D7A6F]">{formatDate(interview.startTime)}</p>
                <p className="mt-1 text-xs text-slate-500">{interview.candidateEmail}</p>
              </div>
              <a href={interview.meetingUrl} target="_blank" rel="noreferrer">
                <Button type="button" className="w-full bg-[#4A9B8E] hover:bg-[#3D7A6F] sm:w-auto">
                  <Video className="mr-2 h-4 w-4" /> Rejoindre le Meet
                </Button>
              </a>
            </article>
          ))}
        </div>
        {!upcomingInterviews.isLoading && (upcomingInterviews.data?.length ?? 0) === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
            Aucun entretien réservé à venir.
          </p>
        ) : null}
      </section>

      {isInterviewAdmin ? (
        <section className={`border p-4 ${missingSlotCount > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-slate-900">Capacité de réservation</p>
              <p className="mt-1 text-sm text-slate-600">{candidatesNeedingSlot} candidat(s) sans réservation pour {openSlotCount} créneau(x) libre(s).</p>
            </div>
            <span className={`text-sm font-bold ${missingSlotCount > 0 ? "text-amber-800" : "text-emerald-800"}`}>
              {missingSlotCount > 0 ? `${missingSlotCount} créneau(x) manquant(s)` : "Capacité suffisante"}
            </span>
          </div>
        </section>
      ) : null}

      {isSuperAdmin && (assignmentAdminStats.data?.length ?? 0) > 0 ? (
        <section className="overflow-x-auto border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">Activité par mini-admin</h2>
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-100"><tr><th className="p-3 text-left">Mini-admin</th><th className="p-3 text-right">Candidats</th><th className="p-3 text-right">Réservés</th><th className="p-3 text-right">Créneaux libres</th><th className="p-3 text-right">Terminés</th><th className="p-3 text-right">Absents</th><th className="p-3 text-right">Évaluations restantes</th></tr></thead>
            <tbody>{assignmentAdminStats.data?.map((stat) => (
              <tr key={stat.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{stat.name}</td><td className="p-3 text-right">{stat.assignedCandidates}</td><td className="p-3 text-right">{stat.bookedCandidates}</td><td className="p-3 text-right">{stat.availableSlots}</td><td className="p-3 text-right">{stat.completedInterviews}</td><td className="p-3 text-right">{stat.absentInterviews}</td><td className="p-3 text-right">{stat.pendingEvaluations}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      ) : null}

      <form onSubmit={submit} className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarPlus className="h-6 w-6 text-[#4A9B8E]" />
          <div><h2 className="text-lg font-bold">{isInterviewAdmin ? "Déclarer mes disponibilités" : "Ajouter des créneaux d’entretien"}</h2><p className="text-sm text-slate-500">{isInterviewAdmin ? "Entretiens de 30 minutes, fuseau horaire du Maroc." : "Chaque créneau reçoit son propre lien Google Meet. Fuseau : Maroc."}</p></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div><Label htmlFor="interview-start">{isInterviewAdmin ? "Disponible à partir de" : "Début du premier créneau"}</Label><Input id="interview-start" type="datetime-local" value={startTime} onChange={(event) => {
            const nextStart = event.target.value;
            setStartTime(nextStart);
            if (nextStart && (!endTime || endTime <= nextStart)) setEndTime(addMinutesToWallTime(nextStart, 120));
          }} required /></div>
          <div><Label htmlFor="interview-end">{isInterviewAdmin ? "Disponible jusqu’à" : "Fin du premier créneau"}</Label><Input id="interview-end" type="datetime-local" min={startTime || undefined} value={endTime} onChange={(event) => setEndTime(event.target.value)} required /></div>
          {!isInterviewAdmin ? <div><Label htmlFor="interviewer">Membre du jury</Label><Input id="interviewer" value={interviewerName} onChange={(event) => setInterviewerName(event.target.value)} placeholder="Nom du responsable" /></div> : null}
          {!isInterviewAdmin ? <div><Label htmlFor="repeat-count">Nombre de créneaux</Label><Input id="repeat-count" type="number" min={1} max={30} value={repeatCount} onChange={(event) => setRepeatCount(Number(event.target.value))} /></div> : null}
          <div>
            <Label htmlFor="gap-minutes">Pause entre les entretiens</Label>
            {isInterviewAdmin ? (
              <div className="mt-1 flex gap-2">
                <div className="flex h-10 flex-1 overflow-hidden rounded-md border bg-white">
                  {[0, 5, 10, 15].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className={`flex-1 border-r px-2 text-sm font-medium last:border-r-0 ${gapMinutes === minutes ? "bg-[#4A9B8E] text-white" : "text-slate-600 hover:bg-slate-50"}`}
                      onClick={() => setGapMinutes(minutes)}
                      aria-pressed={gapMinutes === minutes}
                    >
                      {minutes}
                    </button>
                  ))}
                </div>
                <Input
                  id="gap-minutes"
                  className="w-24"
                  type="number"
                  min={0}
                  max={240}
                  value={gapMinutes}
                  onChange={(event) => setGapMinutes(Math.max(0, Math.min(240, Number(event.target.value))))}
                  aria-label="Pause personnalisée en minutes"
                />
              </div>
            ) : (
              <Input id="gap-minutes" type="number" min={0} max={240} value={gapMinutes} onChange={(event) => setGapMinutes(Math.max(0, Math.min(240, Number(event.target.value))))} />
            )}
          </div>
          <div><Label htmlFor="interview-notes">Notes internes</Label><Input id="interview-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
        </div>
        {isInterviewAdmin && availabilityError ? (
          <div className="mt-5 flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{availabilityError}</span>
          </div>
        ) : null}
        {isInterviewAdmin && availabilitySlots.length > 0 && !availabilityError ? (
          <div className="mt-5 border bg-slate-50 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="font-semibold text-slate-900">Aperçu des créneaux</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-[#3D7A6F]"><Clock3 className="h-4 w-4" />{availabilitySlots.length} entretien(s)</span>
                <span className="flex items-center gap-1.5 text-slate-600"><Coffee className="h-4 w-4" />Pause : {gapMinutes} min</span>
                {unusedAvailabilityMinutes > 0 ? <span className="text-amber-700">{unusedAvailabilityMinutes} min non utilisée(s)</span> : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {availabilitySlots.slice(0, 30).map((slot) => (
                <span key={slot.start.toISOString()} className="border bg-white px-3 py-1.5 text-sm text-slate-700">
                  {slot.start.toLocaleTimeString("fr-FR", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {slot.end.toLocaleTimeString("fr-FR", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit" })}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {!googleStatus.isLoading && !googleStatus.data?.connected ? (
          <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {isInterviewAdmin
              ? "Création temporairement indisponible : l’administrateur principal doit d’abord connecter le compte Google Calendar central."
              : "Connectez Google Calendar ci-dessus pour activer la création des créneaux et des liens Meet."}
          </div>
        ) : null}
        <Button
          type="submit"
          disabled={
            createSlot.isPending
            || googleStatus.isLoading
            || !googleStatus.data?.connected
            || (isInterviewAdmin && (availabilitySlots.length === 0 || !!availabilityError))
          }
          title={
            !googleStatus.data?.connected
              ? "Google Calendar central n’est pas connecté"
              : isInterviewAdmin && (availabilitySlots.length === 0 || availabilityError)
                ? availabilityError || "Sélectionnez une disponibilité d’au moins 30 minutes"
                : undefined
          }
          className="mt-5 bg-[#4A9B8E] hover:bg-[#3D7A6F]"
        >
          {createSlot.isPending
            ? "Création des liens Meet..."
            : !googleStatus.data?.connected
              ? "Google Calendar non connecté"
              : isInterviewAdmin
                ? `Confirmer ${availabilitySlots.length} entretien${availabilitySlots.length > 1 ? "s" : ""}`
                : `Créer ${repeatCount} créneau(x)`}
        </Button>
      </form>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-[#4A9B8E]" /> Gestion des candidats</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isInterviewAdmin ? "Choisissez les candidats que vous prendrez en entretien." : "Vue globale des affectations aux mini-admins."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className="h-10 rounded-md border bg-white px-3 text-sm" value={candidateStatusFilter} onChange={(event) => setCandidateStatusFilter(event.target.value as typeof candidateStatusFilter)}>
              <option value="all">Tous les états</option>
              <option value="unassigned">Non affectés</option>
              <option value="assigned">Affectés</option>
              <option value="unbooked">Sans réservation</option>
              <option value="booked">Réservés</option>
            </select>
            <Input className="max-w-sm" placeholder="Rechercher par nom, e-mail ou téléphone" value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} />
          </div>
        </div>

        {isInterviewAdmin ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-md border bg-slate-50 p-1">
              <Button type="button" size="sm" variant={candidateView === "available" ? "default" : "ghost"} onClick={() => setCandidateView("available")}>
                Disponibles ({availableCandidates.length})
              </Button>
              <Button type="button" size="sm" variant={candidateView === "mine" ? "default" : "ghost"} onClick={() => setCandidateView("mine")}>
                Mes candidats ({myCandidates.length})
              </Button>
            </div>
            {candidateView === "available" && selectedCandidateIds.length > 0 ? (
              <Button
                type="button"
                disabled={assignCandidates.isPending}
                onClick={() => assignCandidates.mutate({ candidateIds: selectedCandidateIds })}
                className="bg-[#4A9B8E] hover:bg-[#3D7A6F]"
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Confirmer {selectedCandidateIds.length} sélection(s)
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100">
              <tr>
                {isInterviewAdmin && candidateView === "available" ? (
                  <th className="w-12 p-3 text-left">
                    <Checkbox
                      checked={visibleCandidates.length > 0 && visibleCandidates.every((candidate) => selectedCandidateIds.includes(candidate.id))}
                      aria-label="Sélectionner tous les candidats affichés"
                      onCheckedChange={(checked) => {
                        const visibleIds = visibleCandidates.map((candidate) => candidate.id);
                        setSelectedCandidateIds((current) => checked
                          ? Array.from(new Set([...current, ...visibleIds]))
                          : current.filter((id) => !visibleIds.includes(id)));
                      }}
                    />
                  </th>
                ) : null}
                <th className="p-3 text-left">Nom</th>
                <th className="p-3 text-left">E-mail</th>
                <th className="p-3 text-left">Téléphone</th>
                {(!isInterviewAdmin || candidateView === "mine") ? <th className="p-3 text-left">Affectation</th> : null}
                {isInterviewAdmin && candidateView === "mine" ? <th className="p-3 text-right">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleCandidates.map((candidate) => {
                const selected = selectedCandidateIds.includes(candidate.id);
                return (
                  <tr key={candidate.id} className={`border-b last:border-b-0 ${selected ? "bg-emerald-50" : ""}`}>
                    {isInterviewAdmin && candidateView === "available" ? (
                      <td className="p-3">
                        <Checkbox
                          checked={selected}
                          aria-label={`Sélectionner ${candidate.firstName} ${candidate.lastName}`}
                          onCheckedChange={(checked) => setSelectedCandidateIds((current) =>
                            checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id),
                          )}
                        />
                      </td>
                    ) : null}
                    <td className="p-3 font-medium">{candidate.firstName} {candidate.lastName}</td>
                    <td className="p-3">{candidate.email}</td>
                    <td className="p-3">{candidate.phoneNumber || "-"}</td>
                    {(!isInterviewAdmin || candidateView === "mine") ? (
                      <td className="p-3">
                        {isSuperAdmin ? (
                          <div className="min-w-64 space-y-2">
                            <select
                              className="h-9 min-w-44 rounded-md border bg-white px-2 text-sm"
                              value={candidate.assignedAdminId || ""}
                              disabled={!!candidate.bookingId || reassignCandidate.isPending}
                              title={candidate.bookingId ? "Annulez d’abord la réservation pour réattribuer le candidat" : undefined}
                              onChange={(event) => {
                                const targetAdminId = Number(event.target.value);
                                if (targetAdminId && window.confirm(`Affecter ${candidate.firstName} ${candidate.lastName} à ce mini-admin ?`)) {
                                  reassignCandidate.mutate({ candidateId: candidate.id, targetAdminId });
                                }
                              }}
                            >
                              <option value="">Non affecté</option>
                              {(assignmentAdmins.data ?? []).filter((admin) => admin.isActive).map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}
                            </select>
                            {candidate.bookingId ? (
                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
                                <p className="font-semibold">Rendez-vous réservé</p>
                                {candidate.bookingStartTime ? <p className="mt-1">{formatDate(candidate.bookingStartTime)}</p> : null}
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {candidate.bookingMeetingUrl ? (
                                    <a href={candidate.bookingMeetingUrl} target="_blank" rel="noreferrer">
                                      <Button type="button" size="sm" variant="outline" className="h-8 bg-white">
                                        <Video className="mr-1 h-3.5 w-3.5" /> Ouvrir Meet
                                      </Button>
                                    </a>
                                  ) : null}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="h-8"
                                    disabled={cancelCandidateBooking.isPending}
                                    onClick={() => {
                                      if (window.confirm(
                                        `Annuler la réservation de ${candidate.firstName} ${candidate.lastName} ? Le candidat sera prévenu et devra choisir un nouveau créneau.`,
                                      )) {
                                        cancelCandidateBooking.mutate({ candidateId: candidate.id });
                                      }
                                    }}
                                  >
                                    Annuler la réservation
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : candidate.assignedAdminName
                          ? <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">{candidate.assignedAdminName}</span>
                          : <span className="text-slate-400">Non affecté</span>}
                      </td>
                    ) : null}
                    {isInterviewAdmin && candidateView === "mine" ? (
                      <td className="p-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!!candidate.bookingId || releaseCandidate.isPending}
                          title={candidate.bookingId ? "Ce candidat a déjà réservé un créneau" : "Remettre ce candidat dans la liste disponible"}
                          onClick={() => {
                            if (window.confirm(`Libérer ${candidate.firstName} ${candidate.lastName} ?`)) {
                              releaseCandidate.mutate({ candidateId: candidate.id });
                            }
                          }}
                        >
                          {candidate.bookingId ? "Créneau réservé" : "Libérer"}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!assignmentCandidates.isLoading && visibleCandidates.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              {candidateView === "available" ? "Aucun candidat disponible." : "Aucun candidat dans votre liste."}
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Tous les créneaux et réservations</h2>
          <div className="flex flex-wrap gap-2">
            {selectedSlotIds.length > 0 ? <Button type="button" variant="destructive" disabled={bulkRemoveSlots.isPending} onClick={() => {
              if (window.confirm(`Retirer ${selectedSlotIds.length} créneau(x) ? Les candidats réservés seront prévenus.`)) {
                bulkRemoveSlots.mutate({ slotIds: selectedSlotIds });
              }
            }}><Trash2 className="mr-2 h-4 w-4" />Retirer ({selectedSlotIds.length})</Button> : null}
            <div className="inline-flex rounded-md border bg-slate-50 p-1">
              <Button type="button" size="sm" variant={slotView === "list" ? "default" : "ghost"} onClick={() => setSlotView("list")}>Liste</Button>
              <Button type="button" size="sm" variant={slotView === "planning" ? "default" : "ghost"} onClick={() => setSlotView("planning")}>Planning</Button>
            </div>
            <select className="h-10 rounded-md border bg-white px-3 text-sm" value={slotFilter} onChange={(event) => setSlotFilter(event.target.value as typeof slotFilter)}>
              <option value="all">Tous les créneaux</option>
              <option value="mine">Mes créneaux</option>
              <option value="booked">Créneaux réservés</option>
              <option value="available">Créneaux disponibles</option>
            </select>
          </div>
        </div>
        {slotView === "planning" ? (
          <div className="grid gap-4 py-2 lg:grid-cols-2">
            {planningDays.map(([day, daySlots]) => (
              <div key={day} className="border bg-slate-50">
                <h3 className="border-b bg-white p-3 font-semibold">{new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", dateStyle: "full" }).format(new Date(daySlots[0].startTime))}</h3>
                <div className="divide-y">{daySlots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between gap-3 p-3">
                    <div><p className="font-medium">{new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit" }).format(new Date(slot.startTime))} – {new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit" }).format(new Date(slot.endTime))}</p><p className="text-xs text-slate-500">{slot.candidateId ? `${slot.candidateFirstName} ${slot.candidateLastName}` : "Disponible"} · {slot.interviewerName || "-"}</p></div>
                    <span className={`h-2.5 w-2.5 rounded-full ${slot.status === "completed" ? "bg-emerald-500" : slot.status === "absent" ? "bg-red-500" : slot.bookingId ? "bg-blue-500" : "bg-slate-300"}`} />
                  </div>
                ))}</div>
              </div>
            ))}
          </div>
        ) : <table className="w-full min-w-[1150px] text-sm">
          <thead className="bg-slate-100"><tr><th className="w-12 p-3 text-left"><Checkbox checked={visibleSlots.length > 0 && visibleSlots.filter((slot) => slot.status === "scheduled").every((slot) => selectedSlotIds.includes(slot.id))} aria-label="Sélectionner tous les créneaux planifiés" onCheckedChange={(checked) => {
            const ids = visibleSlots.filter((slot) => slot.status === "scheduled").map((slot) => slot.id);
            setSelectedSlotIds((current) => checked ? Array.from(new Set([...current, ...ids])) : current.filter((id) => !ids.includes(id)));
          }} /></th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Jury</th><th className="p-3 text-left">Candidat</th><th className="p-3 text-left">Meet</th><th className="p-3 text-left">État</th><th className="p-3 text-left">Suivi</th></tr></thead>
          <tbody>
            {visibleSlots.map((slot) => (
              <tr key={slot.id} className="border-b align-top last:border-b-0">
                <td className="p-3"><Checkbox checked={selectedSlotIds.includes(slot.id)} disabled={slot.status !== "scheduled"} aria-label={`Sélectionner le créneau ${formatDate(slot.startTime)}`} onCheckedChange={(checked) => setSelectedSlotIds((current) => checked ? [...current, slot.id] : current.filter((id) => id !== slot.id))} /></td>
                <td className="p-3 font-medium">{formatDate(slot.startTime)} – {formatDate(slot.endTime)}</td>
                <td className="p-3"><p>{slot.interviewerName || "-"}</p><p className="text-xs text-slate-500">Créé par : {slot.createdByAdminName || "ancien compte"}</p></td>
                <td className="p-3">
                  {slot.candidateId ? <div><p className="flex items-center gap-2 font-medium"><UserRound className="h-4 w-4" /> {slot.candidateFirstName} {slot.candidateLastName}</p><p className="text-xs text-slate-500">{slot.candidateEmail}</p></div> : "Disponible"}
                </td>
                <td className="p-3"><a href={slot.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#4A9B8E] underline">Ouvrir <ExternalLink className="h-3 w-3" /></a></td>
                <td className="p-3">
                  <select className="h-9 rounded-md border bg-white px-2" value={slot.status} disabled={updateStatus.isPending} onChange={(event) => {
                    const status = event.target.value as "scheduled" | "completed" | "absent" | "cancelled";
                    if (status === "cancelled" && !window.confirm("Annuler ce créneau et prévenir le candidat ?")) return;
                    updateStatus.mutate({ slotId: slot.id, status });
                  }}>
                    <option value="scheduled">Planifié</option>
                    <option value="completed" disabled={!slot.candidateId}>Terminé</option>
                    <option value="absent" disabled={!slot.candidateId}>Absent</option>
                    <option value="cancelled">Annulé</option>
                  </select>
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
                  {slot.bookingId && slot.status === "completed" ? <EvaluationForm slot={slot} /> : <span className="text-xs text-slate-500">{slot.bookingId ? "Candidat réservé" : "En attente de réservation"}</span>}
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
        </table>}
        {!slots.isLoading && (slots.data?.length ?? 0) === 0 ? <p className="p-8 text-center text-slate-500">Aucun créneau créé.</p> : null}
      </section>

      <section className="border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Activité récente</h2>
        <div className="mt-3 divide-y">
          {(recentAudit.data ?? []).slice(0, 12).map((entry) => (
            <div key={entry.id} className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-700">
                <span className="font-medium">{entry.actorName || "Administrateur"}</span>
                {" · "}
                {entry.action === "candidate_assigned" ? "candidat affecté"
                  : entry.action === "candidate_reassigned" ? "candidat réattribué"
                    : entry.action === "candidate_released" ? "candidat libéré"
                      : entry.action === "slots_created" ? "créneaux créés"
                        : entry.action === "slot_cancelled" ? "créneau annulé"
                          : entry.action === "slot_deleted" ? "créneau supprimé"
                            : entry.action}
                {entry.candidateName ? ` · ${entry.candidateName}` : ""}
                {entry.targetAdminName ? ` · ${entry.targetAdminName}` : ""}
              </p>
              <time className="text-xs text-slate-500">{formatDate(entry.createdAt)}</time>
            </div>
          ))}
          {!recentAudit.isLoading && !recentAudit.data?.length ? <p className="py-6 text-center text-sm text-slate-500">Aucune activité enregistrée.</p> : null}
        </div>
      </section>
    </div>
  );
}
