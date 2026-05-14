import { motion } from "framer-motion";
import { ArrowLeft, Calendar, CheckCircle2, Clock3, MapPin, Newspaper } from "lucide-react";
import { useNavigate } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { newsItems, pastEvents, upcomingEvents } from "@/data/news";

function getCountdownDays(targetDate: string) {
  const target = new Date(`${targetDate}T00:00:00`);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = target.getTime() - startOfToday.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function NewsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Navbar />

      <section className="pt-20">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#143f38_0%,#2f786d_45%,#8ed1c3_100%)]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 right-10 h-72 w-72 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#0f2f2a] blur-3xl" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20 text-white">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-sm bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة إلى الرئيسية
            </button>
            <div className="mt-8 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
                <Newspaper className="w-4 h-4" />
                الأحداث والتنبيهات
              </div>
              <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-tight">صفحة الأخبار والفعاليات</h1>
              <p className="mt-5 text-white/85 text-lg leading-8">
                هذه الصفحة تعرض المواعيد القادمة للمؤسسة، والفعاليات التي مرت بالفعل، مع عداد
                <span className="font-bold"> J-... </span>
                للأحداث المنتظرة.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-14">
        <section>
          <div className="mb-8">
            <span className="inline-block px-4 py-1 bg-[#4A9B8E]/10 text-[#4A9B8E] rounded-full text-sm font-medium mb-4">
              الفعاليات القادمة
            </span>
          </div>

          <div className="grid gap-5">
            {upcomingEvents.map((event, index) => {
              const daysLeft = getCountdownDays(event.date);

              return (
                <motion.article
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  className="grid lg:grid-cols-[220px_1fr] overflow-hidden rounded-[30px] border border-[#4A9B8E]/10 bg-white shadow-sm"
                >
                  <div className="bg-[linear-gradient(160deg,#1f5148_0%,#4A9B8E_60%,#8ed1c3_100%)] p-6 text-white flex flex-col justify-between">
                    <div className="text-sm text-white/75">العد التنازلي</div>
                    <div className="text-5xl font-black tracking-tight">J-{daysLeft}</div>
                    <div className="text-sm text-white/80">{formatDate(event.date)}</div>
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#4A9B8E]" />
                        {formatDate(event.date)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#4A9B8E]" />
                        {event.location}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{event.title}</h3>
                    <p className="text-gray-600 leading-8">{event.summary}</p>
                    {event.cta ? (
                      <Button
                        onClick={() => navigate("/signup")}
                        className="mt-5 bg-[#4A9B8E] hover:bg-[#3D7A6F]"
                      >
                        {event.cta}
                      </Button>
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-8">
            <span className="inline-block px-4 py-1 bg-[#1f5148]/10 text-[#1f5148] rounded-full text-sm font-medium mb-4">
              فعاليات مرت
            </span>
          </div>

          <div className="grid gap-5">
            {pastEvents.map((event, index) => (
              <motion.article
                key={event.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="grid lg:grid-cols-[220px_1fr] overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-sm"
              >
                <div className="bg-[#EAF7F3] p-6 text-[#1f5148] flex flex-col justify-between">
                  <div className="text-sm font-medium text-[#1f5148]/70">تم إنجازه</div>
                  <div className="flex items-center gap-2 text-2xl font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                    مرّ الحدث
                  </div>
                  <div className="text-sm">{formatDate(event.date)}</div>
                </div>

                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#4A9B8E]" />
                      {formatDate(event.date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#4A9B8E]" />
                      {event.location}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{event.title}</h3>
                  <p className="text-gray-600 leading-8">{event.summary}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-8">
            <span className="inline-block px-4 py-1 bg-[#4A9B8E]/10 text-[#4A9B8E] rounded-full text-sm font-medium mb-4">
              أخبار المؤسسة
            </span>
          </div>

          {newsItems.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-[#4A9B8E]/25 bg-white p-10 text-center shadow-sm">
              <Clock3 className="w-10 h-10 mx-auto text-[#4A9B8E] mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">لا نملك أخبارا منشورة في الوقت الحالي</p>
              <p className="text-gray-600 leading-8 max-w-2xl mx-auto">
                سيتم تحديث هذه الصفحة لاحقا عند توفر مستجدات أو بلاغات أو تغطيات رسمية لأنشطة المؤسسة.
              </p>
            </div>
          ) : null}
        </section>
      </main>

      <Footer />
    </div>
  );
}
