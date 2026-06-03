import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

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
    <section className="bg-white py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] bg-[#101817] shadow-2xl shadow-[#1f5148]/15">
          <div className="relative aspect-[16/9] min-h-[280px] sm:min-h-[360px] lg:min-h-[520px]">
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/45 to-transparent" />
          </div>

          <button
            type="button"
            onClick={() => move(activeIndex - 1, "prev")}
            className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50 md:right-6 md:h-12 md:w-12"
            aria-label="الصورة السابقة"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => move(activeIndex + 1, "next")}
            className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50 md:left-6 md:h-12 md:w-12"
            aria-label="الصورة التالية"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
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
        </div>
      </div>
    </section>
  );
}
