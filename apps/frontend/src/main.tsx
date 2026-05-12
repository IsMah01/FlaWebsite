import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  IdCard,
  LogOut,
  Mail,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import "./styles.css";

type Candidate = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  studyStatus: string;
  attestationRef?: string;
  idCardRef?: string;
  emailConfirmed: boolean;
  applicationStatus: "pending" | "accepted" | "rejected";
  createdAt: string;
};

type User = { id: number; role: "candidate" | "admin"; email: string; name: string } | null;

const api = {
  async request<T>(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || "Request failed");
    return data as T;
  },
};

function App() {
  const [route, setRoute] = useState(location.pathname);
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    const onPop = () => setRoute(location.pathname);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    api.request<{ user: User }>("/api/me").then((data) => setUser(data.user)).catch(() => setUser(null));
  }, [route]);

  const navigate = (to: string) => {
    history.pushState(null, "", to);
    setRoute(to);
    scrollTo({ top: 0 });
  };

  if (route.startsWith("/signup")) return <Signup navigate={navigate} />;
  if (route.startsWith("/signin") || route === "/login") return <CandidateLogin navigate={navigate} />;
  if (route.startsWith("/confirm-email")) return <ConfirmEmail navigate={navigate} />;
  if (route.startsWith("/edition/")) return <EditionDetail navigate={navigate} id={route.split("/").pop() || ""} />;
  if (route.startsWith("/admin/login")) return <AdminLogin navigate={navigate} />;
  if (route.startsWith("/admin")) return <AdminDashboard navigate={navigate} user={user} setUser={setUser} />;
  return <Home navigate={navigate} />;
}

function Navbar({ navigate }: { navigate: (to: string) => void }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["#about", "عن المؤسسة"],
    ["#goals", "الأهداف"],
    ["#activities", "الأنشطة"],
    ["#editions", "الدورات"],
    ["#contact", "تواصل"],
  ];
  return (
    <header className="nav">
      <button className="brand" onClick={() => navigate("/")}>
        <span>FLF</span>
        <strong>مؤسسة أطر الغد</strong>
      </button>
      <nav className={open ? "nav-links open" : "nav-links"}>
        {links.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
        <button onClick={() => navigate("/signin")}>دخول</button>
        <button className="primary" onClick={() => navigate("/signup")}>
          التسجيل
        </button>
      </nav>
      <button className="icon" onClick={() => setOpen((v) => !v)} aria-label="القائمة">
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}

function Home({ navigate }: { navigate: (to: string) => void }) {
  const [editions, setEditions] = useState<any[]>([]);
  useEffect(() => {
    api.request<any[]>("/api/editions").then(setEditions).catch(() => setEditions([]));
  }, []);
  return (
    <>
      <Navbar navigate={navigate} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Future Leaders Foundation</p>
            <h1>مؤسسة أطر الغد</h1>
            <p>
              منصة رقمية للتعريف بالمؤسسة، استقبال الترشيحات، تدبير الوثائق، ومتابعة الملفات
              الإدارية من مكان واحد.
            </p>
            <div className="actions">
              <button className="primary" onClick={() => navigate("/signup")}>
                التسجيل الآن <ArrowRight />
              </button>
              <a href="#editions">استكشاف الدورات</a>
            </div>
          </div>
          <div className="hero-panel">
            <div>
              <span>16</span>
              <p>دورة سابقة</p>
            </div>
            <div>
              <span>+500</span>
              <p>مشارك ومستفيد</p>
            </div>
            <div>
              <span>إدارة</span>
              <p>ملفات وترشيحات ووثائق</p>
            </div>
          </div>
        </section>

        <section id="about" className="section two">
          <div>
            <p className="eyebrow">من نحن</p>
            <h2>فضاء لصناعة قيادات شابة واعية</h2>
          </div>
          <p>
            تعمل المؤسسة على تمكين الشباب عبر التكوين، اللقاءات، المبادرات المدنية، وربط
            المشاركين بشبكة من الخبرات. المنصة الجديدة تجعل التسجيل والتواصل والمتابعة أكثر
            وضوحا وسرعة.
          </p>
        </section>

        <section id="goals" className="section">
          <p className="eyebrow">الأهداف</p>
          <h2>مسارات واضحة للتأثير</h2>
          <div className="grid3">
            <Feature icon={<GraduationCap />} title="التكوين" text="برامج تدريبية مركزة في القيادة، التواصل، والعمل المدني." />
            <Feature icon={<Users />} title="الشبكة" text="ربط المشاركين بخبراء، ضيوف، وسفراء سابقين." />
            <Feature icon={<BarChart3 />} title="الأثر" text="تتبع الترشيحات والنتائج والمعطيات من لوحة إدارية منظمة." />
          </div>
        </section>

        <section id="activities" className="band">
          <p className="eyebrow">الأنشطة</p>
          <h2>محاضرات، ورشات، زيارات، ومبادرات ميدانية</h2>
          <div className="activity-list">
            {["لقاءات فكرية", "ورشات مهارية", "زيارات مؤسساتية", "مشاريع شبابية"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section id="editions" className="section">
          <p className="eyebrow">الدورات السابقة</p>
          <h2>أرشيف المؤسسة</h2>
          <div className="editions">
            {editions.slice(0, 6).map((edition) => (
              <button key={edition.id} className="edition" onClick={() => navigate(`/edition/${edition.id}`)}>
                <strong>{edition.title}</strong>
                <span>{edition.location || "المغرب"}</span>
                <p>{edition.description}</p>
              </button>
            ))}
          </div>
        </section>

        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="feature">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function ContactSection() {
  const [status, setStatus] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.request("/api/contact", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form)),
    });
    event.currentTarget.reset();
    setStatus("تم إرسال الرسالة بنجاح");
  }
  return (
    <section id="contact" className="section contact">
      <div>
        <p className="eyebrow">تواصل معنا</p>
        <h2>أرسل رسالتك أو اشترك في النشرة</h2>
        <Newsletter />
      </div>
      <form onSubmit={submit} className="form">
        <input name="name" placeholder="الاسم الكامل" required />
        <input name="email" type="email" placeholder="البريد الإلكتروني" required />
        <input name="phone" placeholder="الهاتف" />
        <input name="subject" placeholder="الموضوع" required />
        <textarea name="message" placeholder="الرسالة" required />
        <button className="primary">إرسال</button>
        {status && <p className="success">{status}</p>}
      </form>
    </section>
  );
}

function Newsletter() {
  const [status, setStatus] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.request("/api/newsletter", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
    event.currentTarget.reset();
    setStatus("تم الاشتراك");
  }
  return (
    <form className="newsletter" onSubmit={submit}>
      <input name="email" type="email" placeholder="email@example.com" required />
      <button>اشتراك</button>
      {status && <small>{status}</small>}
    </form>
  );
}

function Signup({ navigate }: { navigate: (to: string) => void }) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<{ attestationRef?: string; idCardRef?: string }>({});
  async function upload(file: File, documentType: "attestation" | "idCard") {
    const data = await fileToBase64(file);
    const result = await api.request<{ fileRef: string }>("/api/upload", {
      method: "POST",
      body: JSON.stringify({ fileName: file.name, mimeType: file.type, data, documentType }),
    });
    setFiles((prev) => ({ ...prev, [`${documentType}Ref`]: result.fileRef }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form) as any;
    if (payload.password !== payload.confirmPassword) return setMessage("كلمتا المرور غير متطابقتين");
    await api.request("/api/candidates/register", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        ...files,
        isAmbassador: payload.isAmbassador === "yes",
        newsletterConsent: payload.newsletterConsent === "on",
      }),
    });
    setMessage("تم إنشاء الحساب. يمكنك الآن تسجيل الدخول.");
  }
  return (
    <AuthShell navigate={navigate} title="التسجيل في المؤسسة" icon={<Users />}>
      <form className="form" onSubmit={submit}>
        <div className="split"><input name="firstName" placeholder="الاسم" required /><input name="lastName" placeholder="النسب" required /></div>
        <select name="studyStatus" required defaultValue=""><option value="" disabled>الحالة الدراسية</option><option value="student">طالب</option><option value="graduated">خريج</option><option value="master_student">طالب ماستر</option><option value="phd_student">طالب دكتوراه</option><option value="other">أخرى</option></select>
        <div className="split"><input name="phoneNumber" placeholder="رقم الهاتف" required /><input name="email" type="email" placeholder="البريد الإلكتروني" required /></div>
        <label className="upload"><FileText /> شهادة التمدرس<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "attestation")} /></label>
        <label className="upload"><IdCard /> بطاقة التعريف<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "idCard")} /></label>
        <div className="radio-row"><label><input type="radio" name="isAmbassador" value="yes" /> سفير سابق</label><label><input type="radio" name="isAmbassador" value="no" defaultChecked /> مرشح جديد</label></div>
        <div className="split"><input name="password" type="password" placeholder="كلمة المرور" required /><input name="confirmPassword" type="password" placeholder="تأكيد كلمة المرور" required /></div>
        <label className="check"><input name="newsletterConsent" type="checkbox" /> أوافق على تلقي أخبار المؤسسة</label>
        <button className="primary">إنشاء الحساب</button>
        {message && <p className="success">{message}</p>}
      </form>
    </AuthShell>
  );
}

function CandidateLogin({ navigate }: { navigate: (to: string) => void }) {
  return <LoginForm navigate={navigate} title="تسجيل دخول المرشح" endpoint="/api/candidates/login" after="/" />;
}

function AdminLogin({ navigate }: { navigate: (to: string) => void }) {
  return <LoginForm navigate={navigate} title="دخول الإدارة" endpoint="/api/admin/login" after="/admin" admin />;
}

function LoginForm({ navigate, title, endpoint, after, admin }: { navigate: (to: string) => void; title: string; endpoint: string; after: string; admin?: boolean }) {
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api.request(endpoint, { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      navigate(after);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    }
  }
  return (
    <AuthShell navigate={navigate} title={title} icon={admin ? <ShieldCheck /> : <Users />}>
      <form className="form" onSubmit={submit}>
        <input name="email" type="email" placeholder="البريد الإلكتروني" required />
        <input name="password" type="password" placeholder="كلمة المرور" required />
        <button className="primary">دخول</button>
        {error && <p className="error">{error}</p>}
      </form>
    </AuthShell>
  );
}

function AuthShell({ navigate, title, icon, children }: { navigate: (to: string) => void; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <Navbar navigate={navigate} />
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-icon">{icon}</div>
          <h1>{title}</h1>
          {children}
        </section>
      </main>
    </>
  );
}

function ConfirmEmail({ navigate }: { navigate: (to: string) => void }) {
  const [message, setMessage] = useState("جاري تأكيد البريد...");
  useEffect(() => {
    api.request(`/api/candidates/confirm${location.search}`).then((data: any) => setMessage(data.message)).catch((err) => setMessage(err.message));
  }, []);
  return <AuthShell navigate={navigate} title="تأكيد البريد الإلكتروني" icon={<CheckCircle2 />}><p>{message}</p></AuthShell>;
}

function EditionDetail({ navigate, id }: { navigate: (to: string) => void; id: string }) {
  const [edition, setEdition] = useState<any>(null);
  useEffect(() => { api.request(`/api/editions/${id}`).then(setEdition); }, [id]);
  return (
    <>
      <Navbar navigate={navigate} />
      <main className="section detail">
        <button onClick={() => navigate("/")}>العودة</button>
        <h1>{edition?.title || "الدورة"}</h1>
        <p>{edition?.description}</p>
        <div className="feature"><FileText /><p>{edition?.eventDate}</p><p>{edition?.location}</p></div>
      </main>
    </>
  );
}

function AdminDashboard({ navigate, user, setUser }: { navigate: (to: string) => void; user: User; setUser: (u: User) => void }) {
  const [tab, setTab] = useState<"candidates" | "messages" | "subscribers">("candidates");
  const [stats, setStats] = useState<any>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  async function load() {
    if (!user || user.role !== "admin") return;
    setStats(await api.request("/api/admin/stats"));
    setCandidates(await api.request("/api/admin/candidates"));
    setMessages(await api.request("/api/admin/messages"));
    setSubscribers(await api.request("/api/admin/subscribers"));
  }
  useEffect(() => { load().catch(() => navigate("/admin/login")); }, [user]);

  if (!user) return <AuthShell navigate={navigate} title="دخول الإدارة مطلوب" icon={<ShieldCheck />}><button className="primary" onClick={() => navigate("/admin/login")}>تسجيل الدخول</button></AuthShell>;
  if (user.role !== "admin") return <AuthShell navigate={navigate} title="الوصول مرفوض" icon={<ShieldCheck />}><p>هذه الصفحة مخصصة للإدارة.</p></AuthShell>;

  const filtered = candidates.filter((c) => `${c.firstName} ${c.lastName} ${c.email} ${c.phoneNumber}`.toLowerCase().includes(search.toLowerCase()));
  async function status(id: number, value: Candidate["applicationStatus"]) {
    await api.request(`/api/admin/candidates/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: value }) });
    await load();
  }
  async function logout() {
    await api.request("/api/logout", { method: "POST" });
    setUser(null);
    navigate("/");
  }
  return (
    <main className="admin">
      <header className="admin-head">
        <div><p className="eyebrow">لوحة الإدارة</p><h1>إدارة الترشيحات والمحتوى</h1><p>مرحبا {user.name}</p></div>
        <button onClick={logout}><LogOut /> خروج</button>
      </header>
      <section className="stats">
        <Feature icon={<Users />} title="المرشحون" text={String(stats.candidates || 0)} />
        <Feature icon={<ShieldCheck />} title="المقبولون" text={String(stats.acceptedCandidates || 0)} />
        <Feature icon={<Mail />} title="الرسائل" text={String(stats.messages || 0)} />
        <Feature icon={<FileText />} title="الدورات" text={String(stats.editions || 0)} />
      </section>
      <nav className="tabs"><button onClick={() => setTab("candidates")}>المرشحون</button><button onClick={() => setTab("messages")}>الرسائل</button><button onClick={() => setTab("subscribers")}>النشرة</button></nav>
      {tab === "candidates" && <section className="table-card"><div className="toolbar"><input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} /><button onClick={() => downloadCsv("candidates.csv", filtered)}><Download /> CSV</button></div><table><thead><tr><th>المرشح</th><th>البريد</th><th>الهاتف</th><th>الحالة</th><th>الوثائق</th><th>القرار</th></tr></thead><tbody>{filtered.map((c) => <tr key={c.id}><td>{c.firstName} {c.lastName}</td><td>{c.email}</td><td>{c.phoneNumber}</td><td>{c.applicationStatus}</td><td>{fileLink(c.attestationRef, "شهادة")} {fileLink(c.idCardRef, "بطاقة")}</td><td><button onClick={() => status(c.id, "pending")}>انتظار</button><button onClick={() => status(c.id, "accepted")}>قبول</button><button onClick={() => status(c.id, "rejected")}>رفض</button></td></tr>)}</tbody></table></section>}
      {tab === "messages" && <ListExport file="messages.csv" rows={messages} render={(m) => <article className="message" key={m.id}><h3>{m.subject}</h3><p>{m.name} - {m.email}</p><p>{m.message}</p></article>} />}
      {tab === "subscribers" && <ListExport file="newsletter.csv" rows={subscribers} render={(s) => <article className="message" key={s.id}><h3>{s.email}</h3><p>{s.name || "-"} - {s.isSubscribed ? "مشترك" : "غير مشترك"}</p></article>} />}
    </main>
  );
}

function ListExport({ file, rows, render }: { file: string; rows: any[]; render: (row: any) => React.ReactNode }) {
  return <section className="table-card"><button onClick={() => downloadCsv(file, rows)}><Download /> CSV</button>{rows.map(render)}</section>;
}

function fileLink(ref: string | undefined, label: string) {
  if (!ref?.startsWith("private://")) return <span>-</span>;
  return <a href={`/api/private-files/${encodeURIComponent(ref.replace("private://", ""))}`} target="_blank">{label}</a>;
}

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const keys = Object.keys(rows[0] || {});
  const csv = [keys.join(","), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(file);
  });
}

function Footer() {
  return <footer>مؤسسة أطر الغد - منصة الترشيحات والإدارة</footer>;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
