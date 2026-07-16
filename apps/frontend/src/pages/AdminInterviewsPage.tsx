import { ArrowRight, CalendarClock, LogOut } from "lucide-react";
import { Link, Navigate } from "react-router";
import AdminInterviews from "@/components/AdminInterviews";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function AdminInterviewsPage() {
  const { user, isLoading, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/admin/login",
  });
  const isAdmin = user?.role === "admin";
  const isInterviewAdmin = user?.adminRole === "interview_admin";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4A9B8E] border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 text-[#4A9B8E]">
              <CalendarClock className="h-7 w-7" />
              <p className="text-sm font-semibold">لوحة الإدارة</p>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">إدارة المقابلات الشفوية</h1>
            <p className="mt-1 text-sm text-slate-500">
              إنشاء المواعيد، إضافة روابط Google Meet ومتابعة حجوزات المترشحين.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isInterviewAdmin ? <Link to="/admin">
              <Button variant="outline">
                <ArrowRight className="ml-2 h-4 w-4" /> العودة إلى لوحة الإدارة
              </Button>
            </Link> : null}
            <Button variant="outline" onClick={logout} className="text-red-600 hover:text-red-700">
              <LogOut className="ml-2 h-4 w-4" /> تسجيل الخروج
            </Button>
          </div>
        </header>

        <AdminInterviews enabled={isAdmin} adminRole={user?.adminRole} adminName={user?.name} />
      </div>
    </div>
  );
}
