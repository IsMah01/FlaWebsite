import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REGISTRATION_DEADLINE_LABEL, getRegistrationCountdownDays } from "@/data/registration";
import { useViewerSession } from "@/hooks/useViewerSession";

const REOPEN_INTERVAL_MS = 8 * 60 * 1000;

export default function CountdownFloatingPopup() {
  const navigate = useNavigate();
  const { isCandidate, hasAmbassadorView } = useViewerSession();
  const [isOpen, setIsOpen] = useState(true);
  const daysLeft = getRegistrationCountdownDays();
  const isClosed = daysLeft <= 0;
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
            className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 md:bottom-5 md:left-auto md:right-6 md:w-[400px]"
          >
            <div className="relative max-h-[calc(100svh-1.5rem)] overflow-y-auto rounded-2xl border border-[#4A9B8E]/20 bg-white shadow-2xl">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-[#4A9B8E]" />
              <button
                onClick={() => setIsOpen(false)}
                className="absolute left-3 top-3 rounded-full bg-gray-100 p-1.5 text-gray-500 transition-colors hover:bg-gray-200 md:left-4 md:top-4 md:p-2"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="p-4 pt-7 md:p-6 md:pt-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF7F3] px-3 py-1 text-xs font-semibold text-[#1f5148]">
                  <Bell className="w-3.5 h-3.5" />
                  {isAmbassadorNotice ? "تذكير داخلي" : "التسجيل مفتوح للأكاديمية 18"}
                </div>
                <p className="mt-3 hidden text-gray-600 leading-7 sm:block">
                  {isClosed ? (
                    <>انتهت فترة التسجيل الحالية. سيتم الإعلان عن أي تمديد عبر القنوات الرسمية.</>
                  ) : isAmbassadorNotice ? (
                    <>
                      تذكير داخلي: بقي
                      <span className="font-bold text-[#1f5148]"> {daysLeft} يوما</span>
                      {" "}على آخر أجل للتسجيل.
                    </>
                  ) : (
                    <>
                      إذا كنت تطمح لأن تكون جزءًا من تجربة تُعاش ولا تُحكى، فلا تؤخر خطوتك.
                    </>
                  )}
                </p>
                <div className="mt-4 flex items-end justify-between gap-3 sm:flex-wrap sm:justify-start">
                  <div className="text-sm font-semibold text-gray-600">آخر أجل للتسجيل: {REGISTRATION_DEADLINE_LABEL}</div>
                  <div className="shrink-0 text-3xl font-black leading-none text-[#1f5148] md:text-5xl">
                    {isClosed ? "انتهى" : `J-${daysLeft}`}
                  </div>
                </div>
                {!isAmbassadorNotice && !isClosed ? (
                  <p className="mt-3 text-sm leading-6 text-gray-600 sm:mt-4 sm:text-base sm:leading-7">أكمل التسجيل قبل {REGISTRATION_DEADLINE_LABEL} حتى لا تفوتك فرصة المشاركة.</p>
                ) : null}
                {!isAmbassadorNotice && !isClosed ? (
                  <Button
                    onClick={() => navigate(isCandidate ? "/candidate-questionnaire" : "/signup")}
                    className="mt-4 h-10 w-full bg-[#4A9B8E] hover:bg-[#3D7A6F] sm:mt-5 sm:h-11"
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
            <span className="text-xs font-semibold text-[#1f5148] whitespace-nowrap">
              {isClosed ? "انتهى" : `J-${daysLeft}`}
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}
