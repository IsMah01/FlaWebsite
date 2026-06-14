import { motion } from "framer-motion";
import { School, Users, Building2, Award } from "lucide-react";

const stats = [
  {
    icon: School,
    value: "18",
    label: "دورة أكاديمية",
    sublabel: "أكاديمية أطر الغد",
  },
  {
    icon: Users,
    value: "2K+",
    label: "سفير",
    sublabel: "في الأكاديمية",
  },
  {
    icon: Building2,
    value: "40+",
    label: "مؤسسة جامعية",
    sublabel: "شريكة",
  },
  {
    icon: Award,
    value: "5",
    label: "برنامج رئيسي",
    sublabel: "أنشطة متنوعة",
  },
];

export default function NumbersSection() {
  return (
    <section id="numbers" className="py-14 gradient-primary relative overflow-hidden md:py-20">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#6BC4B2] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 md:mb-12"
        >
          <span className="inline-block px-4 py-1 bg-white/15 text-white rounded-full text-sm font-medium mb-4">
            الأكاديمية في أرقام
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-white text-shadow">
            إنجازاتنا بأرقام
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20 text-center"
            >
              <stat.icon className="w-7 h-7 md:w-8 md:h-8 text-white/80 mx-auto mb-3 md:mb-4" />
              <div className="text-2xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-sm text-white/90 font-medium">{stat.label}</div>
              <div className="text-xs text-white/60 mt-1">{stat.sublabel}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
