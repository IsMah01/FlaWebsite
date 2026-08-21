import { useEffect } from "react";
import { useLocation } from "react-router";

export default function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.slice(1);
      let attempts = 0;
      let frameId = 0;

      const scrollToTarget = () => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        attempts += 1;
        if (attempts < 30) {
          frameId = window.requestAnimationFrame(scrollToTarget);
        }
      };

      frameId = window.requestAnimationFrame(scrollToTarget);
      return () => window.cancelAnimationFrame(frameId);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
