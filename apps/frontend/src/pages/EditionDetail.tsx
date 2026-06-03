import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Video,
  Image as ImageIcon,
  Clock,
  Star,
  Sparkles,
  Activity,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function EditionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editionNumber = parseInt(id || "0");

  const { data: edition, isLoading } = trpc.editions.getByNumber.useQuery(
    { editionNumber },
    { enabled: editionNumber > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9]">
        <Navbar />
        <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-8 w-1/3 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="min-h-screen bg-[#F8FAF9]">
        <Navbar />
        <div className="pt-24 pb-12 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">الدورة غير موجودة</h1>
          <Button onClick={() => navigate("/")} className="bg-[#4A9B8E] hover:bg-[#3D7A6F]">
            <ArrowRight className="w-4 h-4 mr-2" />
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  const activitiesList = edition.activities ? edition.activities.split(",").filter(Boolean) : [];
  const guestsList = edition.guests ? edition.guests.split(",").filter(Boolean) : [];
  const linksList = edition.links ?? [];

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Navbar />

      {/* Hero Banner */}
      <div className="pt-20">
        <div className="relative h-80 md:h-[28rem] gradient-primary flex items-end">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 right-10 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#6BC4B2] rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-12 w-full">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-5 transition-colors bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm"
            >
              <ArrowRight className="w-4 h-4" />
              العودة للرئيسية
            </button>
            <h1 className="text-3xl md:text-5xl font-bold text-white text-shadow mb-4">
              {edition.title}
            </h1>
            <div className="flex flex-wrap gap-4 md:gap-6 text-white/90 text-sm md:text-base">
              {edition.eventDate && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <Calendar className="w-4 h-4" />
                  {edition.eventDate}
                </span>
              )}
              {edition.eventTime && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <Clock className="w-4 h-4" />
                  {edition.eventTime}
                </span>
              )}
              {edition.location && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <MapPin className="w-4 h-4" />
                  {edition.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm"
              >
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#4A9B8E]" />
                  عن الدورة
                </h2>
                <p className="text-gray-600 leading-loose text-base md:text-lg">
                  {edition.description || "لم تتم إضافة وصف لهذه الدورة بعد."}
                </p>
              </motion.div>

              {/* Guests */}
              {guestsList.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm"
                >
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <Star className="w-6 h-6 text-amber-500" />
                    الضيوف المميزون
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {guestsList.map((guest, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100"
                      >
                        <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <span className="text-gray-800 font-medium">{guest.trim()}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Activities */}
              {activitiesList.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm"
                >
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-[#4A9B8E]" />
                    الأنشطة والفعاليات
                  </h2>
                  <div className="space-y-3">
                    {activitiesList.map((activity, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-4 bg-[#F8FAF9] rounded-xl border border-gray-100"
                      >
                        <div className="w-10 h-10 bg-[#4A9B8E] rounded-lg flex items-center justify-center flex-shrink-0">
                          <ChevronRight className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium">{activity.trim()}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Video */}
              {edition.videoUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm"
                >
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <Video className="w-6 h-6 text-[#4A9B8E]" />
                    فيديو الدورة
                  </h2>
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 shadow-inner">
                    <iframe
                      src={edition.videoUrl}
                      className="w-full h-full"
                      allowFullScreen
                      title={`فيديو ${edition.title}`}
                    />
                  </div>
                </motion.div>
              )}

              {linksList.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm"
                >
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <ExternalLink className="w-6 h-6 text-[#4A9B8E]" />
                    روابط الدورة
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {linksList.map((link, i) => (
                      <a
                        key={link}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 p-4 bg-[#F8FAF9] rounded-xl border border-[#4A9B8E]/10 text-[#1f5148] font-medium hover:border-[#4A9B8E]/30 hover:bg-[#F3F8F6] transition-colors"
                      >
                        <span>رابط {i + 1}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Info Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gradient-to-br from-[#4A9B8E] to-[#6BC4B2] rounded-2xl p-6 text-white shadow-lg"
              >
                <h3 className="font-bold text-xl mb-5">معلومات الدورة</h3>
                <ul className="space-y-4 text-sm">
                  <li className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 opacity-80" />
                    <div>
                      <span className="block text-white/70 text-xs">الدورة</span>
                      <span className="font-semibold">رقم {edition.editionNumber}</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <Clock className="w-5 h-5 opacity-80" />
                    <div>
                      <span className="block text-white/70 text-xs">التاريخ</span>
                      <span className="font-semibold">{edition.eventDate || edition.dateRange}</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 opacity-80" />
                    <div>
                      <span className="block text-white/70 text-xs">المكان</span>
                      <span className="font-semibold">{edition.location || "المغرب"}</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <Activity className="w-5 h-5 opacity-80" />
                    <div>
                      <span className="block text-white/70 text-xs">الأنشطة</span>
                      <span className="font-semibold">{activitiesList.length}</span>
                    </div>
                  </li>
                </ul>
              </motion.div>

              {/* Gallery */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#4A9B8E]" />
                  معرض الصور
                </h3>
                {edition.images && edition.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {edition.images.map((img, i) => (
                      <div key={i} className="relative group overflow-hidden rounded-lg">
                        <img
                          src={img.imageUrl}
                          alt={img.caption || `صورة ${i + 1}`}
                          className="w-full h-28 object-cover transition-transform group-hover:scale-105"
                        />
                        {img.caption && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-white text-xs">{img.caption}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 bg-[#F8FAF9] rounded-xl">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">لم تتم إضافة صور لهذه الدورة بعد</p>
                  </div>
                )}
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <h3 className="font-bold text-lg mb-4">روابط سريعة</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-[#4A9B8E] border-[#4A9B8E]/20 hover:bg-[#4A9B8E]/5"
                    onClick={() => toast.info("سيتم إضافة هذه الميزة قريباً")}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    تحميل البرنامج
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-[#4A9B8E] border-[#4A9B8E]/20 hover:bg-[#4A9B8E]/5"
                    onClick={() => navigate("/")}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    استكشف الدورات الأخرى
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
