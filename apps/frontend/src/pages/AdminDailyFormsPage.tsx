import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  Power,
  RefreshCw,
  UserX,
} from "lucide-react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { formatMoroccoDateTime } from "@/lib/morocco-time";
import { trpc } from "@/providers/trpc";

export default function AdminDailyFormsPage() {
  const { user, isLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/admin/login",
  });
  const allowed = user?.role === "admin" && user.adminRole === "super_admin";
  const utils = trpc.useUtils();
  const forms = trpc.dailyForms.list.useQuery(undefined, {
    enabled: allowed,
    retry: false,
    refetchInterval: 15000,
  });
  const [formUrl, setFormUrl] = useState("");
  const [formDate, setFormDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(
      new Date(),
    ),
  );
  const [editDates, setEditDates] = useState<Record<number, string>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const status = trpc.dailyForms.status.useQuery(
    { formKey: selectedKey ?? "" },
    { enabled: allowed && Boolean(selectedKey), retry: false },
  );
  const add = trpc.dailyForms.add.useMutation({
    onSuccess: async () => {
      toast.success("تمت إضافة الاستمارة وبدأ احتساب مدة 24 ساعة");
      setFormUrl("");
      await utils.dailyForms.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const setActive = trpc.dailyForms.setActive.useMutation({
    onSuccess: async () => {
      await utils.dailyForms.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const setDate = trpc.dailyForms.setDate.useMutation({
    onSuccess: async () => {
      toast.success("تم تصحيح تاريخ الاستمارة");
      await utils.dailyForms.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  if (isLoading) return <div className="p-20 text-center">جارٍ التحميل…</div>;
  if (!allowed) return <Navigate to="/admin/profile" replace />;
  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6" lang="ar" dir="rtl">
      <main className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-[linear-gradient(125deg,#102f2b,#4A9B8E)] p-5 text-white sm:p-8">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-bold"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى الإدارة
          </Link>
          <h1 className="mt-6 text-3xl font-black">إدارة الاستمارات اليومية</h1>
          <p className="mt-2 text-white/75">
            أضيفوا الرابط فقط. يبدأ احتساب 24 ساعة فور الإضافة حسب ساعة الخادم
            بالمغرب.
          </p>
        </header>
        <form
          className="rounded-3xl border bg-white p-5 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate({ formUrl, formDate });
          }}
        >
          <h2 className="flex items-center gap-2 text-xl font-black">
            <ClipboardList className="h-5 w-5 text-sky-700" />
            إضافة استمارة
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              dir="ltr"
              type="date"
              required
              value={formDate}
              onChange={(event) => setFormDate(event.target.value)}
              className="sm:w-44"
            />
            <Input
              dir="ltr"
              type="url"
              required
              placeholder="https://forms.gle/..."
              value={formUrl}
              onChange={(event) => setFormUrl(event.target.value)}
            />
            <Button
              disabled={add.isPending}
              className="shrink-0 bg-sky-700 hover:bg-sky-800"
            >
              {add.isPending ? "جارٍ الإضافة…" : "إضافة وبدء التوقيت"}
            </Button>
          </div>
        </form>
        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="text-xl font-black">الاستمارات المنشورة</h2>
              <p className="mt-1 text-sm text-slate-500">
                5 نقاط خلال 24 ساعة، ثم 3 نقاط.
              </p>
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={() => forms.refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="divide-y">
            {forms.data?.map((form) => (
              <article key={form.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{form.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${form.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {form.isActive ? "نشطة" : "مخفية"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      النشر:{" "}
                      <span dir="ltr">
                        {formatMoroccoDateTime(form.publishedAt)}
                      </span>{" "}
                      · نهاية 5 نقاط:{" "}
                      <span dir="ltr">
                        {formatMoroccoDateTime(form.fullPointsDeadline)}
                      </span>
                    </p>
                    <p className="mt-2 font-bold text-emerald-700">
                      {form.submittedCount} أرسلوا /{" "}
                      {Math.max(0, form.totalCandidates - form.submittedCount)}{" "}
                      لم يرسلوا
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={form.formUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="ml-1 h-4 w-4" />
                        فتح
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelectedKey(
                          selectedKey === form.formKey ? null : form.formKey,
                        )
                      }
                    >
                      <Eye className="ml-1 h-4 w-4" />
                      التفاصيل
                    </Button>
                    <Input
                      dir="ltr"
                      type="date"
                      value={editDates[form.id] ?? ""}
                      onChange={(event) =>
                        setEditDates((dates) => ({ ...dates, [form.id]: event.target.value }))
                      }
                      className="h-9 w-36"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!editDates[form.id] || setDate.isPending}
                      onClick={() => setDate.mutate({ id: form.id, formDate: editDates[form.id] })}
                    >
                      تصحيح التاريخ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setActive.isPending}
                      onClick={() =>
                        setActive.mutate({
                          id: form.id,
                          active: !form.isActive,
                        })
                      }
                    >
                      <Power className="ml-1 h-4 w-4" />
                      {form.isActive ? "إخفاء" : "إظهار"}
                    </Button>
                  </div>
                </div>
                {selectedKey === form.formKey ? (
                  <div className="mt-4 rounded-2xl border bg-slate-50 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {status.isLoading ? (
                        <p className="p-4 text-slate-500">
                          جارٍ تحميل القائمة…
                        </p>
                      ) : (
                        status.data?.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="flex items-center gap-3 rounded-xl bg-white p-3"
                          >
                            <span
                              className={`rounded-full p-2 ${candidate.submittedAt ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {candidate.submittedAt ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <UserX className="h-4 w-4" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold">
                                {candidate.firstName} {candidate.lastName}
                              </p>
                              <p
                                className="truncate text-xs text-slate-500"
                                dir="ltr"
                              >
                                {candidate.email}
                              </p>
                            </div>
                            <b
                              className={
                                candidate.submittedAt
                                  ? "text-emerald-700"
                                  : "text-slate-400"
                              }
                            >
                              {candidate.submittedAt
                                ? `+${candidate.points}`
                                : "لم يرسل"}
                            </b>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
            {!forms.isLoading && !forms.data?.length ? (
              <p className="p-10 text-center text-slate-500">
                لم تتم إضافة أي استمارة بعد.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
