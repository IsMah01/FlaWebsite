import { useMemo, useState } from "react";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  History,
  QrCode,
  RefreshCw,
  Search,
  Square,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { formatMoroccoDateTime, formatMoroccoTime } from "@/lib/morocco-time";
import { trpc } from "@/providers/trpc";
import {
  PROGRAMME_EDITION_NUMBER,
  PROGRAMME_START_DATE,
  PROGRAMME_TIMEZONE_OFFSET,
  programmeDays,
} from "./FinalCandidateProgramme";

type QrPreview = {
  sessionId: number;
  title: string;
  url: string;
  image: string;
};
type CandidateRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  checkedInAt: unknown;
};

function stableScheduleKey(dayNumber: number, time: string) {
  // Keep the already printed QR attached to its activity when the programme
  // moves that activity to another day or time.
  const movedSessionKeys: Record<string, string> = {
    "7-14:30": `edition${PROGRAMME_EDITION_NUMBER}-day-8-slot-1600`,
    "8-16:00": `edition${PROGRAMME_EDITION_NUMBER}-day-9-slot-1430`,
    "9-14:30": `edition${PROGRAMME_EDITION_NUMBER}-day-7-slot-1430`,
    "10-14:30": `edition${PROGRAMME_EDITION_NUMBER}-day-9-slot-1600`,
    "10-16:00": `edition${PROGRAMME_EDITION_NUMBER}-day-10-slot-1430`,
  };
  const movedKey = movedSessionKeys[`${dayNumber}-${time.slice(0, 5)}`];
  if (movedKey) return movedKey;
  return `edition${PROGRAMME_EDITION_NUMBER}-day-${dayNumber}-slot-${time.slice(0, 5).replace(":", "")}`;
}
function sessionStartIso(dayNumber: number, time: string) {
  const [year, month, day] = PROGRAMME_START_DATE.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayNumber - 1))
    .toISOString()
    .slice(0, 10);
  return new Date(
    `${date}T${time.slice(0, 5)}:00${PROGRAMME_TIMEZONE_OFFSET}`,
  ).toISOString();
}
function sessionDurationMs(time: string) {
  const match = time.match(/(\d{2}):(\d{2})\s*[—-]\s*(\d{2}):(\d{2})/);
  if (!match) return 90 * 60 * 1000;
  const startMinutes = Number(match[1]) * 60 + Number(match[2]);
  const endMinutes = Number(match[3]) * 60 + Number(match[4]);
  return Math.max(1, endMinutes - startMinutes) * 60 * 1000;
}
function isSessionHappening(startsAt: unknown, time: string) {
  if (!startsAt) return false;
  const start = new Date(startsAt as string).getTime();
  const now = Date.now();
  return now >= start && now < start + sessionDurationMs(time);
}
function fullSessionTitle(event: { title: string; detail?: string }) {
  return event.detail ? `${event.title} — ${event.detail}` : event.title;
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
function createArabicTitle(title: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 230;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.direction = "rtl";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#173f39";
  context.font = "bold 62px Arial, sans-serif";
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > 1080 && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  const visibleLines = lines.slice(0, 2);
  visibleLines.forEach((text, index) =>
    context.fillText(
      text,
      600,
      visibleLines.length === 1 ? 115 : 78 + index * 78,
    ),
  );
  return canvas.toDataURL("image/png");
}

export default function AdminAttendancePage() {
  const { user, isLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/admin/login",
  });
  const canManageAttendance =
    user?.role === "admin" &&
    (user.adminRole !== "interview_admin" ||
      user.adminPermissions?.includes("attendance"));
  const utils = trpc.useUtils();
  const sessions = trpc.attendance.listSessions.useQuery(undefined, {
    enabled: canManageAttendance,
    retry: false,
    refetchInterval: 10000,
  });
  const [qr, setQr] = useState<QrPreview | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [expandedDays, setExpandedDays] = useState<Set<number>>(() => {
    const start = new Date(`${PROGRAMME_START_DATE}T00:00:00${PROGRAMME_TIMEZONE_OFFSET}`).getTime();
    const currentDay = Math.floor((Date.now() - start) / 86_400_000) + 1;
    return new Set([currentDay >= 1 && currentDay <= programmeDays.length ? currentDay : 1]);
  });
  const attendance = trpc.attendance.sessionAttendance.useQuery(
    { sessionId: attendanceSession?.id ?? 0 },
    {
      enabled: Boolean(attendanceSession),
      retry: false,
      refetchInterval: attendanceSession ? 10000 : false,
    },
  );
  const sessionByKey = useMemo(
    () =>
      new Map((sessions.data ?? []).map((item) => [item.scheduleKey, item])),
    [sessions.data],
  );
  const openSessions = useMemo(
    () => (sessions.data ?? []).filter((session) => Boolean(session.isOpen)),
    [sessions.data],
  );
  const programmeTitleByKey = useMemo(() => {
    const titles = new Map<string, string>();
    programmeDays.forEach((day, dayIndex) =>
      day.events.forEach((event, eventIndex) => {
        const title = fullSessionTitle(event);
        titles.set(stableScheduleKey(dayIndex + 1, event.time), title);
        titles.set(`d${dayIndex + 1}-e${eventIndex + 1}`, title);
      }),
    );
    return titles;
  }, []);
  const programmeSessions = useMemo(
    () =>
      programmeDays.flatMap((day, dayIndex) =>
        day.events.map((event, eventIndex) => {
          const stableKey = stableScheduleKey(dayIndex + 1, event.time);
          const legacyKey = `d${dayIndex + 1}-e${eventIndex + 1}`;
          const saved =
            sessionByKey.get(stableKey) ?? sessionByKey.get(legacyKey);
          return {
            scheduleKey: saved?.scheduleKey ?? stableKey,
            title: fullSessionTitle(event),
            dayNumber: dayIndex + 1,
            timeLabel: event.time,
            startsAt: sessionStartIso(dayIndex + 1, event.time),
          };
        }),
      ),
    [sessionByKey],
  );

  async function showQr(sessionId: number, title: string, token: string) {
    const url = `${window.location.origin}/presence/session/${token}`;
    const image = await QRCode.toDataURL(url, {
      width: 900,
      margin: 3,
      errorCorrectionLevel: "H",
      color: { dark: "#173f39", light: "#ffffff" },
    });
    setQr({ sessionId, title, url, image });
  }
  const open = trpc.attendance.openSession.useMutation({
    onSuccess: async (data, input) => {
      await showQr(data.id, input.title, data.token);
      await utils.attendance.listSessions.invalidate();
      toast.success("تم فتح تسجيل الحضور");
    },
    onError: (error) => toast.error(error.message),
  });
  const close = trpc.attendance.closeSession.useMutation({
    onSuccess: async (_, input) => {
      if (qr?.sessionId === input.id) setQr(null);
      toast.success("تم إغلاق تسجيل الحضور");
      await Promise.all([
        utils.attendance.listSessions.invalidate(),
        utils.attendance.sessionAttendance.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const delay = trpc.attendance.setSessionDelay.useMutation({
    onSuccess: async (_, input) => {
      toast.success(
        input.delayMinutes
          ? `تم اعتماد تأخير ${input.delayMinutes} دقيقة`
          : "تم إلغاء التأخير",
      );
      await Promise.all([
        utils.attendance.listSessions.invalidate(),
        utils.attendance.sessionAttendance.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const prepare = trpc.attendance.prepareSessions.useMutation({
    onError: (error) => toast.error(error.message),
  });
  const manual = trpc.attendance.setManualAttendance.useMutation({
    onSuccess: async () => {
      toast.success("تم تصحيح الحضور وتسجيل العملية");
      await Promise.all([
        attendance.refetch(),
        utils.attendance.listSessions.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  async function downloadAllQr() {
    const prepared = await prepare.mutateAsync({ sessions: programmeSessions });
    const zip = new JSZip();
    await Promise.all(
      prepared.map(async (session) => {
        const url = `${window.location.origin}/presence/session/${session.token}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 900,
          margin: 3,
          errorCorrectionLevel: "H",
        });
        zip.file(
          `session-${session.id}-${session.scheduleKey}.png`,
          dataUrl.split(",")[1],
          { base64: true },
        );
      }),
    );
    downloadBlob(
      await zip.generateAsync({ type: "blob" }),
      "qr-presence-edition-18.zip",
    );
    await sessions.refetch();
    toast.success("تم تحميل جميع رموز QR");
  }
  async function downloadQrPdf() {
    const prepared = await prepare.mutateAsync({ sessions: programmeSessions });
    const template = await loadImage("/images/attendance-qr-template.png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [1414, 2000],
      hotfixes: ["px_scaling"],
      compress: true,
    });
    for (let index = 0; index < prepared.length; index += 1) {
      const session = prepared[index];
      if (index > 0) pdf.addPage([1414, 2000], "portrait");
      const url = `${window.location.origin}/presence/session/${session.token}`;
      const qrImage = await QRCode.toDataURL(url, {
        width: 900,
        margin: 3,
        errorCorrectionLevel: "H",
        color: { dark: "#173f39", light: "#ffffff" },
      });
      pdf.addImage(
        template,
        "PNG",
        0,
        0,
        1414,
        2000,
        "attendance-template",
        "FAST",
      );
      pdf.addImage(
        createArabicTitle(session.title),
        "PNG",
        107,
        350,
        1200,
        230,
        undefined,
        "FAST",
      );
      pdf.addImage(qrImage, "PNG", 382, 590, 650, 650, undefined, "FAST");
    }
    pdf.save("qr-presence-edition-18.pdf");
    await sessions.refetch();
    toast.success("تم تحميل ملف PDF لجميع رموز QR");
  }
  function exportCsv() {
    if (!attendance.data || !attendanceSession) return;
    const rows = [
      ...attendance.data.present.map((candidate) => ({
        ...candidate,
        status: "Présent",
      })),
      ...attendance.data.absent.map((candidate) => ({
        ...candidate,
        status: attendance.data.session?.isOpen ? "Non pointé" : "Absent",
      })),
    ];
    const csv = [
      "Nom,Prénom,Email,Téléphone,Statut,Heure de pointage (Maroc)",
      ...rows.map((row) =>
        [
          row.lastName,
          row.firstName,
          row.email,
          row.phoneNumber,
          row.status,
          row.checkedInAt
            ? formatMoroccoDateTime(row.checkedInAt as string)
            : "",
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n");
    downloadBlob(
      new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
      `presence-session-${attendanceSession.id}.csv`,
    );
  }
  const normalizedSearch = search.trim().toLowerCase();
  const filterCandidates = (items: CandidateRow[]) =>
    !normalizedSearch
      ? items
      : items.filter((candidate) =>
          `${candidate.firstName} ${candidate.lastName} ${candidate.email}`
            .toLowerCase()
            .includes(normalizedSearch),
        );
  const actionLabels: Record<string, string> = {
    open: "فتح الحضور",
    close: "إغلاق الحضور",
    manual_add: "إضافة حضور يدوياً",
    manual_remove: "إلغاء حضور يدوياً",
    delay_update: "تعديل تأخير الحصة",
  };
  const orderedProgrammeDays = programmeDays
    .map((day, dayIndex) => {
      const events = day.events
        .map((event, eventIndex) => {
          const stableKey = stableScheduleKey(dayIndex + 1, event.time);
          const legacyKey = `d${dayIndex + 1}-e${eventIndex + 1}`;
          const saved = sessionByKey.get(stableKey) ?? sessionByKey.get(legacyKey);
          return { event, eventIndex, isCurrent: isSessionHappening(saved?.startsAt, event.time) };
        })
        .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || a.eventIndex - b.eventIndex);
      return { day, dayIndex, events, hasCurrent: events.some((item) => item.isCurrent) };
    })
    .sort((a, b) => Number(b.hasCurrent) - Number(a.hasCurrent) || a.dayIndex - b.dayIndex);

  if (isLoading) return <div className="p-20 text-center">Chargement…</div>;
  if (!canManageAttendance)
    return (
      <Navigate
        to={
          user?.adminRole === "interview_admin"
            ? "/admin/profile"
            : "/admin/login"
        }
        replace
      />
    );
  return (
    <div
      className="min-h-screen bg-slate-50 p-2 sm:p-4 md:p-8"
      lang="ar"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-[linear-gradient(125deg,#102f2b,#4A9B8E)] p-4 text-white sm:rounded-3xl sm:p-7">
          <div className="flex flex-wrap gap-2">
            {user?.adminRole === "interview_admin" ? (
              <Link to="/admin/profile">
                <Button className="bg-white text-[#173f39] hover:bg-white/90">
                  <ArrowLeft className="ml-2 h-4 w-4" />
                  الملف الشخصي
                </Button>
              </Link>
            ) : (
              <Link to="/admin/final-candidates">
                <Button className="bg-white text-[#173f39] hover:bg-white/90">
                  <ArrowLeft className="ml-2 h-4 w-4" />
                  المرشحون النهائيون
                </Button>
              </Link>
            )}
            {user?.adminRole !== "interview_admin" ||
            user.adminPermissions?.includes("scores") ? (
              <Link to="/admin/scores">
                <Button className="bg-amber-300 text-slate-950 hover:bg-amber-200">
                  <Award className="ml-2 h-4 w-4" />
                  إدارة النقاط
                </Button>
              </Link>
            ) : null}
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              disabled={prepare.isPending}
              onClick={downloadAllQr}
            >
              <FileArchive className="ml-2 h-4 w-4" />
              {prepare.isPending ? "جارٍ التحضير…" : "تحميل جميع رموز QR"}
            </Button>
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              disabled={prepare.isPending}
              onClick={downloadQrPdf}
            >
              <Download className="ml-2 h-4 w-4" />
              تحميل QR بصيغة PDF
            </Button>
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => sessions.refetch()}
            >
              <RefreshCw className="ml-2 h-4 w-4" />
              تحديث
            </Button>
          </div>
          <h1 className="mt-6 text-3xl font-black">إدارة الحضور عبر QR Code</h1>
          <p className="mt-2 text-white/75">
            لكل حصة رمز واحد وثابت، صالح لجميع المشاركين المؤكدين أثناء فتح
            الحضور.
          </p>
        </header>
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-black text-slate-700">
              الحصص المفتوحة الآن:
            </span>
            {openSessions.length ? (
              openSessions.map((session) => {
                const title =
                  programmeTitleByKey.get(session.scheduleKey) ?? session.title;
                return (
                  <Button
                    key={session.id}
                    size="sm"
                    variant={
                      qr?.sessionId === session.id ? "default" : "outline"
                    }
                    className={
                      qr?.sessionId === session.id
                        ? "bg-[#4A9B8E] hover:bg-[#3D7A6F]"
                        : ""
                    }
                    onClick={() => showQr(session.id, title, session.token)}
                  >
                    <QrCode className="ml-1 h-4 w-4" />
                    {title}
                  </Button>
                );
              })
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                لا توجد حصة مفتوحة
              </span>
            )}
          </div>
        </section>
        {qr ? (
          <section className="grid gap-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl lg:grid-cols-[360px_1fr] lg:items-center">
            <img
              src={qr.image}
              alt={`QR Code ${qr.title}`}
              className="mx-auto w-full max-w-[340px]"
            />
            <div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
                رمز الحصة
              </span>
              <h2 className="mt-4 text-3xl font-black">{qr.title}</h2>
              <p className="mt-3 break-all text-sm text-slate-500" dir="ltr">
                {qr.url}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={qr.image}
                  download={`qr-presence-session-${qr.sessionId}.png`}
                >
                  <Button>
                    <Download className="ml-2 h-4 w-4" />
                    تحميل QR
                  </Button>
                </a>
                <a href={qr.url} target="_blank" rel="noreferrer">
                  <Button variant="outline">
                    <ExternalLink className="ml-2 h-4 w-4" />
                    فتح الرابط
                  </Button>
                </a>
                <Button variant="ghost" onClick={() => setQr(null)}>
                  <X className="ml-2 h-4 w-4" />
                  إخفاء
                </Button>
              </div>
            </div>
          </section>
        ) : null}
        {attendanceSession && attendance.data ? (
          <section className="rounded-3xl border bg-white p-6 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">متابعة الحضور والغياب</h2>
                <p className="mt-1 text-slate-500">{attendanceSession.title}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 font-black text-emerald-800">
                    {attendance.data.present.length} حاضر /{" "}
                    {attendance.data.total} مشارك
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    الفتح:{" "}
                    {attendance.data.session?.openedAt
                      ? formatMoroccoDateTime(attendance.data.session.openedAt)
                      : "—"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    الإغلاق:{" "}
                    {attendance.data.session?.closedAt
                      ? formatMoroccoDateTime(attendance.data.session.closedAt)
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportCsv}>
                  <Download className="ml-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={() => attendance.refetch()}>
                  <RefreshCw className="ml-2 h-4 w-4" />
                  تحديث
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setAttendanceSession(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="relative mt-5">
              <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                className="pr-10"
                placeholder="البحث بالاسم أو البريد الإلكتروني…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <CandidateAttendanceList
                title={`الحاضرون (${filterCandidates(attendance.data.present).length})`}
                candidates={filterCandidates(attendance.data.present)}
                present
                busy={manual.isPending}
                onToggle={(id) =>
                  manual.mutate({
                    sessionId: attendanceSession.id,
                    finalCandidateId: id,
                    present: false,
                  })
                }
              />
              <CandidateAttendanceList
                title={`${attendance.data.session?.isOpen ? "غير المسجلين بعد" : "الغائبون"} (${filterCandidates(attendance.data.absent).length})`}
                candidates={filterCandidates(attendance.data.absent)}
                busy={manual.isPending}
                onToggle={(id) =>
                  manual.mutate({
                    sessionId: attendanceSession.id,
                    finalCandidateId: id,
                    present: true,
                  })
                }
              />
            </div>
            <div className="mt-6 rounded-2xl border">
              <h3 className="flex items-center gap-2 bg-slate-50 px-4 py-3 font-black">
                <History className="h-4 w-4" />
                سجل العمليات
              </h3>
              <div className="max-h-56 divide-y overflow-auto">
                {attendance.data.logs.length ? (
                  attendance.data.logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-wrap justify-between gap-2 p-3 text-sm"
                    >
                      <span>
                        <b>{log.adminName}</b> —{" "}
                        {actionLabels[log.action] ?? log.action}
                        {log.details?.startsWith("delay:")
                          ? ` (${log.details.split("->")[1]} دقيقة)`
                          : ""}
                        {log.firstName
                          ? `: ${log.firstName} ${log.lastName}`
                          : ""}
                      </span>
                      <span dir="ltr" className="text-slate-500">
                        {formatMoroccoDateTime(log.createdAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-slate-500">
                    لا توجد عمليات مسجلة.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : attendanceSession ? (
          <section className="rounded-3xl border bg-white p-10 text-center">
            جارٍ تحميل اللوائح…
          </section>
        ) : null}
        <div className="space-y-6">
          {orderedProgrammeDays.map(({ day, dayIndex, events, hasCurrent }) => (
            <section
              key={day.day}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${hasCurrent ? "border-emerald-400 ring-2 ring-emerald-100" : ""}`}
            >
              <button
                type="button"
                className={`flex w-full items-center justify-between p-4 text-right ${hasCurrent ? "bg-emerald-50" : "bg-slate-100"}`}
                onClick={() => setExpandedDays((current) => { const next = new Set(current); if (next.has(dayIndex + 1)) next.delete(dayIndex + 1); else next.add(dayIndex + 1); return next; })}
              >
                <span><span className="text-xl font-black">{day.day}</span>{hasCurrent ? <span className="mr-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">جلسة جارية الآن</span> : null}</span>
                <span className="flex items-center gap-3 text-sm text-slate-500">{day.events.length} حصص<ChevronDown className={`h-5 w-5 transition ${expandedDays.has(dayIndex + 1) ? "rotate-180" : ""}`} /></span>
              </button>
              {expandedDays.has(dayIndex + 1) ? <div className="divide-y">
                {events.map(({ event, eventIndex, isCurrent }) => {
                  const stableKey = stableScheduleKey(dayIndex + 1, event.time);
                  const legacyKey = `d${dayIndex + 1}-e${eventIndex + 1}`;
                  const saved =
                    sessionByKey.get(stableKey) ?? sessionByKey.get(legacyKey);
                  const busy =
                    open.isPending || close.isPending || delay.isPending;
                  const fullTitle = fullSessionTitle(event);
                  return (
                    <div
                      key={stableKey}
                      className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${isCurrent ? "bg-emerald-50/70" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 h-3 w-3 shrink-0 rounded-full ${saved?.isOpen ? "bg-emerald-500" : "bg-slate-300"}`}
                        />
                        <div>
                          <p className="font-black">{fullTitle}{isCurrent ? <span className="mr-2 rounded-full bg-emerald-600 px-2 py-1 text-xs text-white">الآن</span> : null}</p>
                          <p className="mt-1 text-sm text-slate-500" dir="ltr">
                            {event.time}
                          </p>
                          {saved ? (
                            <p className="mt-1 text-xs text-slate-400">
                              {saved.isOpen
                                ? `مفتوحة منذ ${formatMoroccoTime(saved.openedAt)}`
                                : saved.closedAt
                                  ? `أغلقت في ${formatMoroccoTime(saved.closedAt)}`
                                  : "لم تفتح بعد"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {saved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            <Users className="h-3.5 w-3.5" />
                            {saved.attendanceCount} حاضر
                          </span>
                        ) : null}
                        {saved?.delayMinutes ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                            تأخير {saved.delayMinutes} د
                          </span>
                        ) : null}
                        {saved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={delay.isPending}
                            onClick={() => {
                              const value = window.prompt(
                                "أدخل مدة التأخير بالدقائق (من 0 إلى 240)",
                                String(saved.delayMinutes ?? 0),
                              );
                              if (value === null) return;
                              const minutes = Number(value);
                              if (
                                !Number.isInteger(minutes) ||
                                minutes < 0 ||
                                minutes > 240
                              ) {
                                toast.error(
                                  "يرجى إدخال عدد صحيح بين 0 و240 دقيقة",
                                );
                                return;
                              }
                              delay.mutate({
                                id: saved.id,
                                delayMinutes: minutes,
                              });
                            }}
                          >
                            التأخير
                          </Button>
                        ) : null}
                        {saved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              showQr(saved.id, fullTitle, saved.token)
                            }
                          >
                            <QrCode className="ml-1 h-4 w-4" />
                            QR
                          </Button>
                        ) : null}
                        {saved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAttendanceSession({
                                id: saved.id,
                                title: fullTitle,
                              });
                              setSearch("");
                            }}
                          >
                            <Eye className="ml-1 h-4 w-4" />
                            اللائحة
                          </Button>
                        ) : null}
                        {saved?.isOpen ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            onClick={() =>
                              window.confirm(
                                "هل أنتم متأكدون من إغلاق تسجيل الحضور لهذه الحصة؟",
                              ) && close.mutate({ id: saved.id })
                            }
                          >
                            <Square className="ml-1 h-4 w-4" />
                            إغلاق
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-emerald-700 hover:bg-emerald-800"
                            disabled={busy}
                            onClick={() =>
                              open.mutate({
                                scheduleKey: saved?.scheduleKey ?? stableKey,
                                title: fullTitle,
                                dayNumber: dayIndex + 1,
                                timeLabel: event.time,
                                startsAt: sessionStartIso(
                                  dayIndex + 1,
                                  event.time,
                                ),
                              })
                            }
                          >
                            <CheckCircle2 className="ml-1 h-4 w-4" />
                            {open.isPending ? "جارٍ الفتح…" : "فتح"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div> : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function CandidateAttendanceList({
  title,
  candidates,
  present = false,
  busy,
  onToggle,
}: {
  title: string;
  candidates: CandidateRow[];
  present?: boolean;
  busy: boolean;
  onToggle: (id: number) => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${present ? "border-emerald-200" : "border-amber-200"}`}
    >
      <h3
        className={`px-4 py-3 font-black ${present ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
      >
        {title}
      </h3>
      {candidates.length ? (
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b">
                <th className="p-3">الاسم الكامل</th>
                <th className="p-3">البريد الإلكتروني</th>
                {present ? <th className="p-3">وقت المسح (المغرب)</th> : null}
                <th className="p-3">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="border-b last:border-0">
                  <td className="p-3 font-bold">
                    {candidate.firstName} {candidate.lastName}
                  </td>
                  <td className="p-3" dir="ltr">
                    {candidate.email}
                  </td>
                  {present ? (
                    <td
                      className="whitespace-nowrap p-3 font-bold text-emerald-700"
                      dir="ltr"
                    >
                      {candidate.checkedInAt
                        ? formatMoroccoTime(candidate.checkedInAt as string)
                        : "—"}
                    </td>
                  ) : null}
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant={present ? "destructive" : "outline"}
                      disabled={busy}
                      onClick={() =>
                        (!present ||
                          window.confirm(
                            `هل أنتم متأكدون من إلغاء حضور ${candidate.firstName} ${candidate.lastName}؟`,
                          )) &&
                        onToggle(candidate.id)
                      }
                    >
                      {present ? (
                        <UserMinus className="ml-1 h-4 w-4" />
                      ) : (
                        <UserPlus className="ml-1 h-4 w-4" />
                      )}
                      {present ? "إلغاء" : "إضافة"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-6 text-center text-slate-500">
          لا يوجد أي اسم في هذه اللائحة.
        </p>
      )}
    </div>
  );
}
