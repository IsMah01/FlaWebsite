import { ArrowLeft, Calendar, Newspaper } from "lucide-react";
import { Link } from "react-router";
import { newsItems } from "@/data/news";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function HomeNewsSection() {
  const recentNews = newsItems
    .slice()
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 3);

  if (recentNews.length === 0) return null;

  return (
    <section className="font-news-arabic bg-[#F3F8F7] py-16" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#4A9B8E]/10 px-4 py-2 text-sm font-bold text-[#3D7A6F]">
              <Newspaper className="h-4 w-4" /> آخر الأخبار
            </span>
            <h2 className="mt-4 text-3xl font-black text-gray-950 md:text-4xl">أخبار مؤسسة أطر الغد</h2>
          </div>
          <Link to="/news" className="inline-flex items-center gap-2 font-bold text-[#3D7A6F] hover:text-[#1f5148]">
            جميع الأخبار <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recentNews.map((item) => (
            <Link
              key={item.id}
              to={`/news/${item.id}`}
              className="group overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              {item.coverImage ? (
                <img src={item.coverImage} alt={item.title} className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-[linear-gradient(135deg,#143f38_0%,#4A9B8E_65%,#8ed1c3_100%)] text-white">
                  <Newspaper className="h-14 w-14 opacity-80" />
                </div>
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="rounded-full bg-[#4A9B8E]/10 px-3 py-1 font-bold text-[#3D7A6F]">{item.category}</span>
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#4A9B8E]" />{formatDate(item.date)}</span>
                </div>
                <h3 className="mt-4 text-xl font-black leading-[1.7] text-gray-950">{item.title}</h3>
                <p className="mt-3 line-clamp-3 leading-8 text-gray-600">{item.excerpt}</p>
                <span className="mt-5 inline-flex items-center font-bold text-[#3D7A6F]">اقرأ الخبر <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
