import { Award, CalendarClock, LogOut, QrCode, ShieldCheck, UserRound } from "lucide-react";
import { Link, Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const accessCards = [
  { key: "interviews", label: "إدارة المقابلات", path: "/admin/interviews", Icon: CalendarClock },
  { key: "attendance", label: "إدارة الحضور", path: "/admin/attendance", Icon: QrCode },
  { key: "scores", label: "إدارة النقاط", path: "/admin/scores", Icon: Award },
] as const;

export default function MiniAdminProfilePage() {
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  if (isLoading) return <div className="p-20 text-center">جارٍ التحميل…</div>;
  if (!user || user.role !== "admin") return <Navigate to="/admin/login" replace/>;
  if (user.adminRole !== "interview_admin") return <Navigate to="/admin" replace/>;
  const permissions = user.adminPermissions ?? [];
  return <main dir="rtl" lang="ar" className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-4xl space-y-6"><header className="rounded-3xl bg-[linear-gradient(125deg,#102f2b,#4A9B8E)] p-8 text-white shadow-xl"><div className="flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-4"><div className="rounded-full bg-white/15 p-4"><UserRound className="h-10 w-10"/></div><div><p className="text-emerald-100">فضاء المشرف</p><h1 className="mt-1 text-3xl font-black">مرحباً {user.name}</h1><p className="mt-2 text-white/70" dir="ltr">{user.email}</p></div></div><Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={logout}><LogOut className="ml-2 h-4 w-4"/>تسجيل الخروج</Button></div></header><section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-emerald-600"/><div><h2 className="text-xl font-black">الصلاحيات المتاحة لكم</h2><p className="text-sm text-slate-500">يحدد المشرف العام الواجهات التي يمكنكم استعمالها.</p></div></div>{permissions.length ? <div className="mt-6 grid gap-4 sm:grid-cols-3">{accessCards.filter((card)=>permissions.includes(card.key)).map(({key,label,path,Icon})=><Link key={key} to={path} className="rounded-2xl border p-5 text-center transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"><Icon className="mx-auto h-9 w-9 text-[#4A9B8E]"/><p className="mt-3 font-black">{label}</p></Link>)}</div> : <div className="mt-6 rounded-2xl bg-amber-50 p-8 text-center text-amber-900"><ShieldCheck className="mx-auto h-10 w-10"/><p className="mt-3 font-black">لا توجد صلاحيات إضافية حالياً</p><p className="mt-1 text-sm">يمكنكم التواصل مع المشرف العام عند الحاجة.</p></div>}</section></div></main>;
}
