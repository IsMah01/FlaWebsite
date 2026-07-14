import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useViewerSession } from "@/hooks/useViewerSession";
import { LogOut, Menu, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { viewer, isAuthenticated, logout, hasAmbassadorView, isAcceptedCandidate } = useViewerSession();

  const isHome = location.pathname === "/";

  const scrollToSection = (id: string) => {
    if (!isHome) {
      navigate({ pathname: "/", hash: `#${id}` });
      setMenuOpen(false);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setMenuOpen(false);
  };

  const navLinks = [
    ...(isAcceptedCandidate
      ? [{ label: "موعد المقابلة", action: () => { navigate("/interview"); setMenuOpen(false); } }]
      : []),
    { label: "الرئيسية", action: () => scrollToSection("hero") },
    ...(!hasAmbassadorView
      ? [
          { label: "من نحن", action: () => scrollToSection("about") },
          { label: "أهدافنا", action: () => scrollToSection("goals") },
        ]
      : []),
    { label: "الأخبار", action: () => { navigate("/news"); setMenuOpen(false); } },
    { label: "أنشطتنا", action: () => scrollToSection("activities") },
    ...(!hasAmbassadorView
      ? [
          { label: "الأكاديمية في أرقام", action: () => scrollToSection("numbers") },
          { label: "اتصل بنا", action: () => scrollToSection("contact") },
        ]
      : []),
  ];

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#4A9B8E]/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="مؤسسة أطر الغد" className="h-10 w-auto" />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={link.action}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#4A9B8E] transition-colors rounded-lg hover:bg-[#4A9B8E]/5"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {isAuthenticated && viewer ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  <User className="w-4 h-4 text-[#4A9B8E]" />
                  {viewer.name || viewer.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Link to="/signin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#4A9B8E] hover:text-[#3D7A6F] hover:bg-[#4A9B8E]/5"
                  >
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-[#4A9B8E] hover:bg-[#3D7A6F] text-white">
                    التسجيل
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden max-h-[calc(100svh-4rem)] overflow-y-auto bg-white border-t border-gray-100 px-4 py-4 space-y-2 shadow-lg">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={link.action}
              className="block w-full text-right px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#4A9B8E] hover:bg-[#4A9B8E]/5 rounded-lg transition-colors"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2 sm:flex-row">
            {isAuthenticated && viewer ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="text-red-500 hover:text-red-600"
              >
                <LogOut className="w-4 h-4 ml-2" />
                تسجيل الخروج
              </Button>
            ) : (
              <>
                <Link to="/signin" onClick={() => setMenuOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full text-[#4A9B8E] border-[#4A9B8E]">
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="flex-1">
                  <Button className="w-full bg-[#4A9B8E] hover:bg-[#3D7A6F] text-white">
                    التسجيل
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
