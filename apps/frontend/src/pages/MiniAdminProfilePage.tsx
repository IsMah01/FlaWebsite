import { useEffect, useState } from "react";
import { Award, CalendarClock, Camera, LogOut, QrCode, Save, ShieldCheck, UserRound } from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

const accessCards = [
  { key: "interviews", label: "إدارة المقابلات", path: "/admin/interviews", Icon: CalendarClock },
  { key: "attendance", label: "إدارة الحضور", path: "/admin/attendance", Icon: QrCode },
  { key: "scores", label: "إدارة النقاط", path: "/admin/scores", Icon: Award },
] as const;

export default function MiniAdminProfilePage() {
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/admin/login" });
  const profile = trpc.adminAuth.profile.useQuery(undefined, { enabled: user?.adminRole === "interview_admin", retry: false });
  const utils = trpc.useUtils();
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<{ mimeType: "image/jpeg" | "image/png"; data: string; preview: string } | null>(null);
  useEffect(() => { if (profile.data) setDescription(profile.data.description || ""); }, [profile.data]);
  const update = trpc.adminAuth.updateProfile.useMutation({ onSuccess: async () => { toast.success("تم حفظ الملف الشخصي"); setImage(null); await Promise.all([utils.adminAuth.profile.invalidate(), utils.auth.me.invalidate()]); }, onError: (error) => toast.error(error.message) });

  async function selectImage(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return toast.error("يرجى اختيار صورة JPG أو PNG");
    if (file.size > 2 * 1024 * 1024) return toast.error("يجب ألا يتجاوز حجم الصورة 2 ميغابايت");
    const preview = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    setImage({ mimeType: file.type as "image/jpeg" | "image/png", data: preview.split(",")[1], preview });
  }

  if (isLoading) return <div className="p-20 text-center">جارٍ التحميل…</div>;
  if (!user || user.role !== "admin") return <Navigate to="/admin/login" replace/>;
  if (user.adminRole !== "interview_admin") return <Navigate to="/admin" replace/>;
  const permissions = user.adminPermissions ?? [];
  return <main dir="rtl" lang="ar" className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-2xl bg-[linear-gradient(125deg,#102f2b,#4A9B8E)] p-5 text-white shadow-xl sm:rounded-3xl sm:p-8"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-emerald-100">فضاء المشرف</p><h1 className="mt-1 text-3xl font-black">مرحباً {user.name}</h1><p className="mt-2 text-white/70" dir="ltr">{user.email}</p></div><Button variant="outline" className="h-11 w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto" onClick={logout}><LogOut className="ml-2 h-4 w-4"/>تسجيل الخروج</Button></div></header>
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6"><h2 className="text-xl font-black">ملفي الشخصي</h2><p className="mt-1 text-sm text-slate-500">أضيفوا صورتكم ونبذة تعريفية قصيرة.</p><div className="mt-6 grid gap-8 md:grid-cols-[230px_1fr]"><div className="text-center"><div className="mx-auto h-40 w-40 overflow-hidden sm:h-48 sm:w-48 rounded-full border-4 border-white bg-emerald-50 shadow-lg">{image?.preview || profile.data?.profileImageUrl ? <img className="h-full w-full object-cover" src={image?.preview || profile.data?.profileImageUrl || ""} alt="الصورة الشخصية"/> : <UserRound className="h-full w-full p-12 text-emerald-300"/>}</div><label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-slate-50"><Camera className="h-4 w-4"/>اختيار صورة<input className="hidden" type="file" accept="image/jpeg,image/png" onChange={(event)=>{void selectImage(event.target.files?.[0]);event.target.value="";}}/></label><p className="mt-2 text-xs text-slate-400">JPG أو PNG · أقل من 2 MB</p></div><div><div className="rounded-2xl bg-slate-50 p-4"><p className="font-black">{profile.data?.name || user.name}</p><p className="mt-1 text-sm text-slate-500" dir="ltr">{profile.data?.email || user.email}</p></div><label className="mt-5 block text-sm font-bold" htmlFor="admin-description">نبذة تعريفية</label><Textarea id="admin-description" className="mt-2 min-h-36 text-right leading-7" maxLength={500} value={description} onChange={(event)=>setDescription(event.target.value)} placeholder="عرّف بنفسك، مهامك وخبراتك…"/><div className="mt-2 text-left text-xs text-slate-400">{description.length} / 500</div><Button className="mt-4 h-11 w-full bg-[#4A9B8E] hover:bg-[#3D7A6F] sm:w-auto" disabled={update.isPending} onClick={()=>update.mutate({description,image:image?{mimeType:image.mimeType,data:image.data}:undefined})}><Save className="ml-2 h-4 w-4"/>{update.isPending?"جارٍ الحفظ…":"حفظ الملف الشخصي"}</Button></div></div></section>
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6"><div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-emerald-600"/><div><h2 className="text-xl font-black">الصلاحيات المتاحة لكم</h2><p className="text-sm text-slate-500">يحدد المشرف العام الواجهات التي يمكنكم استعمالها.</p></div></div>{permissions.length ? <div className="mt-6 grid gap-4 sm:grid-cols-3">{accessCards.filter((card)=>permissions.includes(card.key)).map(({key,label,path,Icon})=><Link key={key} to={path} className="min-h-28 rounded-2xl border p-5 text-center transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"><Icon className="mx-auto h-9 w-9 text-[#4A9B8E]"/><p className="mt-3 font-black">{label}</p></Link>)}</div> : <div className="mt-6 rounded-2xl bg-amber-50 p-8 text-center text-amber-900"><ShieldCheck className="mx-auto h-10 w-10"/><p className="mt-3 font-black">لا توجد صلاحيات إضافية حالياً</p><p className="mt-1 text-sm">يمكنكم التواصل مع المشرف العام عند الحاجة.</p></div>}</section>
  </div></main>;
}
