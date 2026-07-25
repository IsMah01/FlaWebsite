import { Mail, Scale } from "lucide-react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { contactLinks } from "@/lib/site-links";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F8FAF9]" dir="rtl" lang="ar">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6">
        <header className="rounded-[28px] bg-[linear-gradient(135deg,#173f39_0%,#4A9B8E_100%)] p-7 text-white shadow-lg md:p-10">
          <Scale className="h-10 w-10" />
          <p className="mt-5 text-sm font-semibold text-white/75">مؤسسة أطر الغد — Future Leaders Foundation</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">شروط الاستخدام</h1>
          <p className="mt-4 leading-8 text-white/90">
            تنظم هذه الشروط استعمال موقع المؤسسة وخدمات التسجيل والترشيح والمقابلات عن بُعد.
          </p>
          <p className="mt-3 text-sm text-white/70">آخر تحديث: 25 يوليوز 2026</p>
        </header>

        <article className="mt-8 space-y-5 text-right text-slate-700">
          <LegalSection title="1. قبول الشروط">
            <p>
              باستعمال موقع
              <span dir="ltr" className="mx-1 inline-block">flf.ma</span>
              أو إنشاء حساب أو استخدام فضاء المقابلات، يوافق المستخدم على هذه الشروط وسياسة الخصوصية. إذا لم يوافق المستخدم، فعليه التوقف عن استعمال الخدمة.
            </p>
          </LegalSection>

          <LegalSection title="2. الغرض من المنصة">
            <p>
              توفر مؤسسة أطر الغد منصة لعرض أنشطتها، واستقبال وإدارة الترشيحات، والتواصل مع المشاركين، وتنظيم المقابلات الشفوية عبر Google Calendar وGoogle Meet. لا يمثل إنشاء الحساب أو المرور إلى المقابلة قبولاً نهائياً في أي برنامج.
            </p>
          </LegalSection>

          <LegalSection title="3. الحسابات وصحة المعلومات">
            <ul className="list-inside list-disc space-y-2">
              <li>يجب تقديم معلومات صحيحة وحديثة وكاملة.</li>
              <li>يتحمل المستخدم مسؤولية حماية بيانات دخوله وعدم مشاركتها.</li>
              <li>يجب إبلاغ المؤسسة فوراً عند الاشتباه في استعمال غير مصرح به للحساب.</li>
              <li>يجوز للمؤسسة تعليق الحسابات المزيفة أو المسيئة أو المخالفة لهذه الشروط.</li>
            </ul>
          </LegalSection>

          <LegalSection title="4. الترشيحات والقرارات">
            <p>
              تخضع الترشيحات لمعايير المؤسسة وإجراءات الانتقاء المعتمدة. ويعني الانتقال إلى المقابلة أن الملف تم اختياره لهذه المرحلة فقط. تحتفظ المؤسسة بحق قبول أو رفض الترشيحات واتخاذ القرار النهائي وفق أهداف البرنامج والمعطيات المتاحة.
            </p>
          </LegalSection>

          <LegalSection title="5. المقابلات والمواعيد">
            <ul className="list-inside list-disc space-y-2">
              <li>يختار المرشح موعداً من المواعيد المتاحة لدى المسؤول المعين.</li>
              <li>يجب الانضمام في الوقت المحدد والتأكد مسبقاً من الكاميرا والميكروفون والاتصال.</li>
              <li>يمكن تغيير الموعد ما دام موعد بديل متاحاً وتسمح المنصة بذلك.</li>
              <li>قد تضطر المؤسسة إلى إلغاء أو تعديل موعد، وسيتم إشعار المرشح عبر المنصة أو البريد.</li>
              <li>قد يعتبر عدم الحضور دون إشعار غياباً ويؤثر في متابعة الترشيح.</li>
            </ul>
          </LegalSection>

          <LegalSection title="6. Google Calendar وGoogle Meet">
            <p>
              تعتمد خدمة المقابلات على خدمات Google. يخضع استعمال Google Calendar وGoogle Meet أيضاً لشروط وسياسات Google. لا تضمن المؤسسة استمرار خدمات خارجية خارجة عن سيطرتها، لكنها تتخذ الإجراءات المعقولة لمعالجة أعطال المزامنة وإبلاغ المستخدمين.
            </p>
          </LegalSection>

          <LegalSection title="7. الاستعمال المقبول">
            <p>يُمنع على المستخدم:</p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li>محاولة الوصول إلى حسابات أو بيانات أو وظائف دون إذن.</li>
              <li>تعطيل المنصة أو تجاوز الحماية أو إرسال محتوى ضار.</li>
              <li>انتحال صفة شخص آخر أو تقديم وثائق أو معلومات مضللة.</li>
              <li>استخدام بيانات التواصل أو روابط Meet للمضايقة أو لأغراض غير مرتبطة بالمقابلة.</li>
              <li>نسخ أو استغلال محتوى المنصة تجارياً دون موافقة مكتوبة.</li>
            </ul>
          </LegalSection>

          <LegalSection title="8. الملكية الفكرية">
            <p>
              تعود حقوق الموقع والشعارات والتصاميم والنصوص والمواد المنشورة إلى مؤسسة أطر الغد أو أصحابها المرخصين. لا يمنح استعمال المنصة أي حق ملكية، ويُسمح فقط بالاستخدام الشخصي المرتبط بالخدمات المقدمة.
            </p>
          </LegalSection>

          <LegalSection title="9. توفر الخدمة">
            <p>
              تسعى المؤسسة إلى إبقاء المنصة متاحة وآمنة، لكنها لا تضمن عدم انقطاعها. قد تتم أعمال صيانة أو تحديثات أو تغييرات ضرورية، وقد تتأثر الخدمة بأعطال الإنترنت أو البريد أو Google أو مزودي الاستضافة.
            </p>
          </LegalSection>

          <LegalSection title="10. حدود المسؤولية">
            <p>
              في الحدود التي يسمح بها القانون، لا تتحمل المؤسسة مسؤولية الأضرار غير المباشرة الناتجة عن سوء استخدام المنصة أو أعطال خارجية لا تملك السيطرة عليها. ولا يؤثر ذلك في الحقوق التي لا يمكن استبعادها قانوناً.
            </p>
          </LegalSection>

          <LegalSection title="11. التعليق والإنهاء">
            <p>
              يجوز للمؤسسة تعليق أو إنهاء الوصول عند مخالفة هذه الشروط، أو تهديد أمان المنصة، أو تقديم معلومات مزيفة، أو إساءة استخدام الخدمات. ويمكن للمستخدم طلب إغلاق حسابه وفق سياسة الخصوصية.
            </p>
          </LegalSection>

          <LegalSection title="12. القانون المطبق والتعديلات">
            <p>
              تخضع هذه الشروط للقوانين المعمول بها في المملكة المغربية. قد يتم تحديثها لتلائم تغيرات الخدمة أو المتطلبات القانونية، ويصبح الإصدار المنشور سارياً من تاريخ تحديثه المبين أعلى الصفحة.
            </p>
          </LegalSection>

          <LegalSection title="13. التواصل">
            <p>لأي سؤال بخصوص هذه الشروط أو استعمال المنصة، يرجى التواصل مع مؤسسة أطر الغد:</p>
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
