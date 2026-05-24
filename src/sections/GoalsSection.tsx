import { motion } from "framer-motion";
import { GraduationCap, Lightbulb, Globe, Users, BookOpen, Shield } from "lucide-react";

const goals = [
  {
    icon: GraduationCap,
    title: "التأهيل العلمي",
    description:
      "تمكين الطلبة والخريجين من المعارف والمهارات التي تساعدهم على التميز الأكاديمي والمهني، ومواكبة التحولات المتسارعة في مختلف المجالات.",
  },
  {
    icon: Users,
    title: "بناء شبكات العلاقات",
    description:
      "خلق جسور للتواصل والتعاون بين الطلبة والخريجين والمؤسسات، بما يعزز فرص التطور المهني وتبادل الخبرات.",
  },
  {
    icon: Lightbulb,
    title: "تعزيز الهوية",
    description:
      "ترسيخ قيم الهوية الوطنية والأخلاق والمسؤولية في نفوس الشباب، وبناء وعي متوازن يجمع بين الأصالة والانفتاح.",
  },
  {
    icon: BookOpen,
    title: "التكوين المستمر",
    description:
      "توفير برامج تكوينية فكرية وتربوية ومهارية مواكبة لاحتياجات السفراء لتعميق معارف الأكاديمية.",
  },
  {
    icon: Globe,
    title: "فتح الآفاق",
    description:
      "توسيع مدارك الطلبة والخريجين وتعزيز انخراطهم في قضايا الوطن والأمة، وتشجيعهم على المبادرة والإبداع.",
  },
  {
    icon: Shield,
    title: "الإصلاح الرسالي",
    description:
      "المساهمة في ترسيخ مشروع إصلاحي فكري وتربوي قائم على الوعي، والقيم، والعمل المسؤول.",
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
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">أهدافنا</h2>
          <p className="mt-4 max-w-3xl mx-auto text-gray-600 leading-relaxed">
            نسعى في مؤسسة أطر الغد إلى بناء جيل واعٍ ومسؤول، يجمع بين الكفاءة العلمية والالتزام القيمي
          </p>
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
