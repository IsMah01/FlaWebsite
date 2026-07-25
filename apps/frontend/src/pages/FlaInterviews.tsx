import {
  CalendarCheck,
  CalendarClock,
  Mail,
  ShieldCheck,
  UserRoundCheck,
  Video,
} from "lucide-react";
import { Link } from "react-router";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: UserRoundCheck,
    title: "توزيع المرشحين",
    description: "تعيين كل مرشح لمسؤول مقابلة محدد مع إظهار معلومات التواصل الضرورية.",
  },
  {
    icon: CalendarClock,
    title: "اختيار المواعيد",
    description: "عرض المواعيد المتاحة بتوقيت المغرب وتمكين المرشح من الحجز أو تغيير الموعد.",
  },
  {
    icon: Video,
    title: "مقابلات عبر الفيديو",
    description: "إنشاء أحداث Google Calendar وروابط Google Meet للمقابلات الشفوية.",
  },
  {
    icon: Mail,
    title: "إشعارات وتذكيرات",
    description: "إرسال تأكيدات بالعربية وتذكيرات قبل المقابلة وتحديثات عند أي تغيير.",
  },
];

export default function FlaInterviews() {
  return (
    <div className="min-h-screen bg-[#F8FAF9]" dir="rtl" lang="ar">
      <Navbar />
      <main>
        <section className="px-4 pb-16 pt-28 sm:px-6">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#173f39_0%,#2f786d_52%,#75c8b8_100%)] px-6 py-14 text-white shadow-xl md:px-12 md:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-100" dir="ltr">
                Future Leaders Foundation
              </p>
              <h1 className="mt-4 text-4xl font-black md:text-6xl" dir="ltr">FLA Interviews</h1>
              <h2 className="mt-5 text-2xl font-bold md:text-3xl">منصة تدبير المقابلات الشفوية لمؤسسة أطر الغد</h2>
              <p className="mt-6 max-w-2xl text-lg leading-9 text-white/90">
                تساعد المنصة المؤسسة على تنظيم مرحلة المقابلات عن بُعد، من تعيين المسؤولين وعرض المواعيد إلى الحجز وإنشاء روابط Google Meet وإرسال التذكيرات.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signin">
                  <Button className="h-12 bg-white px-6 font-bold text-[#245f56] hover:bg-emerald-50">دخول المرشحين</Button>
                </Link>
                <Link to="/admin/login">
                  <Button variant="outline" className="h-12 border-white/50 bg-white/10 px-6 font-bold text-white hover:bg-white/20 hover:text-white">دخول مسؤولي المقابلات</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-bold text-[#4A9B8E]">هدف التطبيق</p>
              <h2 className="mt-2 text-3xl font-black text-slate-900">مسار واضح وآمن للمقابلات</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                صُممت FLA Interviews حصرياً لتدبير المقابلات الشفوية للمرشحين الذين اختارتهم مؤسسة أطر الغد للانتقال إلى هذه المرحلة.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                  <feature.icon className="h-8 w-8 text-[#4A9B8E]" />
                  <h3 className="mt-4 text-xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 p-7">
              <CalendarCheck className="h-8 w-8 text-[#4A9B8E]" />
              <h2 className="mt-4 text-2xl font-bold text-slate-900">استخدام Google Calendar وGoogle Meet</h2>
              <p className="mt-4 leading-8 text-slate-600">
                بعد تفويض مسؤول مخوّل، تنشئ المنصة أحداث المقابلات وروابط الفيديو، وتضيف المرشحين كمدعوين وتحدّث الحدث عند تغيير الموعد أو إلغائه. لا يُستخدم الوصول إلى Google لأي إعلانات أو أغراض تسويقية.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 p-7">
              <ShieldCheck className="h-8 w-8 text-[#4A9B8E]" />
              <h2 className="mt-4 text-2xl font-bold text-slate-900">الخصوصية والأمان</h2>
              <p className="mt-4 leading-8 text-slate-600">
                الوصول محمي بحسب الصلاحيات، ورمز Google مخزن بصورة مشفرة، وتقتصر معالجة البيانات على تنظيم الترشيحات والمقابلات والتواصل الضروري.
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-[#2f786d]">
                <Link to="/privacy" className="underline">سياسة الخصوصية</Link>
                <Link to="/terms" className="underline">شروط الاستخدام</Link>
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
