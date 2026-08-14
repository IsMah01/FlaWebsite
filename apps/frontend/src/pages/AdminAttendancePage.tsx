import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, ExternalLink, QrCode, Square, Users } from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { programmeDays } from "./FinalCandidateProgramme";

export default function AdminAttendancePage() {
  const { user, isLoading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super_admin";
  const utils = trpc.useUtils();
  const sessions = trpc.attendance.listSessions.useQuery(undefined, { enabled: isSuperAdmin, retry: false, refetchInterval: 10000 });
  const [qr, setQr] = useState<{ title: string; url: string; image: string } | null>(null);
  const sessionByKey = useMemo(() => new Map((sessions.data ?? []).map((item) => [item.scheduleKey, item])), [sessions.data]);
  const open = trpc.attendance.openSession.useMutation({ onSuccess: async (data, input) => { const url=`${window.location.origin}/presence/session/${data.token}`; setQr({ title: input.title, url, image: await QRCode.toDataURL(url, { width: 720, margin: 2, color: { dark: "#173f39", light: "#ffffff" } }) }); await utils.attendance.listSessions.invalidate(); }, onError: (error) => toast.error(error.message) });
  const close = trpc.attendance.closeSession.useMutation({ onSuccess: async () => { setQr(null); toast.success("تم إغلاق تسجيل الحضور"); await utils.attendance.listSessions.invalidate(); } });
  if (isLoading) return <div className="p-20 text-center">Chargement…</div>; if (!isSuperAdmin) return <Navigate to="/admin" replace />;
  return <div className="min-h-screen bg-slate-50 p-4 md:p-8" lang="ar" dir="rtl"><div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl bg-[linear-gradient(125deg,#102f2b,#4A9B8E)] p-7 text-white"><Link to="/admin/final-candidates"><Button className="bg-white text-[#173f39] hover:bg-white/90"><ArrowLeft className="ml-2 h-4 w-4" />المرشحون النهائيون</Button></Link><h1 className="mt-6 text-3xl font-black">إدارة الحضور عبر QR Code</h1><p className="mt-2 text-white/75">افتحوا الحصة المطلوبة ثم اعرضوا الرمز عند مدخل القاعة.</p></header>
    {qr ? <section className="grid gap-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl lg:grid-cols-[360px_1fr] lg:items-center"><img src={qr.image} alt="QR Code" className="mx-auto w-full max-w-[340px]" /><div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">الحصة مفتوحة الآن</span><h2 className="mt-4 text-3xl font-black">{qr.title}</h2><p className="mt-3 break-all text-sm text-slate-500" dir="ltr">{qr.url}</p><a href={qr.url} target="_blank" rel="noreferrer"><Button variant="outline" className="mt-5"><ExternalLink className="ml-2 h-4 w-4" />فتح رابط التجربة</Button></a></div></section> : null}
    <div className="space-y-6">{programmeDays.map((day, dayIndex) => <section key={day.day} className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center justify-between bg-slate-100 p-4"><h2 className="text-xl font-black">{day.day}</h2><span className="text-sm text-slate-500">{day.events.length} حصص</span></div><div className="divide-y">{day.events.map((event, eventIndex) => { const key=`d${dayIndex+1}-e${eventIndex+1}`; const saved=sessionByKey.get(key); return <div key={key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{event.title}</p><p className="mt-1 text-sm text-slate-500" dir="ltr">{event.time}</p></div><div className="flex items-center gap-2">{saved ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><Users className="h-3.5 w-3.5" />{saved.attendanceCount} حاضر</span> : null}{saved?.isOpen ? <><Button size="sm" variant="outline" onClick={async () => { const url=`${window.location.origin}/presence/session/${saved.token}`; setQr({ title:event.title,url,image:await QRCode.toDataURL(url,{width:720,margin:2}) }); }}><QrCode className="ml-1 h-4 w-4" />عرض الرمز</Button><Button size="sm" variant="destructive" onClick={() => close.mutate({ id:saved.id })}><Square className="ml-1 h-4 w-4" />إغلاق</Button></> : <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => open.mutate({ scheduleKey:key,title:event.title,dayNumber:dayIndex+1,timeLabel:event.time })}><CheckCircle2 className="ml-1 h-4 w-4" />فتح الحضور</Button>}</div></div>; })}</div></section>)}</div>
  </div></div>;
}
