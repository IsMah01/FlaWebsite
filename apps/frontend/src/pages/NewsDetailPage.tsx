import { ArrowLeft, Calendar, Newspaper } from "lucide-react";
import { Link, useParams } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { newsItems } from "@/data/news";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function NewsDetailPage() {
  const { id } = useParams();
  const item = newsItems.find((newsItem) => newsItem.id === id);

  if (!item) {
    return (
      <div className="font-news-arabic min-h-screen bg-[#F8FAF9]">
        <Navbar />
        <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 pt-24" dir="rtl">
          <div className="w-full rounded-[30px] border border-gray-100 bg-white p-10 text-center shadow-sm">
            <Newspaper className="mx-auto h-12 w-12 text-[#4A9B8E]" />
            <h1 className="mt-5 text-3xl font-black text-gray-950">الخبر غير موجود</h1>
            <Link to="/news" className="mt-6 inline-flex items-center gap-2 font-bold text-[#3D7A6F]">
              العودة إلى الأخبار <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="font-news-arabic min-h-screen bg-[#F8FAF9]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6" dir="rtl">
        <Link to="/news" className="inline-flex items-center gap-2 font-bold text-[#3D7A6F] transition-colors hover:text-[#1f5148]">
          العودة إلى الأخبار <ArrowLeft className="h-4 w-4" />
        </Link>

        <article className="mt-7 overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm">
          <div className="p-6 sm:p-10 lg:p-14">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="rounded-full bg-[#4A9B8E]/10 px-3 py-1 font-bold text-[#3D7A6F]">{item.category}</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#4A9B8E]" />
                {formatDate(item.date)}
              </span>
            </div>

            <h1 className="mt-6 text-3xl font-black leading-[1.6] text-gray-950 sm:text-4xl lg:text-5xl">{item.title}</h1>

            {item.coverImage ? (
              <img src={item.coverImage} alt={item.title} className="mt-8 max-h-[560px] w-full rounded-[24px] object-cover" />
            ) : null}

            <p className="mt-5 border-r-4 border-[#4A9B8E] pr-5 text-lg font-medium leading-9 text-gray-600">{item.excerpt}</p>

            <div className="mt-10 space-y-10 text-[17px] leading-9 text-gray-700">
              {item.sections?.length ? item.sections.map((section, sectionIndex) => (
                <section key={`${item.id}-${sectionIndex}`} className="space-y-6">
                  {section.image ? (
                    <img
                      src={section.image}
                      alt={section.imageAlt ?? item.title}
                      loading="lazy"
                      className="max-h-[600px] w-full rounded-[24px] object-cover"
                    />
                  ) : null}
                  {section.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </section>
              )) : <p>{item.content}</p>}
            </div>

            {item.ctaHref && item.ctaLabel ? (
              <Link
                to={item.ctaHref}
                className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[#4A9B8E] px-6 py-3 font-bold text-white transition-colors hover:bg-[#3D7A6F]"
              >
                {item.ctaLabel} <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : null}

            {item.facebookUrl ? (
              <div className="mt-12 border-t border-gray-100 pt-8 text-center">
                <p className="mb-4 font-semibold text-gray-600">تابعوا الخبر على فيسبوك</p>
                <a
                  href={item.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="مشاهدة الخبر على فيسبوك"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-sm transition-transform hover:scale-105"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.46h-1.25c-1.24 0-1.63.77-1.63 1.56v1.9h2.77l-.44 2.91h-2.33V22C18.34 21.25 22 17.08 22 12.06Z" />
                  </svg>
                </a>
              </div>
            ) : null}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
