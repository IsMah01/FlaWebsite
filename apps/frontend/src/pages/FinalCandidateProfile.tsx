import { useEffect, useState } from "react";
import { ArrowRight, Camera, LockKeyhole, Save, UserRound } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/providers/trpc";

export default function FinalCandidateProfile() {
  const access = trpc.candidateAuth.finalProgrammeAccess.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<{ mimeType: "image/jpeg" | "image/png"; data: string; preview: string } | null>(null);
  useEffect(() => { if (access.data) setDescription(access.data.profileDescription || ""); }, [access.data]);
  const updateProfile = trpc.candidateAuth.updateFinalCandidateProfile.useMutation({
    onSuccess: async () => { toast.success("تم حفظ الملف الشخصي بنجاح"); setImage(null); await utils.candidateAuth.finalProgrammeAccess.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  async function selectProfileImage(file?: File) {
    if (!file) return;
    if (!(["image/jpeg", "image/png"] as string[]).includes(file.type)) { toast.error("يرجى اختيار صورة JPG أو PNG"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("يجب ألا يتجاوز حجم الصورة 2 ميغابايت"); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    setImage({ mimeType: file.type as "image/jpeg" | "image/png", data: dataUrl.split(",")[1], preview: dataUrl });
  }

  return <div className="min-h-screen bg-[#F4F8F7]" lang="ar" dir="rtl"><Navbar /><main className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6">
    {access.isLoading ? <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-[#4A9B8E] border-t-transparent" /></div> : access.isError ? <section className="mx-auto mt-12 max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm"><LockKeyhole className="mx-auto h-14 w-14 text-amber-600" /><h1 className="mt-5 text-2xl font-black">فضاء خاص بالمشاركين المؤكدين</h1><p className="mt-3 leading-8 text-slate-600">{access.error.data?.code === "UNAUTHORIZED" ? "يرجى تسجيل الدخول للوصول إلى ملفكم الشخصي." : access.error.message}</p><Link to="/signin?redirect=/espace-candidat-final/profil"><Button className="mt-6 bg-[#4A9B8E] hover:bg-[#3D7A6F]">تسجيل الدخول</Button></Link></section> : <>
      <header className="rounded-3xl bg-[linear-gradient(135deg,#173f39,#4A9B8E)] p-6 text-white shadow-lg sm:p-8"><Link to="/espace-candidat-final" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold transition hover:bg-white/20"><ArrowRight className="h-4 w-4" />العودة إلى البرنامج</Link><h1 className="mt-6 text-3xl font-black sm:text-4xl">ملفي الشخصي</h1><p className="mt-2 leading-7 text-white/80">أضيفوا صورتكم ونبذة قصيرة للتعريف بأنفسكم داخل فضاء الأكاديمية.</p></header>
      <section className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[260px_1fr] lg:items-start">
        <div className="text-center"><div className="relative mx-auto h-52 w-52 overflow-hidden rounded-full border-4 border-white bg-[#EAF7F3] shadow-xl">{image?.preview || access.data?.profileImageUrl ? <img src={image?.preview || access.data?.profileImageUrl || ""} alt="الصورة الشخصية" className="h-full w-full object-cover" /> : <UserRound className="h-full w-full p-12 text-[#4A9B8E]/45" />}</div><label className="mx-auto mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#4A9B8E]/30 bg-white px-5 py-2.5 text-sm font-bold text-[#1f5148] transition hover:bg-[#EAF7F3]"><Camera className="h-4 w-4" />اختيار صورة<input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(event) => { void selectProfileImage(event.target.files?.[0]); event.target.value = ""; }} /></label><p className="mt-2 text-xs text-slate-400">JPG أو PNG · أقل من 2 MB</p></div>
        <div><div className="rounded-2xl border border-slate-100 bg-slate-50 p-5"><p className="text-sm text-slate-500">الاسم الكامل</p><p className="mt-1 text-xl font-black text-slate-900">{access.data?.firstName} {access.data?.lastName}</p><p className="mt-2 text-sm text-slate-500" dir="ltr">{access.data?.email}</p><span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">مشارك مؤكد نهائياً</span></div><label htmlFor="profile-description" className="mt-6 block text-sm font-bold text-slate-800">نبذة تعريفية</label><Textarea id="profile-description" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="عرّف بنفسك، تخصصك، اهتماماتك وطموحاتك…" className="mt-2 min-h-40 resize-y text-right leading-7" /><div className="mt-2 flex items-center justify-between text-xs text-slate-400"><span>{description.length} / 500</span><span>يمكنكم تعديل الملف في أي وقت</span></div><Button className="mt-5 h-11 bg-[#4A9B8E] px-6 hover:bg-[#3D7A6F]" disabled={updateProfile.isPending} onClick={() => updateProfile.mutate({ description, image: image ? { mimeType: image.mimeType, data: image.data } : undefined })}><Save className="ml-2 h-4 w-4" />{updateProfile.isPending ? "جارٍ الحفظ…" : "حفظ الملف الشخصي"}</Button></div>
      </div></section>
    </>}
  </main></div>;
}
