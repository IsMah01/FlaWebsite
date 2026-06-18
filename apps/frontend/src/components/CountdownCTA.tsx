import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewerSession } from "@/hooks/useViewerSession";

const REGISTRATION_DEADLINE = "2026-07-05";
const REGISTRATION_DEADLINE_LABEL = "05/07/2026";

function getCountdownDays(targetDate: string) {
  const target = new Date(`${targetDate}T00:00:00`);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = target.getTime() - startOfToday.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

type CountdownCTAProps = {
  compact?: boolean;
  className?: string;
};

export default function CountdownCTA({ compact = false, className = "" }: CountdownCTAProps) {
  const navigate = useNavigate();
  const { isCandidate, hasAmbassadorView } = useViewerSession();
  const daysLeft = getCountdownDays(REGISTRATION_DEADLINE);
  const isClosed = daysLeft <= 0;
  const isAmbassadorNotice = hasAmbassadorView && !isCandidate;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-[32px] border border-[#4A9B8E]/20 bg-[linear-gradient(135deg,#f9fffd_0%,#ebf7f3_55%,#ffffff_100%)] shadow-sm ${className}`}
    >
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-[#9ad7cb]/30 blur-3xl" />
      <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-[#1f5148]/10 blur-3xl" />
      <div className={`relative ${compact ? "p-6 md:p-7" : "p-7 md:p-10"}`}>
        <div className="inline-flex rounded-full bg-[#1f5148] px-4 py-1.5 text-xs font-semibold text-white">
          {isAmbassadorNotice ? "تذكير داخلي للأكاديمية" : "التسجيل مفتوح للأكاديمية 18"}
        </div>
        <div
          className={`mt-5 flex ${compact ? "flex-col md:flex-row md:items-center" : "flex-col lg:flex-row lg:items-center"} gap-4`}
        >
          <div
            className={`${compact ? "text-4xl md:text-5xl" : "text-5xl md:text-6xl"} font-black tracking-tight text-[#1f5148]`}
          >
            {isClosed ? "انتهى" : `J-${daysLeft}`}
          </div>
          <div className="space-y-1 text-sm md:text-base">
            <div className="font-semibold text-gray-700">آخر أجل للتسجيل: {REGISTRATION_DEADLINE_LABEL}</div>
            {!isClosed ? <div className="text-gray-500">باقي {daysLeft} يوما قبل إغلاق الاستمارة.</div> : null}
          </div>
        </div>
        <p className={`mt-5 max-w-3xl text-gray-700 ${compact ? "text-base leading-7" : "text-lg leading-8"}`}>
          {isClosed ? (
            <>انتهت فترة التسجيل الحالية. سيتم الإعلان عن أي تمديد أو دورة جديدة عبر الموقع والقنوات الرسمية.</>
          ) : isAmbassadorNotice ? (
            <>
              تذكير داخلي: بقي
              <span className="font-bold text-[#1f5148]"> {daysLeft} يوما</span> على آخر أجل للتسجيل.
            </>
          ) : (
            <>
              إذا كنت تطمح لأن تكون جزءًا من تجربة تُعاش ولا تُحكى، فلا تؤخر خطوتك.
              <br />
              أكمل التسجيل قبل {REGISTRATION_DEADLINE_LABEL} حتى لا تفوتك فرصة المشاركة.
            </>
          )}
        </p>
        {!isAmbassadorNotice && !isClosed ? (
          <Button
            onClick={() => navigate(isCandidate ? "/candidate-questionnaire" : "/signup")}
            className={`mt-6 ${compact ? "h-11" : "h-12"} bg-[#4A9B8E] hover:bg-[#3D7A6F]`}
          >
            سجّل الآن
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        ) : null}
      </div>
    </motion.section>
  );
}
