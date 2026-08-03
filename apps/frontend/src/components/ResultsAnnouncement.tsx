import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";

export default function ResultsAnnouncement() {
  return (
    <section className="bg-[#F3F8F7] px-4 py-10 sm:px-6" aria-labelledby="edition-18-results-title">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-3xl border border-emerald-100 bg-white p-7 shadow-sm md:flex-row md:p-9" dir="rtl">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 font-bold text-[#4A9B8E]"><CheckCircle2 className="h-6 w-6" /><span>إعلان النتائج النهائية</span></div>
          <h2 id="edition-18-results-title" className="mt-3 text-2xl font-black text-slate-900 md:text-3xl">نتائج الدورة الثامنة عشرة لأكاديمية أطر الغد</h2>
          <p className="mt-3 leading-7 text-slate-600">يمكنكم الآن الاطلاع على اللائحة النهائية للمشاركين المقبولين ولائحة الانتظار.</p>
        </div>
        <Link to="/resultats/edition-18" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#4A9B8E] px-5 py-3 font-bold text-white transition-colors hover:bg-[#3D7A6F]">
          الاطلاع على النتائج <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
