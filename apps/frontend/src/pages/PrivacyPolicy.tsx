import { ExternalLink, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { contactLinks } from "@/lib/site-links";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F8FAF9]" dir="rtl" lang="ar">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6">
        <header className="rounded-[28px] bg-[linear-gradient(135deg,#173f39_0%,#4A9B8E_100%)] p-7 text-white shadow-lg md:p-10">
          <ShieldCheck className="h-10 w-10" />
          <p className="mt-5 text-sm font-semibold text-white/75">مؤسسة أطر الغد — Future Leaders Foundation</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">سياسة الخصوصية</h1>
          <p className="mt-4 leading-8 text-white/90">
            توضح هذه السياسة كيفية جمع واستخدام وحماية البيانات الشخصية وبيانات Google عند استعمال منصة المؤسسة وخدمة تدبير المقابلات.
          </p>
          <p className="mt-3 text-sm text-white/70">آخر تحديث: 25 يوليوز 2026</p>
        </header>

        <article className="mt-8 space-y-5 text-right text-slate-700">
          <LegalSection title="1. الجهة المسؤولة">
            <p>
              مؤسسة أطر الغد (Future Leaders Foundation) هي الجهة المسؤولة عن معالجة البيانات عبر الموقع
              <span dir="ltr" className="mx-1 inline-block">flf.ma</span>
              ومنصة FLA Interviews. يمكن التواصل معنا عبر
              {" "}
              <a className="font-semibold text-[#2f786d] underline" href={contactLinks.emailHref}>{contactLinks.email}</a>.
            </p>
          </LegalSection>

          <LegalSection title="2. البيانات التي نجمعها">
            <ul className="list-inside list-disc space-y-2">
              <li>بيانات الهوية والتواصل، مثل الاسم والبريد الإلكتروني ورقم الهاتف.</li>
              <li>بيانات التسجيل والترشيح والأجوبة والوثائق التي يرسلها المستخدم طوعاً.</li>
              <li>بيانات الحساب والأمان، وسجلات الدخول والعمليات الضرورية لحماية المنصة.</li>
              <li>بيانات المقابلات، مثل المسؤول المعين والموعد والحالة والتقييمات المهنية.</li>
              <li>الرسائل وطلبات التواصل والاشتراك في النشرة عند اختيار المستخدم لذلك.</li>
            </ul>
          </LegalSection>

          <LegalSection title="3. بيانات Google التي نصل إليها">
            <p>
              بعد موافقة مسؤول مخوّل، تستخدم المنصة نطاق Google Calendar
              {" "}
              <code dir="ltr" className="rounded bg-slate-100 px-1.5 py-1 text-xs">calendar.events</code>
              {" و "}
              <code dir="ltr" className="rounded bg-slate-100 px-1.5 py-1 text-xs">meetings.space.settings</code>
              {" "}
              للوصول إلى أحداث التقويم المرتبطة بحساب Google المركزي للمؤسسة.
            </p>
            <p className="mt-3">يقتصر هذا الوصول على ما يلزم من أجل:</p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li>إنشاء وتحديث أو حذف أحداث المقابلات.</li>
              <li>إنشاء روابط Google Meet المرتبطة بالمقابلات.</li>
              <li>إضافة المرشح كمدعو أو إزالته عند تغيير الموعد أو إلغائه.</li>
              <li>مزامنة حالة الموعد بين المنصة وGoogle Calendar.</li>
            </ul>
            <p className="mt-3">
              لا تستخدم المنصة بيانات Google للإعلانات، ولا لبيعها، ولا لإنشاء ملفات تسويقية، ولا لأي غرض غير تدبير المقابلات المصرح به.
            </p>
          </LegalSection>

          <LegalSection title="4. كيفية استخدام البيانات">
            <ul className="list-inside list-disc space-y-2">
              <li>إنشاء الحسابات والتحقق منها وإدارة الترشيحات.</li>
              <li>تنظيم المقابلات وإرسال التأكيدات والتحديثات والتذكيرات.</li>
              <li>التواصل مع المرشحين والمشرفين وتقديم الدعم.</li>
              <li>حماية المنصة ومنع إساءة الاستخدام والتحقيق في الأعطال.</li>
              <li>تحسين الخدمة وإعداد إحصاءات تشغيلية داخلية.</li>
              <li>الوفاء بالالتزامات القانونية والتنظيمية المطبقة.</li>
            </ul>
          </LegalSection>

          <LegalSection title="5. تخزين بيانات Google وحمايتها">
            <p>
              تحتفظ المنصة برمز التفويض المتجدد الخاص بالحساب المتصل بصورة مشفرة، إضافة إلى معرفات أحداث Google وحالة المزامنة والمعلومات الضرورية لتشغيل المقابلات. كلمات المرور مخزنة بصيغة مجزأة، وتستخدم المنصة اتصالات HTTPS وضوابط وصول بحسب الصلاحيات.
            </p>
            <div className="mt-4 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <LockKeyhole className="mt-1 h-5 w-5 shrink-0" />
              <p>لا نطلب كلمة مرور حساب Google ولا نخزنها. تتم المصادقة والتفويض مباشرة عبر Google OAuth.</p>
            </div>
          </LegalSection>

          <LegalSection title="6. مشاركة البيانات">
            <p>
              لا نبيع البيانات الشخصية أو بيانات Google. قد تتم معالجة البيانات فقط لدى مزودي الخدمات الضروريين لتشغيل المنصة، مثل الاستضافة والبريد الإلكتروني وGoogle Calendar، أو عند وجود التزام قانوني. يقتصر ذلك على الحد اللازم لتقديم الخدمة وحمايتها.
            </p>
          </LegalSection>

          <LegalSection title="7. مدة الاحتفاظ والحذف">
            <p>
              نحتفظ بالبيانات ما دامت ضرورية لإدارة الحساب والترشيح والمقابلات، أو للمدة اللازمة للأغراض القانونية والأمنية. يُحذف رمز Google المخزن عند فصل التقويم من لوحة الإدارة. ويمكن طلب الوصول إلى البيانات أو تصحيحها أو حذفها عبر البريد الإلكتروني للمؤسسة.
            </p>
          </LegalSection>

          <LegalSection title="8. إلغاء الوصول إلى Google">
            <p>
              يمكن للمسؤول فصل Google Calendar من لوحة إدارة المقابلات. ويمكن أيضاً إلغاء التفويض في أي وقت من صفحة أذونات حساب Google:
            </p>
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#4A9B8E] px-4 py-3 font-semibold text-white hover:bg-[#3D7A6F]"
            >
              إدارة أذونات حساب Google <ExternalLink className="h-4 w-4" />
            </a>
          </LegalSection>

          <LegalSection title="9. متطلبات الاستخدام المحدود لبيانات Google">
            <p>
              إن استخدام المنصة للمعلومات المستلمة من Google APIs ونقلها إلى أي تطبيق آخر يلتزم بسياسة بيانات مستخدمي خدمات Google API، بما في ذلك متطلبات الاستخدام المحدود. لا يستخدم موظفون أو أشخاص بيانات Google إلا بالقدر الضروري للأمان، أو الدعم بطلب المستخدم، أو الامتثال للقانون.
            </p>
          </LegalSection>

          <LegalSection title="10. حقوق المستخدم">
            <p>
              يمكن للمستخدم طلب نسخة من بياناته أو تصحيحها أو حذفها أو الاعتراض على بعض أوجه معالجتها، بحسب ما يسمح به القانون والالتزامات المشروعة للمؤسسة. قد نطلب التحقق من الهوية قبل تنفيذ الطلب.
            </p>
          </LegalSection>

          <LegalSection title="11. التحديثات والتواصل">
            <p>
              قد نحدّث هذه السياسة عند تغيير الخدمة أو طريقة معالجة البيانات. يُنشر التاريخ الجديد أعلى الصفحة، وتُقدّم إشعارات إضافية عندما يكون التغيير جوهرياً.
            </p>
            <a href={contactLinks.emailHref} className="mt-4 inline-flex items-center gap-2 font-semibold text-[#2f786d] underline">
              <Mail className="h-4 w-4" /> {contactLinks.email}
            </a>
          </LegalSection>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
      <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2>
      <div className="leading-8">{children}</div>
    </section>
  );
}
