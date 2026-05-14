import { motion } from "framer-motion";
import { Building2, Eye, Heart } from "lucide-react";

export default function AboutSection() {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1 bg-[#4A9B8E]/10 text-[#4A9B8E] rounded-full text-sm font-medium mb-4">
            من نحن
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">تعرف على مؤسسة أطر الغد</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <p className="text-gray-600 leading-loose text-lg mb-6">
              مؤسسة أطر الغد هي مؤسسة مغربية تُوجّه أنشطتها أساساً إلى طلبة وخريجي المعاهد العليا،
              من مهندسين ومسيرين وأطر، إضافة إلى طلبة وخريجي كليات الطب والصيدلة.
            </p>
            <p className="text-gray-600 leading-loose text-lg mb-6">
              ترمي المؤسسة إلى تأهيل شباب مغربي معتز بهويته، حامل لقيم الصدق والأمانة،
              وحب الوطن، قوي في تخصصه العلمي وممتلك للمعارف الضرورية لخوض غمار
              الحياة الشخصية والمهنية والاجتماعية.
            </p>
            <p className="text-gray-600 leading-loose text-lg">
              تركّز المؤسسة على إعداد الإنسان القوي والأمين، من أجل بناء جيل قادر على تحقيق
              حلم النهضة، والارتقاء بالوطن إلى أعلى المراتب الحضارية.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="space-y-4"
          >
            <div className="bg-gradient-to-br from-[#4A9B8E]/5 to-[#6BC4B2]/5 rounded-2xl p-6 border border-[#4A9B8E]/10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#4A9B8E]/10 rounded-xl">
                  <Building2 className="w-6 h-6 text-[#4A9B8E]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">رسالتنا</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    تأهيل أطر مغربية كفؤة قادرة على المساهمة الفعالة في نهضة الوطن
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#4A9B8E]/5 to-[#6BC4B2]/5 rounded-2xl p-6 border border-[#4A9B8E]/10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#4A9B8E]/10 rounded-xl">
                  <Eye className="w-6 h-6 text-[#4A9B8E]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">رؤيتنا</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    بناء جيل قادر على تحقيق حلم النهضة والارتقاء بالوطن
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#4A9B8E]/5 to-[#6BC4B2]/5 rounded-2xl p-6 border border-[#4A9B8E]/10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#4A9B8E]/10 rounded-xl">
                  <Heart className="w-6 h-6 text-[#4A9B8E]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">قيمنا</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    الصدق، الأمانة، حب الوطن، الاعتزاز بالهوية، التميز العلمي
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
