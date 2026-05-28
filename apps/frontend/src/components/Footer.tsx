import { Link } from "react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { contactLinks, homeSectionPath, socialLinks } from "@/lib/site-links";

export default function Footer() {
  return (
    <footer className="bg-[#2D5F56] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <img src="/images/logo.png" alt="مؤسسة أطر الغد" className="h-14 w-auto" />
            <p className="text-sm text-white/80 leading-relaxed">
              مؤسسة أطر الغد هي مؤسسة مغربية توجه أنشطتها أساسا إلى طلبة وخريجي المعاهد العليا،
              من مهندسين ومسيرين وأطر، بهدف تأهيل شباب مغربي معتز بهويته.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">روابط سريعة</h3>
            <ul className="space-y-2">
              <li><Link to={homeSectionPath("hero")} className="text-sm text-white/80 hover:text-white transition-colors">الرئيسية</Link></li>
              <li><Link to="/news" className="text-sm text-white/80 hover:text-white transition-colors">الأخبار</Link></li>
              <li><Link to={homeSectionPath("activities")} className="text-sm text-white/80 hover:text-white transition-colors">أنشطتنا</Link></li>
              <li><Link to="/signup" className="text-sm text-white/80 hover:text-white transition-colors">التسجيل</Link></li>
              <li><Link to="/signin" className="text-sm text-white/80 hover:text-white transition-colors">تسجيل الدخول</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">معلومات الاتصال</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Mail className="w-4 h-4 text-[#6BC4B2]" />
                <a href={contactLinks.emailHref} className="hover:text-white transition-colors">
                  {contactLinks.email}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Phone className="w-4 h-4 text-[#6BC4B2]" />
                <a href={contactLinks.phoneHref} className="hover:text-white transition-colors">
                  {contactLinks.phone}
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm text-white/80">
                <MapPin className="w-4 h-4 text-[#6BC4B2] mt-0.5" />
                <a href={contactLinks.locationHref} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  المغرب
                </a>
              </li>
            </ul>
            <div className="flex items-center gap-3 pt-2">
              <a href={socialLinks.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href={socialLinks.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href={socialLinks.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
              <a href={socialLinks.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-white/60">
          © 2024 مؤسسة أطر الغد. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
