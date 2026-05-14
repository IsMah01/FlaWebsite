import { motion } from "framer-motion";
import { GraduationCap, Lightbulb, Globe, Users, BookOpen, Shield } from "lucide-react";

const goals = [
  {
    icon: GraduationCap,
    title: "التأهيل العلمي",
    description: "تمكين الطلبة والخريجين من المعارف والمهارات اللازمة للتفوق العلمي والمهني",
  },
  {
    icon: Lightbulb,
    title: "تعزيز الهوية",
    description: "ترسيخ قيم الهوية والأمانة والمسؤولية في نفوس الشباب",
  },
  {
    icon: Globe,
    title: "فتح الآفاق",
    description: "توسيع آفاق الطلبة وتعزيز انخراطهم في قضايا الوطن والأمة",
  },
  {
    icon: Users,
    title: "بناء الشبكات",
    description: "بناء شبكات فعالة للتواصل بين الخريجين والمؤسسات",
  },
  {
    icon: BookOpen,
    title: "التكوين المستمر",
    description: "تعميق التكوين الفكري والتربوي الذي يلقاه السفراء داخل الأكاديمية",
  },
  {
    icon: Shield,
    title: "الإصلاح الرسالي",
    description: "الاستمرارية في مشروع الإصلاح الرسالي والفكري والتربوي",
  },
];

export default function GoalsSection() {
  return (
    <section id="goals" className="py-20 bg-[#F8FAF9]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1 bg-[#4A9B8E]/10 text-[#4A9B8E] rounded-full text-sm font-medium mb-4">
            أهدافنا
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">ما نسعى لتحقيقه</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 card-hover"
            >
              <div className="p-3 bg-[#4A9B8E]/10 rounded-xl w-fit mb-4">
                <goal.icon className="w-6 h-6 text-[#4A9B8E]" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{goal.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{goal.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
