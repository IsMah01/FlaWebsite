import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/sections/HeroSection";
import HomeGallerySection from "@/sections/HomeGallerySection";
import AboutSection from "@/sections/AboutSection";
import GoalsSection from "@/sections/GoalsSection";
import ActivitiesSection from "@/sections/ActivitiesSection";
import NumbersSection from "@/sections/NumbersSection";
import ContactSection from "@/sections/ContactSection";
import CountdownCTA from "@/components/CountdownCTA";
import CountdownFloatingPopup from "@/components/CountdownFloatingPopup";
import AmbassadorDiscussionZone from "@/components/AmbassadorDiscussionZone";
import { useViewerSession } from "@/hooks/useViewerSession";
import { CalendarCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export default function Home() {
  const { viewer, hasAmbassadorView, isAmbassador, hasSubmittedQuestionnaire } = useViewerSession();
  const isAdmin = viewer?.kind === "site-user" && viewer.role === "admin";
  const isInternalHome = hasAmbassadorView || isAdmin;
  const showAcademyReminder = isAdmin || isAmbassador || !hasSubmittedQuestionnaire;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {isInternalHome ? <HeroSection /> : <HomeGallerySection />}
        {hasAmbassadorView && viewer ? <AmbassadorDiscussionZone author={viewer.name} /> : null}
        {!hasAmbassadorView ? <AboutSection /> : null}
        {!hasAmbassadorView ? (
          <section className="bg-[#F3F8F7] px-4 py-14 sm:px-6" aria-labelledby="fla-interviews-title">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-7 rounded-3xl border border-emerald-100 bg-white p-7 shadow-sm md:flex-row md:p-10" dir="rtl">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 text-[#4A9B8E]">
                  <CalendarCheck className="h-7 w-7" />
                  <p className="font-bold" dir="ltr">Future Leaders Foundation</p>
                </div>
                <h2 id="fla-interviews-title" className="mt-3 text-3xl font-black text-slate-900" dir="ltr">FLA Interviews</h2>
                <p className="mt-4 leading-8 text-slate-600">
                  منصة مؤسسة أطر الغد لتنظيم المقابلات الشفوية عبر الفيديو: تعيين المرشحين، اختيار المواعيد، إنشاء أحداث Google Calendar وروابط Google Meet، وإرسال التأكيدات والتذكيرات.
                </p>
              </div>
              <Link to="/fla-interviews" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#4A9B8E] px-5 py-3 font-bold text-white transition-colors hover:bg-[#3D7A6F]">
                اكتشف المنصة <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : null}
        {!hasAmbassadorView ? <GoalsSection /> : null}
        {showAcademyReminder ? (
          <section className="py-10 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <CountdownCTA />
            </div>
          </section>
        ) : null}
        <ActivitiesSection />
        {!hasAmbassadorView ? <NumbersSection /> : null}
        {!hasAmbassadorView ? <ContactSection /> : null}
      </main>
      {showAcademyReminder ? <CountdownFloatingPopup /> : null}
      <Footer />
    </div>
  );
}
