import { useRef, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  ChevronLeft,
  Newspaper,
  Quote,
  Sparkles,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EditionsGrid from "@/components/EditionsGrid";
import CountdownCTA from "@/components/CountdownCTA";
import CountdownFloatingPopup from "@/components/CountdownFloatingPopup";
import { Button } from "@/components/ui/button";
import { activities, getActivityBySlug } from "@/data/activities";
import { useViewerSession } from "@/hooks/useViewerSession";

function HorizontalScroller({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = (direction: "prev" | "next") => {
    const node = trackRef.current;
    if (!node) return;
    const amount = Math.max(280, Math.floor(node.clientWidth * 0.82));
    node.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 md:rounded-3xl md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-6">
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByAmount("prev")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#4A9B8E]/20 bg-white text-[#1f5148] transition-colors hover:bg-[#F3F8F6]"
            aria-label="Previous"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount("next")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#4A9B8E]/20 bg-white text-[#1f5148] transition-colors hover:bg-[#F3F8F6]"
            aria-label="Next"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      {hint ? <p className="text-sm text-gray-500 mb-5">{hint}</p> : null}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 md:gap-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className="mt-5 flex md:hidden justify-center gap-2">
        <button
          type="button"
          onClick={() => scrollByAmount("prev")}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#4A9B8E]/20 bg-white px-4 text-sm font-medium text-[#1f5148]"
        >
          <ArrowLeft className="w-4 h-4" />
          السابق
        </button>
        <button
          type="button"
          onClick={() => scrollByAmount("next")}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#4A9B8E]/20 bg-white px-4 text-sm font-medium text-[#1f5148]"
        >
          التالي
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

export default function ActivityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const activity = getActivityBySlug(slug);
  const { viewer, hasAmbassadorView, isAmbassador, hasSubmittedQuestionnaire } = useViewerSession();

  if (!activity) {
    return (
      <div className="min-h-screen bg-[#F8FAF9]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">النشاط غير موجود</h1>
          <p className="text-gray-600 mb-8">تعذر العثور على صفحة النشاط المطلوبة.</p>
          <Button onClick={() => navigate("/")} className="bg-[#4A9B8E] hover:bg-[#3D7A6F]">
            <ArrowRight className="w-4 h-4 mr-2" />
            العودة إلى الرئيسية
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const isAcademy = activity.slug === "future-leaders-academy";
  const isAdmin = viewer?.kind === "site-user" && viewer.role === "admin";
  const showAcademyReminder = isAdmin || (!hasSubmittedQuestionnaire && !isAmbassador);
  const showAmbassadorLayer =
    hasAmbassadorView &&
    (activity.slug === "trustees-program" || activity.slug === "ambassadors-forum") &&
    !!activity.ambassadorContent;
  const coverImageBackgroundClass =
    activity.coverImageBackground === "dark"
      ? "bg-[#1f5148]"
      : activity.coverImageBackground === "light"
        ? "bg-white"
        : activity.coverImageBackground === "soft"
          ? "bg-[#EAF7F3]"
          : "bg-white/10";

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Navbar />

      <section className="pt-16 md:pt-20">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#1f5148_0%,#4A9B8E_55%,#9ad7cb_100%)]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-10 h-72 w-72 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#1f5148] blur-3xl" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 md:py-20 text-white">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-sm bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى الرئيسية
            </button>
            <div className="mt-6 grid gap-6 md:mt-8 md:gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
              <div className="max-w-3xl">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: `${activity.color}55` }}
              >
                <activity.icon className="w-4 h-4" />
                نشاط المؤسسة
              </div>
              <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-bold leading-tight">{activity.title}</h1>
              <p className="mt-4 md:mt-5 text-white/85 text-base md:text-lg leading-8">{activity.description}</p>
              {isAcademy ? (
                <div className="mt-8 inline-flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm border border-white/15">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12">
                    <activity.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-black leading-none">18</div>
                    <div className="text-sm text-white/80 mt-1">دورة أكاديمية</div>
                  </div>
                </div>
              ) : null}
              </div>
              {activity.coverImage ? (
                <div
                  className={`hidden overflow-hidden rounded-3xl border border-white/20 shadow-2xl lg:block ${coverImageBackgroundClass}`}
                >
                  <img
                    src={activity.coverImage}
                    alt={activity.title}
                    className={
                      activity.coverImageFit === "contain"
                        ? "h-72 w-full object-contain p-5"
                        : "h-72 w-full object-cover"
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8 md:space-y-12">
        <section className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 md:rounded-3xl md:p-8"
          >
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">تقديم النشاط</h2>
            <p className="text-sm sm:text-base text-gray-600 leading-8">{activity.intro}</p>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-[#1f5148] rounded-2xl p-5 sm:p-6 md:rounded-3xl md:p-8 text-white"
          >
            <h3 className="text-lg md:text-xl font-bold mb-5 md:mb-6">روابط الأنشطة</h3>
            <div className="space-y-3">
              {activities.map((item) => (
                <Link
                  key={item.slug}
                  to={`/activities/${item.slug}`}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-colors ${
                    item.slug === activity.slug ? "bg-white text-[#1f5148]" : "bg-white/10 hover:bg-white/15"
                  }`}
                >
                  <span className="font-medium">{item.title}</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </motion.aside>
        </section>

        {showAmbassadorLayer && activity.ambassadorContent ? (
          <section className="bg-white rounded-2xl border border-[#4A9B8E]/15 shadow-sm p-5 sm:p-6 md:rounded-3xl md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Newspaper className="w-6 h-6 text-[#4A9B8E]" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">مساحة خاصة بالسفراء</h2>
            </div>
            <p className="text-gray-600 leading-8 mb-8">{activity.ambassadorContent.intro}</p>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
              {activity.ambassadorContent.updates.map((update) => (
                <article
                  key={`${update.title}-${update.date}`}
                  className="rounded-2xl md:rounded-3xl border border-[#4A9B8E]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf8_100%)] p-5"
                >
                  <div className="inline-flex rounded-full bg-[#EAF7F3] px-3 py-1 text-xs font-semibold text-[#1f5148]">
                    {update.date}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-gray-900 leading-8">{update.title}</h3>
                  <p className="mt-3 text-gray-600 leading-8">{update.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {isAcademy && showAcademyReminder ? <CountdownCTA compact /> : null}

        {!isAcademy &&
        activity.slug !== "ambassadors-forum" &&
        activity.slug !== "trustees-program" &&
        activity.slug !== "dignity-caravan" &&
        activity.slug !== "careers-caravan" &&
        activity.highlights &&
        activity.highlights.length > 0 ? (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 md:rounded-3xl md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-[#4A9B8E]" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">أبرز اللحظات</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {activity.highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#4A9B8E]/10 bg-[#F6FBF9] p-4 text-gray-700 leading-7"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activity.videos && activity.videos.length > 0 ? (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 md:rounded-3xl md:p-8">
            <div className="grid gap-5 justify-items-center">
              {activity.videos.map((video, index) => (
                <video
                  key={video}
                  src={video}
                  controls
                  preload="metadata"
                  className="aspect-video w-full max-w-4xl rounded-xl bg-black object-cover md:rounded-2xl"
                  aria-label={`${activity.title} video ${index + 1}`}
                />
              ))}
            </div>
          </section>
        ) : null}

        {isAcademy && activity.videoUrl ? (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 md:rounded-3xl md:p-8">
            <div className="aspect-video overflow-hidden rounded-xl bg-gray-100 md:rounded-2xl">
              <iframe
                src={activity.videoUrl}
                title={activity.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        ) : null}

        {isAcademy && activity.board ? (
          <HorizontalScroller
            title="إدارة الدورة 18"
            hint=""
            icon={<Users className="w-6 h-6 text-[#4A9B8E]" />}
          >
            {activity.board.map((member) => (
              <div
                key={`${member.name ?? member.role}-${member.role}`}
                className="min-w-[260px] sm:min-w-[320px] lg:min-w-[360px] overflow-hidden rounded-2xl md:rounded-3xl border border-[#4A9B8E]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf8_100%)]"
              >
                <img
                  src={member.image}
                  alt={member.name ?? member.role}
                  className="h-64 w-full bg-[#EEF7F4] object-contain object-center p-2 sm:h-72"
                />
                <div className="p-4 sm:p-5">
                  {member.name ? (
                    <div className="text-gray-900 font-bold text-lg sm:text-xl leading-8">{member.name}</div>
                  ) : null}
                  <div className="text-gray-600 font-semibold text-base leading-7">{member.role}</div>
                </div>
              </div>
            ))}
          </HorizontalScroller>
        ) : null}

        {isAcademy ? (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 md:rounded-3xl md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <CalendarRange className="w-6 h-6 text-[#4A9B8E]" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">الدورات الست عشرة</h2>
            </div>
            <EditionsGrid
              editionNumbers={[17, 16, 15]}
              badge="أكاديمية أطر الغد"
              title="الدورات السابقة لأكاديمية أطر الغد"
              description="تم نقل جميع الدورات السابقة من الصفحة الرئيسية إلى هذه الصفحة حتى تبقى تجربة التصفح أكثر تركيزا على الأنشطة."
            />
          </section>
        ) : null}

        {isAcademy && activity.feedback ? (
          <HorizontalScroller
            title="أنا و الأكاديمية"
            hint=""
            icon={<Quote className="w-6 h-6 text-[#4A9B8E]" />}
          >
            {activity.feedback.map((item) => (
              <div
                key={`${item.name}-${item.role}`}
                className="min-w-[260px] sm:min-w-[380px] lg:min-w-[520px] rounded-2xl md:rounded-3xl border border-gray-100 bg-[#FBFCFC] p-5 sm:p-6"
              >
                <div className="mb-4">
                  <div className="font-bold text-gray-900">{item.name}</div>
                  <div className="mt-1 text-sm text-[#4A9B8E]">{item.role}</div>
                </div>
                <p className="text-gray-600 leading-8">{item.comment}</p>
              </div>
            ))}
          </HorizontalScroller>
        ) : null}
      </main>
      {isAcademy && showAcademyReminder ? <CountdownFloatingPopup /> : null}
      <Footer />
    </div>
  );
}
