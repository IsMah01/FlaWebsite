import { ArrowLeft, CheckCircle2, Download, ExternalLink, FileText, Users } from "lucide-react";
import { Link } from "react-router";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const lists = [
  { title: "اللائحة النهائية للمشاركين المقبولين", description: "اللائحة الرسمية للمشاركين المقبولين نهائياً في الدورة الثامنة عشرة لأكاديمية أطر الغد.", href: "/documents/edition-18/liste-admis-finale.pdf", icon: CheckCircle2, accent: "emerald" },
  { title: "لائحة الانتظار", description: "اللائحة الرسمية للمترشحين المدرجين ضمن لائحة الانتظار الخاصة بالدورة الثامنة عشرة.", href: "/documents/edition-18/liste-attente.pdf", icon: Users, accent: "amber" },
] as const;

export default function Edition18Results() {
  return (
    <div className="min-h-screen bg-[#F8FAF9]" dir="rtl" lang="ar">
      <Navbar />
      <main className="pt-16">
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#143f38_0%,#2f786d_50%,#8ed1c3_100%)] text-white">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
            <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/20"><ArrowLeft className="h-4 w-4 rotate-180" /> العودة إلى الصفحة الرئيسية</Link>
            <div className="mt-8 max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold"><FileText className="h-4 w-4" /> النتائج الرسمية</div>
              <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl md:text-6xl">نتائج الدورة الثامنة عشرة لأكاديمية أطر الغد</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-white/85">تجدون أدناه اللائحة النهائية للمشاركين المقبولين ولائحة الانتظار. يمكن فتح كل وثيقة أو تحميلها بصيغة PDF.</p>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 md:py-16">
          {lists.map(({ title, description, href, icon: Icon, accent }) => {
            const admitted = accent === "emerald";
            return (
              <article key={href} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
                  <div className="flex items-start gap-4">
                    <span className={`rounded-2xl p-3 ${admitted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}><Icon className="h-7 w-7" /></span>
                    <div><h2 className="text-2xl font-black text-slate-900">{title}</h2><p className="mt-2 max-w-3xl leading-7 text-slate-600">{description}</p></div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-3">
                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50">فتح الوثيقة <ExternalLink className="h-4 w-4" /></a>
                    <a href={href} download className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold text-white ${admitted ? "bg-emerald-700 hover:bg-emerald-800" : "bg-amber-600 hover:bg-amber-700"}`}>تحميل PDF <Download className="h-4 w-4" /></a>
                  </div>
                </div>
                <div className="hidden border-t bg-slate-100 p-3 md:block"><iframe src={`${href}#view=FitH`} title={title} className="h-[720px] w-full rounded-xl bg-white" /></div>
              </article>
            );
          })}
        </section>
      </main>
      <Footer />
    </div>
  );
}
