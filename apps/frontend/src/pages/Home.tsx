import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/sections/HeroSection";
import AboutSection from "@/sections/AboutSection";
import GoalsSection from "@/sections/GoalsSection";
import ActivitiesSection from "@/sections/ActivitiesSection";
import NumbersSection from "@/sections/NumbersSection";
import ContactSection from "@/sections/ContactSection";
import CountdownCTA from "@/components/CountdownCTA";
import CountdownFloatingPopup from "@/components/CountdownFloatingPopup";
import AmbassadorDiscussionZone from "@/components/AmbassadorDiscussionZone";
import { useViewerSession } from "@/hooks/useViewerSession";

export default function Home() {
  const { viewer, hasAmbassadorView, isAmbassador, hasSubmittedQuestionnaire } = useViewerSession();
  const isAdmin = viewer?.kind === "site-user" && viewer.role === "admin";
  const showAcademyReminder = isAdmin || (!hasSubmittedQuestionnaire && !isAmbassador);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <section className="bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white">
          Test pipeline DevOps - deploiement automatique actif
        </section>
        {hasAmbassadorView && viewer ? <AmbassadorDiscussionZone author={viewer.name} /> : null}
        {!hasAmbassadorView ? <AboutSection /> : null}
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
