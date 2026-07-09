import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Download, FileText, LogOut, Mail, MessageSquareText, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { candidateQuestionnaireFields } from "@/data/candidate-questionnaire";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

type Tab = "newUsers" | "users" | "candidates" | "messages" | "subscribers";

function fileUrl(ref?: string | null) {
  if (!ref?.startsWith("private://")) return null;
  return `/api/private-files/${encodeURIComponent(ref.replace("private://", ""))}`;
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.info("لا توجد بيانات للتصدير");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(";"),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(";")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDateDMYH(value?: string | Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDateYMDH(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatDateYMD(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function messageExcerpt(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 140 ? `${compact.slice(0, 140)}...` : compact;
}

function mapStudyStatus(studyStatus?: string | null) {
  switch (studyStatus) {
    case "student":
      return "طالب";
    case "graduated":
      return "خريج";
    case "master_student":
      return "طالب ماستر";
    case "phd_student":
      return "طالب دكتوراه";
    case "other":
      return "أخرى";
    default:
      return studyStatus || "-";
  }
}

function mapUserRole(role?: string | null) {
  switch ((role || "").toLowerCase()) {
    case "candidate":
      return "مترشح";
    case "ambassador":
      return "سفير";
    case "user":
      return "مستخدم";
    default:
      return role || "-";
  }
}

function normalizeCell(value?: string | null) {
  return (value || "").replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim();
}

function mapBooleanLike(value?: string | null) {
  const normalized = normalizeCell(value).toLowerCase();
  if (normalized === "yes" || normalized === "true") return "نعم";
  if (normalized === "no" || normalized === "false") return "لا";
  return normalizeCell(value);
}

function mapGender(value?: string | null) {
  const normalized = normalizeCell(value).toLowerCase();
  if (normalized === "female") return "أنثى";
  if (normalized === "male") return "ذكر";
  return normalizeCell(value);
}

function asExcelText(value?: string | null) {
  const text = normalizeCell(value);
  return text ? `'${text}` : "";
}

function normalizeQuestionnaireLabel(label: string) {
  const compact = label.replace(/\s+/g, " ").trim();
  const parts = compact.split(" / ").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts[1];
  }
  const lines = label.split("\n").map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines[0];
  }
  return compact;
}

const questionnaireFieldLabelByKey = new Map(
  candidateQuestionnaireFields.map((field) => [field.key, field.label.replace(/\s+/g, " ").trim()]),
);

const questionnaireCsvColumns = candidateQuestionnaireFields.map((field) => ({
  key: field.key,
  label: ((
    labels: Record<string, string>,
  ) => labels[field.key] || normalizeQuestionnaireLabel(field.label))({
    last_name: "الاسم العائلي",
    first_name: "الاسم الشخصي",
    sex: "الجنس",
    birthday: "تاريخ الازدياد",
    nationality: "الجنسية",
    birthplace: "المدينة الأصلية",
    are_you: "هل أنت؟",
    institute: "المعهد أو المؤسسة",
    specialty: "التخصص",
    academic_level: "المستوى الدراسي أو سنة التخرج",
    city_of_study_or_work: "مدينة الدراسة أو العمل",
    languages: "اللغات",
    phone_number: "رقم الهاتف",
    whatsapp_number: "رقم الواتساب",
    facebook_link: "رابط الفايسبوك",
    linkedin_link: "رابط لينكدإن",
    instagram_link: "رابط الإنستغرام",
    other_platform_link: "منصة أخرى",
    chronic_diseases: "الأمراض المزمنة أو الحساسية",
    member_of_association: "عضو في جمعية أو نادٍ",
    association_name_or_reason: "اسم الجمعية أو سبب عدم الانخراط",
    mission_and_gain: "المهمة داخل الجمعية وما تم اكتسابه",
    participated_in_project: "شارك في مشروع",
    project_description: "وصف المشروع والمساهمة",
    future_project_willingness_1: "الاستعداد لمشروع مستقبلي",
    future_project_willingness_2: "الاستعداد المستقبلي",
    knowledge_means: "وسائل اكتساب المعرفة",
    most_influential_material: "أكثر مادة معرفية أثرت فيه",
    major_accomplishments: "أهم الإنجازات",
    interests: "مجالات الاهتمام",
    talents: "المواهب",
    goals_in_life: "الأهداف في الحياة",
    three_characters: "ثلاث صفات مميزة",
    teamwork_under_pressure: "العمل ضمن الفريق وتحت الضغط",
    role_model: "القدوة",
    participated_in_academy: "شارك سابقا في الأكاديمية",
    how_did_you_know_academy: "كيف تعرف على الأكاديمية",
    motivation_to_participate: "الحافز للمشاركة",
    desired_activities_course_16: "الأنشطة المرغوبة في الدورة 16",
  }),
}));

function parseQuestionnaireAnswers(value?: string | null) {
  if (!value) return [] as Array<{ key: string; label: string; answer: string }>;

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return Object.entries(parsed)
      .filter(([, answer]) => (answer ?? "").trim().length > 0)
      .map(([key, answer]) => ({
        key,
        label: questionnaireFieldLabelByKey.get(key) || key,
        answer: normalizeCell(answer),
      }));
  } catch {
    return [] as Array<{ key: string; label: string; answer: string }>;
  }
}

function questionnaireAnswersToRecord(value?: string | null) {
  const answersByKey = new Map(parseQuestionnaireAnswers(value).map((item) => [item.key, item.answer]));
  return Object.fromEntries(
    questionnaireCsvColumns.map((column) => {
      const raw = answersByKey.get(column.key) || "";
      const value =
        column.key === "sex" ? mapGender(raw) :
        column.key === "member_of_association" || column.key === "participated_in_project" || column.key === "participated_in_academy"
          ? mapBooleanLike(raw)
          : column.key === "phone_number" || column.key === "whatsapp_number"
            ? asExcelText(raw)
            : normalizeCell(raw);
      return [column.label, value];
    }),
  );
}

export default function AdminDashboard() {
  const { user, isLoading, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/admin/login",
  });
  const [tab, setTab] = useState<Tab>("newUsers");
  const [search, setSearch] = useState("");
  const [ambassadorMessageAuthorFilter, setAmbassadorMessageAuthorFilter] = useState("");
  const [ambassadorMessageDateFilter, setAmbassadorMessageDateFilter] = useState("");
  const isAdmin = user?.role === "admin";

  const stats = trpc.admin.stats.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const candidates = trpc.admin.listCandidates.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const newUsers = trpc.admin.listNewUsers.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const platformUsers = trpc.admin.listUsers.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const messages = trpc.admin.listContactMessages.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const ambassadorMessages = trpc.admin.listAmbassadorMessages.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const subscribers = trpc.admin.listNewsletterSubscribers.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const utils = trpc.useUtils();

  const updateStatus = trpc.admin.updateCandidateStatus.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث حالة المترشح بنجاح");
      await utils.admin.listCandidates.invalidate();
      await utils.admin.stats.invalidate();
    },
    onError: (err) => toast.error(err.message || "فشل تحديث حالة المترشح"),
  });

  const deleteNewUser = trpc.admin.deleteNewUser.useMutation({
    onSuccess: async () => {
      toast.success("Utilisateur supprime");
      await Promise.all([
        utils.admin.listNewUsers.invalidate(),
        utils.admin.listUsers.invalidate(),
        utils.admin.listCandidates.invalidate(),
        utils.admin.listNewsletterSubscribers.invalidate(),
        utils.admin.stats.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message || "Impossible de supprimer l'utilisateur"),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      toast.success("Utilisateur supprime");
      await Promise.all([
        utils.admin.listUsers.invalidate(),
        utils.admin.listNewUsers.invalidate(),
        utils.admin.listCandidates.invalidate(),
        utils.admin.listNewsletterSubscribers.invalidate(),
        utils.admin.stats.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message || "Impossible de supprimer l'utilisateur"),
  });

  const deleteAmbassadorMessage = trpc.admin.deleteAmbassadorMessage.useMutation({
    onSuccess: async () => {
      toast.success("Message supprime");
      await Promise.all([
        utils.admin.listAmbassadorMessages.invalidate(),
        utils.admin.stats.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message || "Impossible de supprimer le message"),
  });

  function handleDeleteNewUser(id: number, label: string) {
    if (!window.confirm(`Supprimer le compte ${label || id} ? Cette action est definitive.`)) return;
    deleteNewUser.mutate({ id });
  }

  function handleDeleteUser(id: number, label: string) {
    if (!window.confirm(`Supprimer l'utilisateur ${label || id} ? Cette action est definitive.`)) return;
    deleteUser.mutate({ id });
  }

  function handleDeleteAmbassadorMessage(id: number, label: string, text: string) {
    const excerpt = messageExcerpt(text);
    if (!window.confirm(`Supprimer le message de ${label || id} ?\n\n"${excerpt}"\n\nCette action est definitive.`)) return;
    deleteAmbassadorMessage.mutate({ id });
  }

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = candidates.data ?? [];
    if (!q) return list;
    return list.filter((candidate) =>
      `${candidate.firstName} ${candidate.lastName} ${candidate.email} ${candidate.phoneNumber}`
        .toLowerCase()
        .includes(q),
    );
  }, [candidates.data, search]);

  const filteredAmbassadorMessages = useMemo(() => {
    const authorQuery = ambassadorMessageAuthorFilter.trim().toLowerCase();
    const dateQuery = ambassadorMessageDateFilter;

    return (ambassadorMessages.data ?? []).filter((message) => {
      const authorText = `${message.authorName} ${message.authorType}`.toLowerCase();
      const matchesAuthor = !authorQuery || authorText.includes(authorQuery);
      const matchesDate = !dateQuery || formatDateYMD(message.createdAt) === dateQuery;
      return matchesAuthor && matchesDate;
    });
  }, [ambassadorMessages.data, ambassadorMessageAuthorFilter, ambassadorMessageDateFilter]);

  const newUsersCsvRows = useMemo(
    () =>
      (newUsers.data ?? []).map((account) => ({
        "الاسم": account.name,
        "الهاتف": account.phone,
        "الوضعية الدراسية": mapStudyStatus(account.studyStatus),
        "البريد الإلكتروني": account.email,
        "البريد الإلكتروني مؤكد": account.emailConfirmed ? "نعم" : "لا",
        "الدور (user/ambassador)": account.role,
        "الوثائق": account.attestationUrl || account.documents || "",
        "دخول التاريخ": formatDateYMDH(account.loginDate),
      })),
    [newUsers.data],
  );

  const usersCsvRows = useMemo(
    () =>
      (platformUsers.data ?? []).map((entry) => ({
        "الاسم": entry.name || "-",
        "البريد الإلكتروني": entry.email || "-",
        "الهاتف": entry.phone || "-",
        "آخر دخول": formatDateYMDH(entry.lastLoginAt),
      })),
    [platformUsers.data],
  );

  const candidatesCsvRows = useMemo(
    () =>
      filteredCandidates.map((candidate) => ({
        "الاسم الكامل": `${candidate.firstName} ${candidate.lastName}`,
        "البريد الإلكتروني": candidate.email,
        "الهاتف": asExcelText(candidate.phoneNumber),
        "الوضعية الدراسية": mapStudyStatus(candidate.studyStatus),
        "البريد الإلكتروني مؤكد": candidate.emailConfirmed ? "نعم" : "لا",
        "شهادة التمدرس": fileUrl(candidate.attestationUrl) || candidate.attestationUrl || "",
        ...questionnaireAnswersToRecord(candidate.questionnaireAnswers),
        "القرار": candidate.applicationStatus ?? "pending",
      })),
    [filteredCandidates],
  );

  const messagesCsvRows = useMemo(
    () =>
      (messages.data ?? []).map((message) => ({
        "الاسم": message.name,
        "البريد الإلكتروني": message.email,
        "الهاتف": message.phone || "-",
        "الموضوع": message.subject,
        "الرسالة": message.message,
        "التاريخ": formatDateDMYH(message.createdAt),
      })),
    [messages.data],
  );

  const ambassadorMessagesCsvRows = useMemo(
    () =>
      filteredAmbassadorMessages.map((message) => ({
        "Ø§Ù„ÙƒØ§ØªØ¨": message.authorName,
        "Ø§Ù„Ø¯ÙˆØ±": message.authorType === "admin" ? "Ø¥Ø¯Ø§Ø±Ø©" : "Ø³ÙÙŠØ±",
        "Ø§Ù„Ø±Ø³Ø§Ù„Ø©": message.message,
        "Ø§Ù„ØªØ§Ø±ÙŠØ®": formatDateDMYH(message.createdAt),
      })),
    [filteredAmbassadorMessages],
  );

  const subscribersCsvRows = useMemo(
    () =>
      (subscribers.data ?? []).map((subscriber) => ({
        "الاسم": subscriber.name || "-",
        "البريد الإلكتروني": subscriber.email,
        "الهاتف": subscriber.phone || "-",
        "الوضعية الدراسية": mapStudyStatus(subscriber.studyStatus),
        "تاريخ الاشتراك": formatDateYMDH(subscriber.subscribedAt),
      })),
    [subscribers.data],
  );

  if (isLoading) {
    return (
      <div dir="rtl" lang="ar" className="min-h-screen flex items-center justify-center">
        جاري التحميل...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div dir="rtl" lang="ar" className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-xl font-bold">الوصول مرفوض</h1>
          <p className="mb-6 text-slate-600">هذه الصفحة مخصصة للمديرين فقط.</p>
          <Link to="/">
            <Button>العودة إلى الصفحة الرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  const accessError =
    stats.error ??
    newUsers.error ??
    platformUsers.error ??
    candidates.error ??
    messages.error ??
    ambassadorMessages.error ??
    subscribers.error;

  if (accessError?.data?.code === "UNAUTHORIZED" || accessError?.data?.code === "FORBIDDEN") {
    return (
      <div dir="rtl" lang="ar" className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-xl font-bold">الوصول مرفوض</h1>
          <p className="mb-6 text-slate-600">قم بتسجيل الدخول باستخدام حساب إدارة داخلي للوصول إلى لوحة الإدارة.</p>
          <Link to="/admin/login">
            <Button>تسجيل الدخول</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500">لوحة الإدارة</p>
            <h1 className="text-2xl font-bold text-slate-900">إدارة الترشحات والمحتوى</h1>
            <p className="mt-1 text-sm text-slate-500">تم تسجيل الدخول باسم: {user.name || user.email || user.unionId}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="ml-2 h-4 w-4" /> تحديث
            </Button>
            <Button variant="outline" onClick={logout} className="text-red-600 hover:text-red-700">
              <LogOut className="ml-2 h-4 w-4" /> تسجيل الخروج
            </Button>
            <Link to="/">
              <Button variant="outline">الموقع</Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Users className="mb-3 h-5 w-5 text-[#4A9B8E]" />
            <p className="text-sm text-slate-500">المترشحون</p>
            <p className="text-3xl font-bold">{stats.data?.candidates ?? 0}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <ShieldCheck className="mb-3 h-5 w-5 text-[#4A9B8E]" />
            <p className="text-sm text-slate-500">المترشحون المقبولون</p>
            <p className="text-3xl font-bold">{stats.data?.acceptedCandidates ?? 0}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Mail className="mb-3 h-5 w-5 text-[#4A9B8E]" />
            <p className="text-sm text-slate-500">رسائل التواصل</p>
            <p className="text-3xl font-bold">{stats.data?.messages ?? 0}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <MessageSquareText className="mb-3 h-5 w-5 text-[#4A9B8E]" />
            <p className="text-sm text-slate-500">رسائل السفراء</p>
            <p className="text-3xl font-bold">{stats.data?.ambassadorMessages ?? 0}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <FileText className="mb-3 h-5 w-5 text-[#4A9B8E]" />
            <p className="text-sm text-slate-500">الدورات</p>
            <p className="text-3xl font-bold">{stats.data?.editions ?? 0}</p>
          </div>
        </section>

        <nav className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3 shadow-sm">
          <Button variant={tab === "newUsers" ? "default" : "outline"} onClick={() => setTab("newUsers")}>
            المستخدمون الجدد
          </Button>
          <Button variant={tab === "users" ? "default" : "outline"} onClick={() => setTab("users")}>
            المستخدمون
          </Button>
          <Button variant={tab === "candidates" ? "default" : "outline"} onClick={() => setTab("candidates")}>
            المترشحون
          </Button>
          <Button variant={tab === "messages" ? "default" : "outline"} onClick={() => setTab("messages")}>
            رسائل التواصل
          </Button>
          <Button variant={tab === "subscribers" ? "default" : "outline"} onClick={() => setTab("subscribers")}>
            المشتركين في النشرة
          </Button>
        </nav>

        {tab === "newUsers" && (
          <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-4 flex justify-end">
              <Button variant="outline" onClick={() => downloadCsv("new-users.csv", newUsersCsvRows)}>
                <Download className="ml-2 h-4 w-4" /> csv تصدير new_user
              </Button>
            </div>
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">الهاتف</th>
                  <th className="p-3 text-right">الوضعية الدراسية</th>
                  <th className="p-3 text-right">البريد الإلكتروني</th>
                  <th className="p-3 text-right">البريد الإلكتروني مؤكد</th>
                  <th className="p-3 text-right">الدور (user/ambassador)</th>
                  <th className="p-3 text-right">الوثائق</th>
                  <th className="p-3 text-right">دخول التاريخ</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(newUsers.data ?? []).map((account) => {
                  const documentHref = fileUrl(account.attestationUrl);
                  return (
                    <tr key={account.id} className="border-b last:border-b-0">
                      <td className="p-3">{account.name}</td>
                      <td className="p-3">{account.phone}</td>
                      <td className="p-3">{mapStudyStatus(account.studyStatus)}</td>
                      <td className="p-3">{account.email}</td>
                      <td className="p-3">{account.emailConfirmed ? "نعم" : "لا"}</td>
                      <td className="p-3">{mapUserRole(account.role)}</td>
                      <td className="p-3">
                        {documentHref ? (
                          <a className="text-[#4A9B8E] underline" href={documentHref} target="_blank" rel="noreferrer">
                            عرض الوثيقة
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3">{formatDateYMDH(account.loginDate)}</td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteNewUser.isPending}
                          onClick={() => handleDeleteNewUser(account.id, account.email)}
                        >
                          <Trash2 className="ml-2 h-4 w-4" /> Supprimer
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {tab === "users" && (
          <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-4 flex justify-end">
              <Button variant="outline" onClick={() => downloadCsv("users.csv", usersCsvRows)}>
                <Download className="ml-2 h-4 w-4" /> csv تصدير user
              </Button>
            </div>
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">البريد الإلكتروني</th>
                  <th className="p-3 text-right">الهاتف</th>
                  <th className="p-3 text-right">آخر دخول</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(platformUsers.data ?? []).map((entry) => (
                  <tr key={entry.id} className="border-b last:border-b-0">
                    <td className="p-3">{entry.name || "-"}</td>
                    <td className="p-3">{entry.email || "-"}</td>
                    <td className="p-3">{entry.phone || "-"}</td>
                    <td className="p-3">{formatDateYMDH(entry.lastLoginAt)}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteUser.isPending || entry.role === "admin" || entry.status === "admin"}
                        onClick={() => handleDeleteUser(entry.id, entry.email || entry.name || String(entry.id))}
                      >
                        <Trash2 className="ml-2 h-4 w-4" /> Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {tab === "candidates" && (
          <section className="overflow-hidden rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Input
                placeholder="بحث بالاسم، البريد الإلكتروني أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="md:max-w-sm"
              />
              <Button variant="outline" onClick={() => downloadCsv("candidats.csv", candidatesCsvRows)}>
                <Download className="ml-2 h-4 w-4" /> csv تصدير المترشحين
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3 text-right">المترشح</th>
                    <th className="p-3 text-right">البريد الإلكتروني</th>
                    <th className="p-3 text-right">الهاتف</th>
                    <th className="p-3 text-right">الوضعية الدراسية</th>
                    <th className="p-3 text-right">البريد الإلكتروني مؤكد</th>
                    <th className="p-3 text-right">الوثائق</th>
                    <th className="p-3 text-right">أجوبة الاستمارة</th>
                    <th className="p-3 text-right">القرار</th>
                    <th className="p-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const attestation = fileUrl(candidate.attestationUrl);
                    const questionnaireAnswers = parseQuestionnaireAnswers(candidate.questionnaireAnswers);

                    return (
                      <tr key={candidate.id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="p-3 font-medium">{candidate.firstName} {candidate.lastName}</td>
                        <td className="p-3">{candidate.email}</td>
                        <td className="p-3">{candidate.phoneNumber}</td>
                        <td className="p-3">{mapStudyStatus(candidate.studyStatus)}</td>
                        <td className="p-3">{candidate.emailConfirmed ? "نعم" : "لا"}</td>
                        <td className="space-x-2 space-x-reverse p-3">
                          {attestation ? (
                            <a className="text-[#4A9B8E] underline" href={attestation} target="_blank" rel="noreferrer">
                              شهادة التمدرس
                            </a>
                          ) : (
                            <span className="text-slate-400">لا توجد شهادة</span>
                          )}
                        </td>
                        <td className="p-3 align-top">
                          {questionnaireAnswers.length ? (
                            <div className="max-h-64 space-y-2 overflow-y-auto">
                              {questionnaireAnswers.map((item) => (
                                <div key={item.key} className="rounded-lg bg-slate-50 p-2">
                                  <p className="text-xs font-semibold text-slate-600">{item.label}</p>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">
                                    {item.answer}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">لا توجد أجوبة</span>
                          )}
                        </td>
                        <td className="p-3">{candidate.applicationStatus ?? "pending"}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus.mutate({ candidateId: candidate.id, status: "pending" })}
                            >
                              قيد المعالجة
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => updateStatus.mutate({ candidateId: candidate.id, status: "accepted" })}
                            >
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateStatus.mutate({ candidateId: candidate.id, status: "rejected" })}
                            >
                              رفض
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "messages" && (
          <div className="space-y-4">
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">فضاء السفراء للنقاش</h2>
                  <p className="text-sm text-slate-500">رسائل السفراء والإدارة الظاهرة في فضاء النقاش.</p>
                </div>
                <Button variant="outline" onClick={() => downloadCsv("ambassador-messages.csv", ambassadorMessagesCsvRows)}>
                  <Download className="ml-2 h-4 w-4" /> csv تصدير
                </Button>
              </div>
              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <Input
                  placeholder="Rechercher par auteur ou role..."
                  value={ambassadorMessageAuthorFilter}
                  onChange={(event) => setAmbassadorMessageAuthorFilter(event.target.value)}
                />
                <Input
                  type="date"
                  value={ambassadorMessageDateFilter}
                  onChange={(event) => setAmbassadorMessageDateFilter(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAmbassadorMessageAuthorFilter("");
                    setAmbassadorMessageDateFilter("");
                  }}
                >
                  Reinitialiser
                </Button>
              </div>
              <div className="space-y-3">
                {filteredAmbassadorMessages.map((message) => (
                  <article key={message.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold">{message.authorName}</h3>
                        <p className="text-xs text-[#4A9B8E]">
                          {message.authorType === "admin" ? "إدارة" : "سفير"} - {formatDateDMYH(message.createdAt)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleDeleteAmbassadorMessage(message.id, message.authorName, message.message)}
                        disabled={deleteAmbassadorMessage.isPending}
                      >
                        <Trash2 className="ml-2 h-4 w-4" /> حذف
                      </Button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-slate-800">{message.message}</p>
                  </article>
                ))}
                {filteredAmbassadorMessages.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-center text-sm text-slate-500">
                    لا توجد رسائل في فضاء السفراء.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-4 flex justify-end">
                <Button variant="outline" onClick={() => downloadCsv("messages-contact.csv", messagesCsvRows)}>
                  <Download className="ml-2 h-4 w-4" /> csv تصدير الرسائل
                </Button>
              </div>
              <div className="space-y-3">
                {(messages.data ?? []).map((message) => (
                  <article key={message.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <h3 className="font-semibold">{message.subject}</h3>
                      <p className="text-sm text-slate-500">{formatDateDMYH(message.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {message.name} - {message.email} {message.phone ? `- ${message.phone}` : ""}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-slate-800">{message.message}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "subscribers" && (
          <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-4 flex justify-end">
              <Button variant="outline" onClick={() => downloadCsv("newsletter.csv", subscribersCsvRows)}>
                <Download className="ml-2 h-4 w-4" /> csv تصدير المشتركين
              </Button>
            </div>
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">البريد الإلكتروني</th>
                  <th className="p-3 text-right">الهاتف</th>
                  <th className="p-3 text-right">الوضعية الدراسية</th>
                  <th className="p-3 text-right">تاريخ الاشتراك</th>
                </tr>
              </thead>
              <tbody>
                {(subscribers.data ?? []).map((subscriber) => (
                  <tr key={subscriber.id} className="border-b last:border-b-0">
                    <td className="p-3">{subscriber.name || "-"}</td>
                    <td className="p-3">{subscriber.email}</td>
                    <td className="p-3">{subscriber.phone || "-"}</td>
                    <td className="p-3">{mapStudyStatus(subscriber.studyStatus)}</td>
                    <td className="p-3">{formatDateYMDH(subscriber.subscribedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}


