import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
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
          <p className="text-gray-600 mt-3 max-w-3xl mx-auto leading-relaxed">
            إذا كانت لديك استفسارات، اقتراحات، أو رغبة في الانضمام إلى برامج المؤسسة وأنشطتها، يسعدنا تواصلك معنا
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                    type="email"
                    className="text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="اسمك الكامل"
                    className="text-right"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموضوع</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="موضوع الرسالة"
                    className="text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+212 6XXXXXXXX"
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الرسالة *</label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="اترك لنا رسالتك هنا .."
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
