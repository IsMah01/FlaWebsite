import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Newspaper } from "lucide-react";
import { useNavigate } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { newsItems, pastEvents, upcomingEvents } from "@/data/news";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function getEventDate(date: string) {
  return new Date(`${date}T00:00:00`).getTime();
}

export default function NewsPage() {
  const navigate = useNavigate();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const events = [...upcomingEvents, ...pastEvents].filter(
    (event, index, all) => all.findIndex((candidate) => candidate.id === event.id) === index,
  );
  const currentPastEvents = events
    .filter(
      (event) => event.id !== "careers-caravan-larache" && getEventDate(event.date) < startOfToday.getTime(),
    )
    .sort((first, second) => getEventDate(second.date) - getEventDate(first.date));

  return (
    <div className="font-news-arabic min-h-screen bg-[#F8FAF9]">
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
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-14">
        {newsItems.length > 0 ? <section>
          <div className="mb-8">
            <span className="inline-block px-4 py-1 bg-[#4A9B8E]/10 text-[#4A9B8E] rounded-full text-sm font-medium mb-4">
              آخر الأخبار
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2" dir="rtl">
              {newsItems
                .slice()
                .sort((first, second) => getEventDate(second.date) - getEventDate(first.date))
                .map((item) => (
                  <motion.article key={item.id} whileHover={{ y: -4 }} className="overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-xl">
                    <button type="button" onClick={() => navigate(`/news/${item.id}`)} className="block h-full w-full text-right">
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="aspect-[16/9] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center bg-[linear-gradient(135deg,#143f38_0%,#4A9B8E_65%,#8ed1c3_100%)] text-white">
                        <Newspaper className="h-16 w-16 opacity-80" />
                      </div>
                    )}
                    <div className="p-6 sm:p-7">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span className="rounded-full bg-[#4A9B8E]/10 px-3 py-1 font-bold text-[#3D7A6F]">{item.category}</span>
                        <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#4A9B8E]" />{formatDate(item.date)}</span>
                      </div>
                      <h2 className="mt-5 text-xl font-black leading-[1.7] text-gray-950 sm:text-2xl">{item.title}</h2>
                      <p className="mt-3 line-clamp-3 leading-8 text-gray-600">{item.excerpt}</p>
                      <span className="mt-5 inline-flex items-center font-bold text-[#3D7A6F]">اقرأ الخبر كاملًا <ArrowLeft className="mr-2 h-4 w-4" /></span>
                    </div>
                    </button>
                  </motion.article>
                ))}
          </div>
        </section> : null}

        {currentPastEvents.length > 0 ? <section>
          <div className="mb-8">
            <span className="inline-block rounded-full bg-[#1f5148]/10 px-4 py-1 text-sm font-medium text-[#1f5148]">
              فعاليات مرت
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2" dir="rtl">
            {currentPastEvents.map((event) => (
              <motion.article
                key={event.id}
                whileHover={{ y: -4 }}
                className="overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className="flex aspect-[16/9] items-center justify-center bg-[linear-gradient(135deg,#143f38_0%,#4A9B8E_65%,#8ed1c3_100%)] text-white">
                  <Newspaper className="h-16 w-16 opacity-80" />
                </div>
                <div className="p-6 sm:p-7">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="rounded-full bg-[#4A9B8E]/10 px-3 py-1 font-bold text-[#3D7A6F]">فعالية</span>
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#4A9B8E]" />{formatDate(event.date)}</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#4A9B8E]" />{event.location}</span>
                  </div>
                  <h2 className="mt-5 text-xl font-black leading-[1.7] text-gray-950 sm:text-2xl">{event.title}</h2>
                  <p className="mt-3 leading-8 text-gray-600">{event.summary}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section> : null}
      </main>

      <Footer />
    </div>
  );
}
