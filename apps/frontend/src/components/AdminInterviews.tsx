import { useState } from "react";
import { CalendarPlus, ExternalLink, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminInterviews({ enabled }: { enabled: boolean }) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();
  const slots = trpc.interview.adminList.useQuery(undefined, { enabled, retry: false });
  const createSlot = trpc.interview.createSlot.useMutation({
    onSuccess: async () => {
      toast.success("Créneau ajouté");
      setStartTime("");
      setEndTime("");
      setMeetingUrl("");
      setNotes("");
      await utils.interview.adminList.invalidate();
    },
    onError: (error) => toast.error(error.message || "Impossible d’ajouter le créneau"),
  });
  const cancelSlot = trpc.interview.cancelSlot.useMutation({
    onSuccess: async () => {
      toast.success("Créneau annulé");
      await utils.interview.adminList.invalidate();
    },
    onError: (error) => toast.error(error.message || "Impossible d’annuler le créneau"),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!startTime || !endTime || !meetingUrl) {
      toast.error("La date, l’heure et le lien Meet sont obligatoires");
      return;
    }
    createSlot.mutate({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      meetingUrl,
      interviewerName: interviewerName || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarPlus className="h-6 w-6 text-[#4A9B8E]" />
          <div>
            <h2 className="text-lg font-bold">Ajouter un créneau d’entretien</h2>
            <p className="text-sm text-slate-500">Un créneau peut être réservé par un seul candidat accepté.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label htmlFor="interview-start">Début</Label>
            <Input id="interview-start" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="interview-end">Fin</Label>
            <Input id="interview-end" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="interview-meet">Lien Google Meet</Label>
            <Input id="interview-meet" type="url" placeholder="https://meet.google.com/..." value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="interviewer">Membre du jury</Label>
            <Input id="interviewer" value={interviewerName} onChange={(event) => setInterviewerName(event.target.value)} placeholder="Nom du responsable" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="interview-notes">Notes internes</Label>
            <Input id="interview-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <Button type="submit" disabled={createSlot.isPending} className="mt-5 bg-[#4A9B8E] hover:bg-[#3D7A6F]">
          {createSlot.isPending ? "Ajout..." : "Ajouter le créneau"}
        </Button>
      </form>

      <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Jury</th>
              <th className="p-3 text-left">Candidat</th>
              <th className="p-3 text-left">Meet</th>
              <th className="p-3 text-left">État</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {(slots.data ?? []).map((slot) => (
              <tr key={slot.id} className="border-b last:border-b-0">
                <td className="p-3 font-medium">{formatDate(slot.startTime)} – {formatDate(slot.endTime)}</td>
                <td className="p-3">{slot.interviewerName || "-"}</td>
                <td className="p-3">
                  {slot.candidateId ? (
                    <div><p className="flex items-center gap-2 font-medium"><UserRound className="h-4 w-4" /> {slot.candidateFirstName} {slot.candidateLastName}</p><p className="text-xs text-slate-500">{slot.candidateEmail}</p></div>
                  ) : "Disponible"}
                </td>
                <td className="p-3"><a href={slot.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#4A9B8E] underline">Ouvrir <ExternalLink className="h-3 w-3" /></a></td>
                <td className="p-3">{slot.status === "active" ? (slot.candidateId ? "Réservé" : "Disponible") : "Annulé"}</td>
                <td className="p-3">
                  <Button size="sm" variant="destructive" disabled={slot.status === "cancelled" || cancelSlot.isPending} onClick={() => {
                    if (window.confirm("Annuler ce créneau ?")) cancelSlot.mutate({ slotId: slot.id });
                  }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Annuler
                  </Button>
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
