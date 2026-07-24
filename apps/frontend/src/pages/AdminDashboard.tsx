import { useMemo, useState } from "react";
import { Link } from "react-router";
import { CalendarClock, Download, FileText, LogOut, Mail, MessageSquareText, RefreshCw, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { candidateQuestionnaireFields } from "@/data/candidate-questionnaire";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

type Tab = "newUsers" | "users" | "candidates" | "followUp" | "incomplete" | "messages" | "subscribers";
type CandidateFilterField =
  | "all"
  | "name"
  | "email"
  | "phone"
  | "studyStatus"
  | "role"
  | "emailConfirmed"
  | "applicationStatus"
  | "questionnaire"
  | "adminNote"
  | "dates";
type AccountFilterField = "all" | "name" | "email" | "phone" | "studyStatus" | "role" | "emailConfirmed" | "date";
type UserFilterField = "all" | "name" | "email" | "phone" | "role" | "status" | "date";

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

function excelEscape(value: unknown) {
  return (value === null || value === undefined ? "" : String(value))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadExcel(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.info("لا توجد بيانات للتصدير");
    return;
  }

  const headers = Object.keys(rows[0]);
  const table = [
    `<tr>${headers.map((header) => `<th>${excelEscape(header)}</th>`).join("")}</tr>`,
    ...rows.map((row) => `<tr>${headers.map((header) => `<td>${excelEscape(row[header])}</td>`).join("")}</tr>`),
  ].join("");
  const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${table}</table></body></html>`;
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" });
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

function formatPercent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
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
  kind: field.kind,
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
        column.kind === "date" ? asExcelText(raw) :
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

function parseQuestionnaireDraft(value: string) {
  try {
    const parsed = JSON.parse(value) as { answers?: Record<string, string> };
    return parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {};
  } catch {
    return {} as Record<string, string>;
  }
}

export default function AdminDashboard() {
  const { user, isLoading, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/admin/login",
  });
  const [tab, setTab] = useState<Tab>("newUsers");
  const [search, setSearch] = useState("");
  const [candidateFilterField, setCandidateFilterField] = useState<CandidateFilterField>("all");
  const [candidateFromDate, setCandidateFromDate] = useState("2026-07-17");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountFilterField, setAccountFilterField] = useState<AccountFilterField>("all");
  const [userSearch, setUserSearch] = useState("");
  const [userFilterField, setUserFilterField] = useState<UserFilterField>("all");
  const [ambassadorMessageAuthorFilter, setAmbassadorMessageAuthorFilter] = useState("");
  const [ambassadorMessageDateFilter, setAmbassadorMessageDateFilter] = useState("");
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.adminRole === "super_admin";


  const stats = trpc.admin.stats.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const candidates = trpc.admin.listCandidates.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const incompleteQuestionnaires = trpc.admin.listIncompleteQuestionnaires.useQuery(undefined, {
    retry: false,
    enabled: isAdmin,
  });
  const registrationsToFollowUp = trpc.admin.listRegistrationsToFollowUp.useQuery(undefined, {
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
  const setCandidateAmbassador = trpc.admin.setCandidateAmbassador.useMutation({
    onSuccess: async () => {
      toast.success("Statut ambassadeur mis à jour");
      await Promise.all([utils.admin.listCandidates.invalidate(), utils.admin.listNewUsers.invalidate(), utils.admin.stats.invalidate()]);
    },
    onError: (err) => toast.error(err.message || "Impossible de modifier le statut ambassadeur"),
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
    const fromDate = candidateFromDate ? new Date(`${candidateFromDate}T00:00:00`).getTime() : null;
    const list = (candidates.data ?? []).filter((candidate) => (
      fromDate === null || new Date(candidate.createdAt).getTime() >= fromDate
    ));
    if (!q) return list;

    return list.filter((candidate) => {
      const questionnaire = Object.values(parseQuestionnaireAnswers(candidate.questionnaireAnswers)).join(" ");
      const fields: Record<CandidateFilterField, string> = {
        all: "",
        name: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email || "",
        phone: candidate.phoneNumber || "",
        studyStatus: `${candidate.studyStatus || ""} ${mapStudyStatus(candidate.studyStatus)}`,
        role: candidate.isAmbassador
          ? "ambassador ambassadeur سفير سفيرة"
          : "candidate candidat مترشح مترشحة",
        emailConfirmed: candidate.emailConfirmed ? "oui yes نعم confirmé confirmed" : "non no لا non confirmé",
        applicationStatus: `${candidate.applicationStatus || "pending"} ${
          candidate.applicationStatus === "accepted"
            ? "accepté مقبول"
            : candidate.applicationStatus === "rejected"
              ? "refusé مرفوض"
              : "en attente قيد الانتظار"
        }`,
        questionnaire,
        adminNote: candidate.adminNote || "",
        dates: `${formatDateDMYH(candidate.createdAt)} ${formatDateDMYH(candidate.updatedAt)}`,
      };
      fields.all = Object.values(fields).join(" ");
      return fields[candidateFilterField].toLowerCase().includes(q);
    });
  }, [candidates.data, search, candidateFilterField, candidateFromDate]);

  const filteredNewUsers = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    const list = newUsers.data ?? [];
    if (!q) return list;

    return list.filter((account) => {
      const fields: Record<AccountFilterField, string> = {
        all: "",
        name: account.name || "",
        email: account.email || "",
        phone: account.phone || "",
        studyStatus: `${account.studyStatus || ""} ${mapStudyStatus(account.studyStatus)}`,
        role: `${account.role || ""} ${account.role === "ambassador" ? "ambassadeur سفير سفيرة" : account.role === "candidate" ? "candidat مترشح" : "utilisateur مستخدم"}`,
        emailConfirmed: account.emailConfirmed ? "oui yes نعم confirmé confirmed" : "non no لا non confirmé",
        date: formatDateDMYH(account.loginDate),
      };
      fields.all = Object.values(fields).join(" ");
      return fields[accountFilterField].toLowerCase().includes(q);
    });
  }, [newUsers.data, accountSearch, accountFilterField]);

  const filteredPlatformUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const list = platformUsers.data ?? [];
    if (!q) return list;

    return list.filter((entry) => {
      const fields: Record<UserFilterField, string> = {
        all: "",
        name: entry.name || "",
        email: entry.email || "",
        phone: entry.phone || "",
        role: `${entry.role || ""} ${mapUserRole(entry.role)}`,
        status: entry.status || "",
        date: `${formatDateDMYH(entry.lastLoginAt)} ${formatDateYMDH(entry.lastLoginAt)}`,
      };
      fields.all = Object.values(fields).join(" ");
      return fields[userFilterField].toLowerCase().includes(q);
    });
  }, [platformUsers.data, userSearch, userFilterField]);

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
      filteredNewUsers.map((account) => ({
        "الاسم": account.name,
        "الهاتف": account.phone,
        "الوضعية الدراسية": mapStudyStatus(account.studyStatus),
        "البريد الإلكتروني": account.email,
        "البريد الإلكتروني مؤكد": account.emailConfirmed ? "نعم" : "لا",
        "الدور (user/ambassador)": account.role,
        "الوثائق": account.attestationUrl || account.documents || "",
        "دخول التاريخ": formatDateYMDH(account.loginDate),
      })),
    [filteredNewUsers],
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

  const incompleteQuestionnairesCsvRows = useMemo(
    () =>
      (incompleteQuestionnaires.data ?? []).map((account) => {
        const answers = parseQuestionnaireDraft(account.questionnaireDraft);
        const total = candidateQuestionnaireFields.length;
        const answered = candidateQuestionnaireFields.filter(
          (field) => typeof answers[field.key] === "string" && answers[field.key].trim().length > 0,
        ).length;
        const percent = total ? Math.round((answered / total) * 100) : 0;

        return {
          "الاسم الكامل": `${account.firstName} ${account.lastName}`,
          "البريد الإلكتروني": account.email,
          "الهاتف": asExcelText(account.phoneNumber),
          "البريد الإلكتروني مؤكد": account.emailConfirmed ? "نعم" : "لا",
          "عدد الأجوبة": answered,
          "مجموع الأسئلة": total,
          "نسبة التقدم": `${percent}%`,
          "آخر تحديث": asExcelText(formatDateYMDH(account.updatedAt ?? account.lastLoginAt ?? account.createdAt)),
        };
      }),
    [incompleteQuestionnaires.data],
  );

  const registrationsToFollowUpCsvRows = useMemo(
    () =>
      (registrationsToFollowUp.data ?? []).map((account) => ({
        "Nom complet": `${account.firstName} ${account.lastName}`,
        "E-mail": account.email,
        "Telephone": asExcelText(account.phoneNumber),
        "E-mail confirme": account.emailConfirmed ? "Oui" : "Non",
        "Formulaire commence": account.hasStartedQuestionnaire ? "Oui" : "Non",
        "Motif du suivi": [
          !account.emailConfirmed ? "E-mail non confirme" : null,
          !account.hasStartedQuestionnaire ? "Formulaire non commence" : null,
        ].filter(Boolean).join(" + "),
        "Date d'inscription": asExcelText(formatDateYMDH(account.createdAt)),
        "Derniere activite": asExcelText(formatDateYMDH(account.updatedAt ?? account.lastLoginAt ?? account.createdAt)),
      })),
    [registrationsToFollowUp.data],
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
        "الكاتب": message.authorName,
        "الدور": message.authorType === "admin" ? "إدارة" : "سفير",
        "الرسالة": message.message,
        "التاريخ": formatDateDMYH(message.createdAt),
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

  const dashboardStats = stats.data ?? {};
  const totalApplications = dashboardStats.candidates ?? 0;
  const acceptedApplications = dashboardStats.acceptedCandidates ?? 0;
  const pendingApplications = dashboardStats.pendingCandidates ?? 0;
  const rejectedApplications = dashboardStats.rejectedCandidates ?? 0;
  const confirmedApplications = dashboardStats.confirmedCandidates ?? 0;
  const primaryCounters = [
    {
      label: "الحسابات المنشأة",
      value: dashboardStats.newUsers ?? 0,
      hint: "كل المسجلين عبر منصة الترشيح",
      icon: Users,
    },
    {
      label: "مستخدمو المنصة",
      value: dashboardStats.users ?? 0,
      hint: "الحسابات التي سجلت الدخول",
      icon: ShieldCheck,
    },
    {
      label: "الاستمارات المرسلة",
      value: totalApplications,
      hint: "ملفات الترشيح المكتملة",
      icon: FileText,
    },
    {
      label: "استمارات غير مكتملة",
      value: dashboardStats.incompleteQuestionnaires ?? 0,
      hint: "بدأ أصحابها الإجابة ولم يرسلوها بعد",
      icon: FileText,
    },
    {
      label: "السفراء",
      value: dashboardStats.ambassadors ?? 0,
      hint: "مترشحون بعلامة سفير",
      icon: Users,
    },
    {
      label: "النشرة البريدية",
      value: dashboardStats.newsletterSubscribers ?? 0,
      hint: "وافقوا على استقبال الأخبار",
      icon: Mail,
    },
    {
      label: "البريد المؤكد",
      value: confirmedApplications,
      hint: `${formatPercent(confirmedApplications, totalApplications)} من الاستمارات`,
      icon: ShieldCheck,
    },
  ];
  const decisionCounters = [
    { label: "قيد المعالجة", value: pendingApplications, className: "bg-amber-500" },
    { label: "مقبول", value: acceptedApplications, className: "bg-emerald-600" },
    { label: "مرفوض", value: rejectedApplications, className: "bg-red-500" },
  ];
  const activityCounters = [
    { label: "رسائل التواصل", value: dashboardStats.messages ?? 0, icon: Mail },
    { label: "رسائل السفراء", value: dashboardStats.ambassadorMessages ?? 0, icon: MessageSquareText },
    { label: "الدورات المنشورة", value: dashboardStats.editions ?? 0, icon: FileText },
  ];

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
            <Link to="/admin/interviews">
              <Button className="bg-[#4A9B8E] hover:bg-[#3D7A6F]">
                <CalendarClock className="ml-2 h-4 w-4" /> المقابلات
              </Button>
            </Link>
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

        <section className="space-y-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#4A9B8E]">Dashboard</p>
                <h2 className="text-xl font-bold text-slate-900">مؤشرات المنصة</h2>
              </div>
              <p className="text-sm text-slate-500">آخر تحديث: {formatDateDMYH(new Date())}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {primaryCounters.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <Icon className="h-5 w-5 text-[#4A9B8E]" />
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500">compteur</span>
                    </div>
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-1 text-3xl font-black text-slate-900">{item.value}</p>
                    <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{item.hint}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">حالة ملفات الترشيح</p>
                  <h3 className="text-lg font-bold text-slate-900">متابعة الانتقاء</h3>
                </div>
                <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {totalApplications} ملف
                </p>
              </div>
              <div className="space-y-4">
                {decisionCounters.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="text-slate-500">{item.value} ({formatPercent(item.value, totalApplications)})</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${item.className}`} style={{ width: formatPercent(item.value, totalApplications) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">نشاط المنصة</p>
              <h3 className="mb-4 text-lg font-bold text-slate-900">التواصل والمحتوى</h3>
              <div className="grid gap-3">
                {activityCounters.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#4A9B8E]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="font-medium text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-2xl font-black text-slate-900">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
          <Button variant={tab === "followUp" ? "default" : "outline"} onClick={() => setTab("followUp")}>
            Inscriptions à relancer ({registrationsToFollowUp.data?.length ?? 0})
          </Button>
          <Button variant={tab === "incomplete" ? "default" : "outline"} onClick={() => setTab("incomplete")}>
            استمارات غير مكتملة ({incompleteQuestionnaires.data?.length ?? 0})
          </Button>
          <Button variant={tab === "messages" ? "default" : "outline"} onClick={() => setTab("messages")}>
            رسائل التواصل
          </Button>
          <Button variant={tab === "subscribers" ? "default" : "outline"} onClick={() => setTab("subscribers")}>
            المشتركين في النشرة
          </Button>
          {isSuperAdmin ? (
            <Link to="/admin/mini-admins">
              <Button variant="outline"><UserCog className="ml-2 h-4 w-4" /> Mini-admins entretiens</Button>
            </Link>
          ) : null}
        </nav>

        {tab === "newUsers" && (
          <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-4 flex min-w-[900px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 gap-2">
                <select
                  value={accountFilterField}
                  onChange={(event) => setAccountFilterField(event.target.value as AccountFilterField)}
                  className="h-10 w-56 rounded-md border border-input bg-background px-3 text-sm"
                  aria-label="Champ de filtrage des utilisateurs"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="name">الاسم</option>
                  <option value="email">البريد الإلكتروني</option>
                  <option value="phone">الهاتف</option>
                  <option value="studyStatus">الوضعية الدراسية</option>
                  <option value="role">الدور / السفير</option>
                  <option value="emailConfirmed">تأكيد البريد</option>
                  <option value="date">تاريخ الدخول</option>
                </select>
                <Input
                  placeholder="ابحث في المستخدمين... مثال: ambassador"
                  value={accountSearch}
                  onChange={(event) => setAccountSearch(event.target.value)}
                  className="max-w-md"
                />
                {(accountSearch || accountFilterField !== "all") ? (
                  <Button type="button" variant="outline" onClick={() => { setAccountSearch(""); setAccountFilterField("all"); }}>
                    إعادة الضبط
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{filteredNewUsers.length} نتيجة</span>
                <Button variant="outline" onClick={() => downloadCsv("new-users.csv", newUsersCsvRows)}>
                  <Download className="ml-2 h-4 w-4" /> csv تصدير new_user
                </Button>
              </div>
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
                {filteredNewUsers.map((account) => {
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
            <div className="mb-3 flex min-w-[900px] flex-col gap-2 md:flex-row md:items-center">
              <select
                value={userFilterField}
                onChange={(event) => setUserFilterField(event.target.value as UserFilterField)}
                className="h-10 w-56 rounded-md border border-input bg-background px-3 text-sm"
                aria-label="Champ de filtrage des utilisateurs"
              >
                <option value="all">جميع الحقول</option>
                <option value="name">الاسم</option>
                <option value="email">البريد الإلكتروني</option>
                <option value="phone">الهاتف</option>
                <option value="role">الدور</option>
                <option value="status">الحالة</option>
                <option value="date">تاريخ آخر دخول</option>
              </select>
              <Input
                placeholder="ابحث في المستخدمين..."
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                className="max-w-md"
              />
              {(userSearch || userFilterField !== "all") ? (
                <Button type="button" variant="outline" onClick={() => { setUserSearch(""); setUserFilterField("all"); }}>
                  إعادة الضبط
                </Button>
              ) : null}
              <span className="text-sm text-slate-500">{filteredPlatformUsers.length} نتيجة</span>
            </div>
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
                {filteredPlatformUsers.map((entry) => (
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
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 flex-col gap-2 md:flex-row">
                <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                  <span className="whitespace-nowrap">À partir du</span>
                  <input
                    type="date"
                    value={candidateFromDate}
                    onChange={(event) => setCandidateFromDate(event.target.value)}
                    className="bg-transparent outline-none"
                    aria-label="Afficher les candidats à partir de cette date"
                  />
                </label>
                <select
                  value={candidateFilterField}
                  onChange={(event) => setCandidateFilterField(event.target.value as CandidateFilterField)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm md:w-56"
                  aria-label="Champ de filtrage"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="name">الاسم الكامل</option>
                  <option value="email">البريد الإلكتروني</option>
                  <option value="phone">الهاتف</option>
                  <option value="studyStatus">الوضعية الدراسية</option>
                  <option value="role">الدور / السفير</option>
                  <option value="emailConfirmed">تأكيد البريد</option>
                  <option value="applicationStatus">قرار الترشيح</option>
                  <option value="questionnaire">أجوبة الاستمارة</option>
                  <option value="adminNote">ملاحظات الإدارة</option>
                  <option value="dates">التواريخ</option>
                </select>
                <Input
                  placeholder="اكتب قيمة البحث... مثال: ambassadeur أو مقبول"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="md:max-w-md"
                />
                {(search || candidateFilterField !== "all" || candidateFromDate) ? (
                  <Button type="button" variant="outline" onClick={() => { setSearch(""); setCandidateFilterField("all"); setCandidateFromDate(""); }}>
                    إعادة الضبط
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-500">{filteredCandidates.length} نتيجة</span>
              <Button variant="outline" onClick={() => downloadCsv("candidats.csv", candidatesCsvRows)}>
                <Download className="ml-2 h-4 w-4" /> csv تصدير المترشحين
              </Button>
              </div>
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
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={setCandidateAmbassador.isPending}
                              onClick={() => setCandidateAmbassador.mutate({ candidateId: candidate.id, isAmbassador: !candidate.isAmbassador })}
                            >
                              {candidate.isAmbassador ? "Retirer ambassadeur" : "Nommer ambassadeur"}
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

        {tab === "followUp" && (
          <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Inscriptions à relancer</h2>
                <p className="text-sm text-slate-500">Comptes sans e-mail confirmé ou dont le formulaire n'a pas été commencé.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => downloadCsv("inscriptions-a-relancer.csv", registrationsToFollowUpCsvRows)}>
                  <Download className="ml-2 h-4 w-4" /> Télécharger CSV
                </Button>
                <Button variant="outline" onClick={() => downloadExcel("inscriptions-a-relancer.xls", registrationsToFollowUpCsvRows)}>
                  <FileText className="ml-2 h-4 w-4" /> Télécharger Excel
                </Button>
              </div>
            </div>
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Nom</th><th className="p-3 text-left">E-mail</th>
                  <th className="p-3 text-left">Téléphone</th><th className="p-3 text-left">E-mail confirmé</th>
                  <th className="p-3 text-left">Formulaire commencé</th><th className="p-3 text-left">Motif du suivi</th>
                  <th className="p-3 text-left">Inscription</th>
                </tr>
              </thead>
              <tbody>
                {(registrationsToFollowUp.data ?? []).map((account) => {
                  const reasons = [
                    !account.emailConfirmed ? "E-mail non confirmé" : null,
                    !account.hasStartedQuestionnaire ? "Formulaire non commencé" : null,
                  ].filter(Boolean).join(" + ");
                  return (
                    <tr key={account.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="p-3 font-medium">{account.firstName} {account.lastName}</td>
                      <td className="p-3">{account.email}</td><td className="p-3">{account.phoneNumber}</td>
                      <td className="p-3">{account.emailConfirmed ? "Oui" : "Non"}</td>
                      <td className="p-3">{account.hasStartedQuestionnaire ? "Oui" : "Non"}</td>
                      <td className="p-3">{reasons}</td><td className="p-3">{formatDateDMYH(account.createdAt)}</td>
                    </tr>
                  );
                })}
                {!registrationsToFollowUp.isLoading && !(registrationsToFollowUp.data?.length) ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">Aucune inscription à relancer.</td></tr>
                ) : null}
              </tbody>
            </table>
          </section>
        )}

        {tab === "incomplete" && (
          <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">المستخدمون الذين بدأوا الاستمارة ولم يرسلوها</h2>
                <p className="text-sm text-slate-500">يتم تحديث التقدم تلقائيا عند حفظ المسودة.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => downloadCsv("formulaires-incomplets.csv", incompleteQuestionnairesCsvRows)}
              >
                <Download className="ml-2 h-4 w-4" /> csv تصدير الاستمارات غير المكتملة
              </Button>
            </div>
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">البريد الإلكتروني</th>
                  <th className="p-3 text-right">الهاتف</th>
                  <th className="p-3 text-right">البريد مؤكد</th>
                  <th className="p-3 text-right">التقدم</th>
                  <th className="p-3 text-right">آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {(incompleteQuestionnaires.data ?? []).map((account) => {
                  const answers = parseQuestionnaireDraft(account.questionnaireDraft);
                  const total = candidateQuestionnaireFields.length;
                  const answered = candidateQuestionnaireFields.filter(
                    (field) => typeof answers[field.key] === "string" && answers[field.key].trim().length > 0,
                  ).length;
                  const percent = total ? Math.round((answered / total) * 100) : 0;

                  return (
                    <tr key={account.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="p-3 font-medium">{account.firstName} {account.lastName}</td>
                      <td className="p-3">{account.email}</td>
                      <td className="p-3">{account.phoneNumber}</td>
                      <td className="p-3">{account.emailConfirmed ? "نعم" : "لا"}</td>
                      <td className="p-3">
                        <div className="w-48">
                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>{answered} / {total} أجوبة</span><span>{percent}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-[#4A9B8E]" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{formatDateDMYH(account.updatedAt ?? account.lastLoginAt ?? account.createdAt)}</td>
                    </tr>
                  );
                })}
                {!incompleteQuestionnaires.isLoading && !(incompleteQuestionnaires.data?.length) ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">لا توجد استمارات غير مكتملة حاليا.</td></tr>
                ) : null}
              </tbody>
            </table>
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


