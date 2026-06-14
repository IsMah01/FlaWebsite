import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewerSession } from "@/hooks/useViewerSession";

function getCountdownDays(targetDate: string) {
  const target = new Date(`${targetDate}T00:00:00`);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = target.getTime() - startOfToday.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const REOPEN_INTERVAL_MS = 8 * 60 * 1000;

export default function CountdownFloatingPopup() {
  const navigate = useNavigate();
  const { isCandidate, hasAmbassadorView } = useViewerSession();
  const [isOpen, setIsOpen] = useState(true);
  const daysLeft = getCountdownDays("2026-05-28");
  const isAmbassadorNotice = hasAmbassadorView && !isCandidate;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIsOpen(true);
    }, REOPEN_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="countdown-popup"
            initial={{ opacity: 0, x: 32, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-3 left-3 right-3 md:bottom-5 md:left-auto md:right-6 md:w-[390px] z-50"
          >
            <div className="relative overflow-hidden rounded-2xl border border-[#4A9B8E]/20 bg-white shadow-2xl md:rounded-[28px]">
              <div className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#1f5148_0%,#4A9B8E_55%,#9ad7cb_100%)]" />
              <button
                onClick={() => setIsOpen(false)}
                className="absolute left-4 top-4 rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="p-5 pt-8 md:p-6 md:pt-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF7F3] px-3 py-1 text-xs font-semibold text-[#1f5148]">
                  <Bell className="w-3.5 h-3.5" />
                  {isAmbassadorNotice ? "إعلان داخلي" : "فتح باب التسجيل في الأكاديمية 18"}
                </div>
                <p className="mt-4 text-gray-600 leading-7">
                  {isAmbassadorNotice ? (
                    <>
                      تذكير : بقي
                      <span className="font-bold text-[#1f5148]"> {daysLeft} يوما</span>
                      {" "}على تاريخ الاستمارة.
                    </>
                  ) : (
                    <>
                      إذا كنت تطمح لأن تكون جزءًا من تجربة تُعاش ولا تُحكى، فلا تؤخر خطوتك.
                    </>
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="text-sm font-semibold text-gray-600">آخر أجل للتسجيل: 28/05/2026</div>
                  <div className="text-4xl font-black leading-none text-[#1f5148] md:text-5xl">J-{daysLeft}</div>
                </div>
                {!isAmbassadorNotice ? (
                  <p className="mt-4 text-gray-600 leading-7">تبقّى على إغلاق استمارة التسجيل {daysLeft} أيام فقط.</p>
                ) : null}
                {!isAmbassadorNotice ? (
                  <Button
                    onClick={() => navigate(isCandidate ? "/candidate-questionnaire" : "/signup")}
                    className="mt-5 w-full h-11 bg-[#4A9B8E] hover:bg-[#3D7A6F]"
                  >
                    سجّل الآن
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            key="countdown-handle"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 rounded-l-2xl border border-r-0 border-[#4A9B8E]/20 bg-white/95 px-3 py-3 shadow-xl backdrop-blur"
            aria-label="Afficher la notification"
          >
            <ChevronLeft className="w-5 h-5 text-[#1f5148]" />
            <span className="text-xs font-semibold text-[#1f5148] whitespace-nowrap">J-{daysLeft}</span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}
