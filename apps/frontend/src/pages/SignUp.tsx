import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    studyStatus: "",
    phoneNumber: "",
    email: "",
    isAmbassador: false,
    password: "",
    confirmPassword: "",
    newsletterConsent: false,
    attestationUrl: "",
  });
  const [uploadingAttestation, setUploadingAttestation] = useState(false);
  const attestationRef = useRef<HTMLInputElement>(null);
  const passwordPolicyMessage = "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل وأن تحتوي على حرف كبير واحد على الأقل.";
  const passwordPattern = /^(?=.*[A-Z]).{8,}$/;

  const uploadMutation = trpc.upload.upload.useMutation();
  const registerMutation = trpc.candidateAuth.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setTimeout(() => navigate("/signin"), 3000);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء التسجيل");
    },
  });

  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("يجب أن يكون حجم الملف أقل من 5 ميغابايت");
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("نوع الملف غير مسموح. الصيغ المقبولة: PDF و JPG و PNG");
      return;
    }

    setUploadingAttestation(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const result = await uploadMutation.mutateAsync({
          fileName: file.name,
          mimeType: file.type as "application/pdf" | "image/jpeg" | "image/png",
          data: base64,
          documentType: "attestation",
        });
        setFormData((prev) => ({ ...prev, attestationUrl: result.fileRef }));
        toast.success("تم رفع شهادة التمدرس بنجاح");
      } catch {
        toast.error("حدث خطأ أثناء رفع الملف");
      } finally {
        setUploadingAttestation(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    if (!passwordPattern.test(formData.password)) {
      toast.error(passwordPolicyMessage);
      return;
    }
    if (!formData.studyStatus) {
      toast.error("يرجى اختيار الوضعية الدراسية");
      return;
    }
    registerMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      studyStatus: formData.studyStatus as any,
      attestationUrl: formData.attestationUrl || undefined,
      phoneNumber: formData.phoneNumber,
      email: formData.email.trim().toLowerCase(),
      isAmbassador: formData.isAmbassador,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      newsletterConsent: formData.newsletterConsent,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#4A9B8E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-[#4A9B8E]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">انضم إلى مؤسسة أطر الغد</h1>
              <p className="text-gray-500 text-sm mt-2">أنشئ حسابك وكن جزءًا من فضاء مؤسسة أطر الغد</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">الاسم الشخصي *</Label>
                  <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="الاسم الشخصي" required className="text-right mt-1" />
                </div>
                <div>
                  <Label htmlFor="lastName">الاسم العائلي *</Label>
                  <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="الاسم العائلي" required className="text-right mt-1" />
                </div>
              </div>

              <div>
                <Label htmlFor="studyStatus">الوضعية الدراسية *</Label>
                <Select value={formData.studyStatus} onValueChange={(v) => setFormData({ ...formData, studyStatus: v })}>
                  <SelectTrigger className="text-right mt-1">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">طالب</SelectItem>
                    <SelectItem value="graduated">خريج</SelectItem>
                    <SelectItem value="master_student">ماستر</SelectItem>
                    <SelectItem value="phd_student">دكتوراه</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>رفع شهادة التمدرس</Label>
                <input ref={attestationRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                <Button type="button" variant="outline" onClick={() => attestationRef.current?.click()} disabled={uploadingAttestation} className={`w-full mt-1 ${formData.attestationUrl ? "border-green-500 text-green-600" : ""}`}>
                  <FileText className="w-4 h-4 mr-2" />
                  {uploadingAttestation ? "جاري الرفع..." : formData.attestationUrl ? "تم رفع الملف" : "رفع شهادة التمدرس"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phoneNumber">رقم الهاتف *</Label>
                  <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder="+212XXXXXXXXX" pattern="^\+212\d{9}$" required className="text-right mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@email.com" required className="text-right mt-1" />
                </div>
              </div>

              <div className="p-4 bg-[#F8FAF9] rounded-xl">
                <Label className="mb-3 block">هل أنت سفير إحدى دورات أكاديمية أطر الغد؟</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ambassador" checked={formData.isAmbassador} onChange={() => setFormData({ ...formData, isAmbassador: true })} className="w-4 h-4 text-[#4A9B8E]" />
                    <span className="text-sm">نعم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ambassador" checked={!formData.isAmbassador} onChange={() => setFormData({ ...formData, isAmbassador: false })} className="w-4 h-4 text-[#4A9B8E]" />
                    <span className="text-sm">لا</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Label htmlFor="password">كلمة المرور *</Label>
                  <Input id="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="******" required minLength={8} pattern="(?=.*[A-Z]).{8,}" className="text-right mt-1 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-[34px] text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{passwordPolicyMessage}</p>
                </div>
                <div className="relative">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
                  <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="******" required className="text-right mt-1 pr-10" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-[34px] text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="newsletter" checked={formData.newsletterConsent} onCheckedChange={(checked) => setFormData({ ...formData, newsletterConsent: checked as boolean })} />
                <Label htmlFor="newsletter" className="text-sm font-normal text-gray-600 leading-relaxed cursor-pointer">
                  أوافق على تلقي أخبار المؤسسة عبر البريد الإلكتروني
                </Label>
              </div>

              <Button type="submit" className="w-full bg-[#4A9B8E] hover:bg-[#3D7A6F] text-white h-11" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "جاري التسجيل..." : <><CheckCircle className="w-4 h-4 mr-2" />إنشاء الحساب</>}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              لديك حساب بالفعل؟ <Link to="/signin" className="text-[#4A9B8E] hover:text-[#3D7A6F] font-medium">تسجيل الدخول</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
