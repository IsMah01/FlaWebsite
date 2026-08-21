import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/sections/HeroSection";
import HomeGallerySection from "@/sections/HomeGallerySection";
import AboutSection from "@/sections/AboutSection";
import HomeNewsSection from "@/sections/HomeNewsSection";
import GoalsSection from "@/sections/GoalsSection";
import ActivitiesSection from "@/sections/ActivitiesSection";
import NumbersSection from "@/sections/NumbersSection";
import ContactSection from "@/sections/ContactSection";
import AmbassadorDiscussionZone from "@/components/AmbassadorDiscussionZone";
import { useViewerSession } from "@/hooks/useViewerSession";

export default function Home() {
  const { viewer, hasAmbassadorView } = useViewerSession();
  const isAdmin = viewer?.kind === "site-user" && viewer.role === "admin";
  const isInternalHome = hasAmbassadorView || isAdmin;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {isInternalHome ? <HeroSection /> : <HomeGallerySection />}
        {hasAmbassadorView && viewer ? <AmbassadorDiscussionZone author={viewer.name} /> : null}
        {!hasAmbassadorView ? <AboutSection /> : null}
        {!hasAmbassadorView ? <HomeNewsSection /> : null}
        {!hasAmbassadorView ? <GoalsSection /> : null}
        <ActivitiesSection />
        {!hasAmbassadorView ? <NumbersSection /> : null}
        {!hasAmbassadorView ? <ContactSection /> : null}
      </main>
      <Footer />
    </div>
  );
}
