import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";

const galleryImages = [
  {
    src: "/home-gallery/academy-01.jpg",
    alt: "أكاديمية أطر الغد",
  },
  {
    src: "/home-gallery/academy-02.jpg",
    alt: "أكاديمية أطر الغد",
  },
  {
    src: "/home-gallery/dignity-caravan.jpg",
    alt: "قافلة الكرامة",
  },
  {
    src: "/home-gallery/ambassadors-forum.jpg",
    alt: "ملتقى السفراء",
  },
];

export default function HomeGallerySection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const move = (nextIndex: number, nextDirection: "next" | "prev") => {
    setDirection(nextDirection);
    setActiveIndex((nextIndex + galleryImages.length) % galleryImages.length);
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      move(activeIndex + 1, "next");
    }, 5500);

    return () => window.clearInterval(interval);
  }, [activeIndex]);

  const activeImage = galleryImages[activeIndex];

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden bg-[#101817]">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.img
          key={activeImage.src}
          src={activeImage.src}
          alt={activeImage.alt}
          custom={direction}
          initial={{ x: direction === "next" ? "100%" : "-100%", scale: 1.03, opacity: 0.95 }}
          animate={{ x: "0%", scale: 1, opacity: 1 }}
          exit={{ x: direction === "next" ? "-100%" : "100%", scale: 1.02, opacity: 0.95 }}
          transition={{ duration: 0.75, ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.18)_46%,rgba(0,0,0,0.46)_100%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-24 pb-20 text-center text-white sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl"
        >
          <img src="/images/logo.png" alt="Fondation" className="mx-auto mb-8 h-24 w-auto drop-shadow-xl md:h-32" />
          <h1 className="mb-4 text-4xl font-bold leading-tight text-white text-shadow md:text-6xl">
            مؤسسة أطر الغد
          </h1>
          <p className="mx-auto mb-6 max-w-3xl text-base font-bold leading-8 text-white md:text-xl">
            لأن بناء الإنسان هو أول خطوة نحو بناء الوطن ونهضة الأمة
          </p>
          <p className="mx-auto max-w-4xl text-base leading-9 text-white/95 md:text-xl">
            مؤسسة مغربية تُوجّه أنشطتها أساسًا إلى طلبة وخريجي المعاهد العليا، من مهندسين ومسيرين وأطباء، ترمي إلى تأهيل شباب مغربي معتز بهويته، حامل لقيم الصدق والأمانة وحب الوطن، قوي في تخصصه العلمي، وممتلك للمعارف الضرورية، من أجل بناء جيل قادر على تحقيق حلم النهضة، والارتقاء بالوطن إلى أعلى المراتب الحضارية
          </p>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={() => move(activeIndex - 1, "prev")}
        className="absolute right-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50 md:right-6 md:h-12 md:w-12"
        aria-label="الصورة السابقة"
      >
        <ArrowRight className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => move(activeIndex + 1, "next")}
        className="absolute left-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50 md:left-6 md:h-12 md:w-12"
        aria-label="الصورة التالية"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="absolute bottom-8 left-5 z-20 flex items-center gap-2 md:left-8">
        {galleryImages.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => move(index, index > activeIndex ? "next" : "prev")}
            className={`h-2.5 rounded-full transition-all ${
              index === activeIndex ? "w-9 bg-white" : "w-2.5 bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`الصورة ${index + 1}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
        className="absolute bottom-6 right-1/2 z-20 hidden translate-x-1/2 text-white/75 transition-colors hover:text-white md:block"
        aria-label="الانتقال إلى القسم التالي"
      >
        <ChevronDown className="h-8 w-8 animate-bounce" />
      </button>
    </section>
  );
}
