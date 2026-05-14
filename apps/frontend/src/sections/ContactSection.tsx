import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const submitMutation = trpc.contact.submit.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال رسالتك بنجاح!");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال الرسالة");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    submitMutation.mutate(formData);
  };

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1 bg-[#4A9B8E]/10 text-[#4A9B8E] rounded-full text-sm font-medium mb-4">
            اتصل بنا
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">تواصل معنا</h2>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto">
            نحن هنا للإجابة على استفساراتك. لا تتردد في التواصل معنا
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-[#F8FAF9] rounded-xl">
                <div className="p-3 bg-[#4A9B8E]/10 rounded-xl">
                  <Mail className="w-5 h-5 text-[#4A9B8E]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">البريد الإلكتروني</h3>
                  <p className="text-gray-600 text-sm">contact@atralghad.org</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-[#F8FAF9] rounded-xl">
                <div className="p-3 bg-[#4A9B8E]/10 rounded-xl">
                  <Phone className="w-5 h-5 text-[#4A9B8E]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">رقم الهاتف</h3>
                  <p className="text-gray-600 text-sm">+212 5XX-XXXXXX</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-[#F8FAF9] rounded-xl">
                <div className="p-3 bg-[#4A9B8E]/10 rounded-xl">
                  <MapPin className="w-5 h-5 text-[#4A9B8E]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">العنوان</h3>
                  <p className="text-gray-600 text-sm">المملكة المغربية</p>
                </div>
              </div>

              <div className="pt-4">
                <h3 className="font-bold text-gray-900 mb-4">تابعنا على</h3>
                <div className="flex items-center gap-3">
                  <a href="#" className="p-3 bg-[#4A9B8E]/10 rounded-xl hover:bg-[#4A9B8E]/20 transition-colors">
                    <Facebook className="w-5 h-5 text-[#4A9B8E]" />
                  </a>
                  <a href="#" className="p-3 bg-[#4A9B8E]/10 rounded-xl hover:bg-[#4A9B8E]/20 transition-colors">
                    <Instagram className="w-5 h-5 text-[#4A9B8E]" />
                  </a>
                  <a href="#" className="p-3 bg-[#4A9B8E]/10 rounded-xl hover:bg-[#4A9B8E]/20 transition-colors">
                    <Youtube className="w-5 h-5 text-[#4A9B8E]" />
                  </a>
                  <a href="#" className="p-3 bg-[#4A9B8E]/10 rounded-xl hover:bg-[#4A9B8E]/20 transition-colors">
                    <Linkedin className="w-5 h-5 text-[#4A9B8E]" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="اسمك الكامل"
                    className="text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    type="email"
                    className="text-right"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+212..."
                    className="text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموضوع *</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="موضوع الرسالة"
                    className="text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الرسالة *</label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="اكتب رسالتك هنا..."
                  rows={5}
                  className="text-right"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#4A9B8E] hover:bg-[#3D7A6F] text-white"
                disabled={submitMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {submitMutation.isPending ? "جاري الإرسال..." : "إرسال الرسالة"}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
