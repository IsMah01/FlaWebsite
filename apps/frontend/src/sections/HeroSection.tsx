import { Link } from "react-router";
import { motion } from "framer-motion";
import { BookOpen, Briefcase, Building2, ChevronDown, LayoutDashboard, School, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewerSession } from "@/hooks/useViewerSession";

const heroStats = [
  { icon: Briefcase, value: "5", label: "مشاريع مختلفة", sublabel: "أنشطة المؤسسة" },
  { icon: Users, value: "+2K", label: "سفير", sublabel: "أكاديمية أطر الغد" },
  { icon: Building2, value: "+40", label: "مؤسسة جامعية", sublabel: "بمختلف التخصصات" },
  { icon: School, value: "17", label: "دورة", sublabel: "أكاديمية أطر الغد" },
];

const internalHighlights = [
  {
    title: "مسارك داخل المؤسسة",
    description: "تابع تقدمك، وكن على اطلاع بالبرامج التكوينية التي تشارك فيها.",
  },
  {
    title: "الأنشطة والفعاليات",
    description: "اكتشف اللقاءات، الورشات، والدورات التي تساعدك على تطوير مهاراتك العلمية والشخصية.",
  },
  {
    title: "الأخبار والمستجدات",
    description: "كن أول من يعلم جديد المؤسسة ومواعيد الأنشطة القادمة.",
  },
  {
    title: "فضاء التفاعل",
    description: "تواصل مع السفراء، وكن جزءًا من شبكة الأقوياء الأمناء.",
  },
];

export default function HeroSection() {
  const { isAuthenticated, viewer, hasAmbassadorView } = useViewerSession();
  const isAdmin = viewer?.kind === "site-user" && viewer.role === "admin";
  const isInternalView = hasAmbassadorView || isAdmin;
  const nextSectionId = isInternalView ? "activities" : "about";

  return (
    <section id="hero" className="relative flex min-h-[100svh] items-center justify-center overflow-hidden gradient-primary">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#6BC4B2] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-20 text-center sm:py-24">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <img src="/images/logo.png" alt="Fondation" className="h-20 sm:h-24 md:h-32 w-auto mx-auto mb-5 md:mb-6 drop-shadow-lg" />
        </motion.div>

        {isInternalView ? (
          <>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 md:mb-5 text-shadow">
              مرحبًا بك داخل مؤسسة أطر الغد
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.35 }} className="text-sm sm:text-base md:text-lg text-white/90 mb-4 max-w-4xl mx-auto leading-8 md:leading-loose">
              يسعدنا أن تكون جزءًا من فضاءٍ يؤمن بأن الإنسان هو أساس النهضة، وأن التغيير الحقيقي يبدأ من بناء الوعي، وصناعة الكفاءة، وترسيخ القيم.
            </motion.p>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="text-sm sm:text-base md:text-lg text-white/95 mb-7 md:mb-8 max-w-3xl mx-auto leading-relaxed font-bold">
              هنا لا نكتفي بالانتماء، بل نشرع في العمل.
            </motion.p>
          </>
        ) : (
          <>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 text-shadow">
              مؤسسة أطر الغد
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.35 }} className="text-sm md:text-lg text-white/90 mb-5 max-w-3xl mx-auto leading-relaxed font-bold">
              لأن بناء الإنسان هو أول خطوة نحو بناء الوطن ونهضة الأمة
            </motion.p>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="text-sm sm:text-base md:text-lg text-white/90 mb-7 md:mb-8 max-w-4xl mx-auto leading-8 md:leading-loose">
              مؤسسة مغربية تُوجّه أنشطتها أساسًا إلى طلبة وخريجي المعاهد العليا، من مهندسين ومسيرين وأطباء، ترمي إلى تأهيل شباب مغربي معتز بهويته، حامل لقيم الصدق والأمانة وحب الوطن، قوي في تخصصه العلمي، وممتلك للمعارف الضرورية، من أجل بناء جيل قادر على تحقيق حلم النهضة، والارتقاء بالوطن إلى أعلى المراتب الحضارية
            </motion.p>
          </>
        )}

        {!isAuthenticated ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.65 }} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-[#4A9B8E] hover:bg-white/90 font-semibold px-8">
                <Users className="w-5 h-5 mr-2" />
                انضم إلينا
              </Button>
            </Link>
            <button onClick={() => document.getElementById(nextSectionId)?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg border-2 border-white/50 text-white hover:bg-white/10 transition-colors font-semibold">
              <BookOpen className="w-5 h-5" />
              اكتشف المزيد
            </button>
          </motion.div>
        ) : isAdmin ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex justify-center">
            <Link to="/admin">
              <Button size="lg" className="bg-white text-[#1f5148] hover:bg-white/90 font-semibold px-8">
                <LayoutDashboard className="w-5 h-5 mr-2" />
                لوحة الإدارة
              </Button>
            </Link>
          </motion.div>
        ) : null}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }} className="mt-9 grid grid-cols-2 md:mt-14 md:grid-cols-4 gap-3 md:gap-4">
          {heroStats.map((stat, i) => (
            <div key={i} className="rounded-2xl border border-white/20 bg-white/10 px-2.5 py-3 text-center backdrop-blur-sm md:px-3 md:py-4">
              <stat.icon className="w-6 h-6 text-white/75 mx-auto mb-2" />
              <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-xs md:text-sm text-white/90 font-semibold">{stat.label}</div>
              <div className="text-[11px] md:text-xs text-white/65 mt-1">{stat.sublabel}</div>
            </div>
          ))}
        </motion.div>

        {isInternalView ? (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35, duration: 0.8 }} className="mt-10 text-right">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-5 text-center">ماذا ينتظرك داخل فضاءك؟</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {internalHighlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <h3 className="text-white font-bold mb-2">▪ {item.title}</h3>
                  <p className="text-sm text-white/80 leading-7">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <button onClick={() => document.getElementById(nextSectionId)?.scrollIntoView({ behavior: "smooth" })} className="animate-bounce text-white/70 hover:text-white transition-colors">
          <ChevronDown className="w-8 h-8" />
        </button>
      </motion.div>
    </section>
  );
}
