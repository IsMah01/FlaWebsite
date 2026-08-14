import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, Download, ExternalLink, Eye, QrCode, Square, Users, X } from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { programmeDays } from "./FinalCandidateProgramme";

type QrPreview = { sessionId: number; title: string; url: string; image: string };

function stableScheduleKey(dayNumber: number, time: string) {
  return `edition18-day-${dayNumber}-slot-${time.slice(0, 5).replace(":", "")}`;
}

export default function AdminAttendancePage() {
  const { user, isLoading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super_admin";
  const utils = trpc.useUtils();
  const sessions = trpc.attendance.listSessions.useQuery(undefined, { enabled: isSuperAdmin, retry: false, refetchInterval: 10000 });
  const [qr, setQr] = useState<QrPreview | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<{ id: number; title: string } | null>(null);
  const attendance = trpc.attendance.sessionAttendance.useQuery(
    { sessionId: attendanceSession?.id ?? 0 },
    { enabled: Boolean(attendanceSession), retry: false, refetchInterval: attendanceSession ? 10000 : false },
  );
  const sessionByKey = useMemo(() => new Map((sessions.data ?? []).map((item) => [item.scheduleKey, item])), [sessions.data]);

  async function showQr(sessionId: number, title: string, token: string) {
    const url = `${window.location.origin}/presence/session/${token}`;
    const image = await QRCode.toDataURL(url, { width: 900, margin: 3, errorCorrectionLevel: "H", color: { dark: "#173f39", light: "#ffffff" } });
    setQr({ sessionId, title, url, image });
  }

  const open = trpc.attendance.openSession.useMutation({
    onSuccess: async (data, input) => {
      await showQr(data.id, input.title, data.token);
      await utils.attendance.listSessions.invalidate();
      toast.success("تم فتح تسجيل الحضور بنفس الرمز الخاص بالحصة");
    },
    onError: (error) => toast.error(error.message),
  });
  const close = trpc.attendance.closeSession.useMutation({
    onSuccess: async (_, input) => {
      if (qr?.sessionId === input.id) setQr(null);
      toast.success("تم إغلاق تسجيل الحضور");
      await utils.attendance.listSessions.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <div className="p-20 text-center">Chargement…</div>;
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  return <div className="min-h-screen bg-slate-50 p-4 md:p-8" lang="ar" dir="rtl"><div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl bg-[linear-gradient(125deg,#102f2b,#4A9B8E)] p-7 text-white"><Link to="/admin/final-candidates"><Button className="bg-white text-[#173f39] hover:bg-white/90"><ArrowLeft className="ml-2 h-4 w-4" />المرشحون النهائيون</Button></Link><h1 className="mt-6 text-3xl font-black">إدارة الحضور عبر QR Code</h1><p className="mt-2 text-white/75">لكل حصة رمز واحد وثابت، صالح لجميع المشاركين المؤكدين أثناء فتح الحضور.</p></header>

    {qr ? <section className="grid gap-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl lg:grid-cols-[360px_1fr] lg:items-center"><img src={qr.image} alt={`QR Code ${qr.title}`} className="mx-auto w-full max-w-[340px]" /><div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">رمز الحصة</span><h2 className="mt-4 text-3xl font-black">{qr.title}</h2><p className="mt-3 break-all text-sm text-slate-500" dir="ltr">{qr.url}</p><div className="mt-5 flex flex-wrap gap-2"><a href={qr.image} download={`qr-presence-session-${qr.sessionId}.png`}><Button><Download className="ml-2 h-4 w-4" />تحميل QR</Button></a><a href={qr.url} target="_blank" rel="noreferrer"><Button variant="outline"><ExternalLink className="ml-2 h-4 w-4" />فتح رابط التجربة</Button></a><Button variant="ghost" onClick={() => setQr(null)}><X className="ml-2 h-4 w-4" />إخفاء</Button></div></div></section> : null}

    {attendanceSession ? <section className="rounded-3xl border bg-white p-6 shadow-lg"><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black">لائحة الحضور</h2><p className="mt-1 text-slate-500">{attendanceSession.title}</p></div><Button variant="ghost" onClick={() => setAttendanceSession(null)}><X className="h-5 w-5" /></Button></div>{attendance.isLoading ? <p className="py-10 text-center text-slate-500">جارٍ تحميل اللائحة…</p> : attendance.data?.length ? <div className="mt-5 overflow-x-auto"><table className="w-full text-right"><thead><tr className="border-b bg-slate-50"><th className="p-3">الاسم الكامل</th><th className="p-3">البريد الإلكتروني</th><th className="p-3">الهاتف</th><th className="p-3">وقت الحضور</th></tr></thead><tbody>{attendance.data.map((person, index) => <tr key={`${person.email}-${index}`} className="border-b last:border-0"><td className="p-3 font-bold">{person.firstName} {person.lastName}</td><td className="p-3" dir="ltr">{person.email}</td><td className="p-3" dir="ltr">{person.phoneNumber}</td><td className="p-3" dir="ltr">{new Date(person.checkedInAt).toLocaleString("fr-MA")}</td></tr>)}</tbody></table></div> : <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-slate-500">لم يسجل أي مشارك حضوره بعد.</p>}</section> : null}

    <div className="space-y-6">{programmeDays.map((day, dayIndex) => <section key={day.day} className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center justify-between bg-slate-100 p-4"><h2 className="text-xl font-black">{day.day}</h2><span className="text-sm text-slate-500">{day.events.length} حصص</span></div><div className="divide-y">{day.events.map((event, eventIndex) => {
      const stableKey = stableScheduleKey(dayIndex + 1, event.time);
      const legacyKey = `d${dayIndex + 1}-e${eventIndex + 1}`;
      const saved = sessionByKey.get(stableKey) ?? sessionByKey.get(legacyKey);
      const busy = open.isPending || close.isPending;
      return <div key={stableKey} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{event.title}</p><p className="mt-1 text-sm text-slate-500" dir="ltr">{event.time}</p></div><div className="flex flex-wrap items-center gap-2">{saved ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><Users className="h-3.5 w-3.5" />{saved.attendanceCount} حاضر</span> : null}{saved ? <Button size="sm" variant="outline" onClick={() => setAttendanceSession({ id: saved.id, title: event.title })}><Eye className="ml-1 h-4 w-4" />اللائحة</Button> : null}{saved?.isOpen ? <><Button size="sm" variant="outline" onClick={() => showQr(saved.id, event.title, saved.token)}><QrCode className="ml-1 h-4 w-4" />عرض وتحميل الرمز</Button><Button size="sm" variant="destructive" disabled={busy} onClick={() => close.mutate({ id: saved.id })}><Square className="ml-1 h-4 w-4" />إغلاق</Button></> : <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={busy} onClick={() => open.mutate({ scheduleKey: saved?.scheduleKey ?? stableKey, title: event.title, dayNumber: dayIndex + 1, timeLabel: event.time })}><CheckCircle2 className="ml-1 h-4 w-4" />{open.isPending ? "جارٍ الفتح…" : "فتح الحضور"}</Button>}</div></div>;
    })}</div></section>)}</div>
  </div></div>;
}
