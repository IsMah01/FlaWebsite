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
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">لأن نهضة الأوطان تبدأ ببناء الإنسان</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <p className="text-gray-600 leading-loose text-lg mb-6">
              مؤسسة أطر الغد مؤسسة مغربية تُوجّه برامجها وأنشطتها إلى طلبة وخريجي المعاهد والمدارس العليا،
              إضافة إلى طلبة وخريجي كليات الطب والصيدلة.
            </p>
            <p className="text-gray-600 leading-loose text-lg mb-6">
              تعمل المؤسسة على إعداد شباب مغربي متوازن، يجمع بين الكفاءة العلمية والنضج الفكري
              والمسؤولية المجتمعية، ويعتز بهويته الوطنية وقيمه الأصيلة.
            </p>
            <p className="text-gray-600 leading-loose text-lg mb-6">
              كما تسعى إلى تمكين أعضائها من المعارف والمهارات الضرورية التي تؤهلهم للنجاح الأكاديمي
              والمهني والاجتماعي، ضمن رؤية تجعل من الإنسان محوراً أساسياً في مشروع النهضة.
            </p>
            <p className="text-gray-600 leading-loose text-lg">
              نؤمن بأن بناء جيل قوي في فكره، راسخ في قيمه، ومؤمن برسالته، هو السبيل الحقيقي
              لبناء وطن متقدم ومجتمع أكثر وعياً وتأثيراً.
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
                    تأهيل كفاءات مغربية قادرة على الإسهام الفعّال في تنمية الوطن ونهضة الأمة، عبر التكوين الفكري والمهاري.
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
                    بناء جيل رائد، يجمع بين الكفاءة العلمية والالتزام القيمي، ويساهم في تحقيق نهضة حضارية شاملة.
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed mt-2">
                    تأهيل إطار قوي أمين، قادر على الإسهام في تحقيق حلم النهضة والارتقاء بالوطن وخدمة المجتمع.
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
                  <ul className="text-gray-600 text-sm leading-relaxed space-y-1">
                    <li>الصدق والأمانة</li>
                    <li>حب الوطن والاعتزاز بالهوية</li>
                    <li>التميز العلمي</li>
                    <li>المسؤولية والانضباط</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
