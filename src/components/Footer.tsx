import { Link } from "react-router";
import { Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#2D5F56] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <img src="/images/logo.png" alt="مؤسسة أطر الغد" className="h-14 w-auto" />
            <p className="text-sm text-white/80 leading-relaxed">
              مؤسسة أطر الغد هي مؤسسة مغربية تُوجّه أنشطتها أساسًا إلى طلبة وخريجي المعاهد العليا،
              من مهندسين ومسيرين وأطباء، ترمي إلى تأهيل شباب مغربي معتز بهويته، حامل لقيم الصدق والأمانة وحب الوطن،
              قوي في تخصصه العلمي، وممتلك للمعارف الضرورية ، من أجل بناء جيل قادر على تحقيق حلم النهضة،
              والارتقاء بالوطن إلى أعلى المراتب الحضارية
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">الصفحات</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-white/80 hover:text-white transition-colors">الرئيسية</Link></li>
              <li><Link to="/news" className="text-sm text-white/80 hover:text-white transition-colors">أخبارنا</Link></li>
              <li><a href="/#contact" className="text-sm text-white/80 hover:text-white transition-colors">تواصل معنا</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">يمكنك التواصل معنا عبر:</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Mail className="w-4 h-4 text-[#6BC4B2]" />
                example@email.com
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Phone className="w-4 h-4 text-[#6BC4B2]" />
                <span dir="ltr">+212 6XXXXXXXX</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-white/60">
          © 2024 مؤسسة أطر الغد. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
