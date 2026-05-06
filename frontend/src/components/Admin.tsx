import { useEffect, useState } from "react";
import {
  Users,
  Activity,
  Shield,
  Trash2,
  Ban,
  CheckCircle,
  Send,
  ChevronRight,
  ArrowLeft,
  BarChart2,
  Lock,
} from "lucide-react";

const ADMIN_TG_ID = 6227059075;
const API_BASE = "https://medassist-j8zx.onrender.com";

// ── Auth ──────────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("admin_token") || "";
}
function saveToken(t: string) {
  localStorage.setItem("admin_token", t);
}
function clearToken() {
  localStorage.removeItem("admin_token");
}

async function adminFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": getToken(),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

interface AdminProps {
  isDark: boolean;
}

type Page = "login" | "dashboard" | "users" | "user_detail" | "broadcast";

// ── Main Admin Component ──────────────────────────────────────────────────────
export function Admin({ isDark }: AdminProps) {
  const tgId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<Page>("login");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Check if current user is admin
  if (tgId !== ADMIN_TG_ID) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-6 text-center gap-4">
        <Shield size={48} style={{ color: "var(--tg-hint)" }} />
        <p className="font-semibold" style={{ color: "var(--tg-text)" }}>
          Access Denied
        </p>
        <p className="text-sm" style={{ color: "var(--tg-hint)" }}>
          This section is only available to administrators.
        </p>
      </div>
    );
  }

  if (!authed)
    return (
      <LoginPage
        isDark={isDark}
        onSuccess={() => {
          setAuthed(true);
          setPage("dashboard");
        }}
      />
    );
  if (page === "dashboard")
    return <DashboardPage isDark={isDark} onNavigate={setPage} />;
  if (page === "users")
    return (
      <UsersPage
        isDark={isDark}
        onBack={() => setPage("dashboard")}
        onSelect={(id) => {
          setSelectedUserId(id);
          setPage("user_detail");
        }}
      />
    );
  if (page === "user_detail" && selectedUserId)
    return (
      <UserDetailPage
        isDark={isDark}
        userId={selectedUserId}
        onBack={() => setPage("users")}
      />
    );
  if (page === "broadcast")
    return (
      <BroadcastPage isDark={isDark} onBack={() => setPage("dashboard")} />
    );
  return null;
}

// ── Login Page ────────────────────────────────────────────────────────────────
function LoginPage({
  isDark,
  onSuccess,
}: {
  isDark: boolean;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setDots((d) => (d + 1) % 4), 350);
    return () => clearInterval(iv);
  }, [loading]);

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    saveToken(password.trim());
    try {
      await adminFetch("/admin/stats");
      onSuccess();
    } catch {
      clearToken();
      setError("❌ Wrong password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: isDark ? "#1f2937" : "#f3f4f6",
    color: "var(--tg-text)",
    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
    borderRadius: 12,
    padding: "12px 16px",
    width: "100%",
    fontSize: 16,
    outline: "none",
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1e3a5f, #2e86c1)" }}
      >
        <Lock size={36} color="white" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: "var(--tg-text)" }}>
          Admin Panel
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--tg-hint)" }}>
          MedAssist · Restricted Access
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <input
          type="password"
          style={inputStyle}
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        {error && (
          <p className="text-sm text-center" style={{ color: "#ef4444" }}>
            {error}
          </p>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 rounded-2xl font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #1e3a5f, #2e86c1)" }}
        >
          {loading ? `Verifying${".".repeat(dots)}` : "Enter Admin Panel"}
        </button>
      </div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
function DashboardPage({
  isDark,
  onNavigate,
}: {
  isDark: boolean;
  onNavigate: (p: Page) => void;
}) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/admin/stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <AdminSkeleton isDark={isDark} title="Dashboard" rows={4} />;

  const cards = [
    {
      label: "Total Users",
      value: stats?.total_users ?? 0,
      color: "#38bdf8",
      icon: <Users size={20} />,
    },
    {
      label: "Active Users",
      value: stats?.active_users ?? 0,
      color: "#22c55e",
      icon: <CheckCircle size={20} />,
    },
    {
      label: "Onboarded",
      value: stats?.onboarded_users ?? 0,
      color: "#a78bfa",
      icon: <Shield size={20} />,
    },
    {
      label: "AI Analyses",
      value: stats?.total_ai_analyses ?? 0,
      color: "#fb923c",
      icon: <Activity size={20} />,
    },
  ];

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <Shield size={20} style={{ color: "#2e86c1" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--tg-text)" }}>
            Admin Panel
          </h1>
        </div>
        <p className="text-sm mt-0.5 ml-7" style={{ color: "var(--tg-hint)" }}>
          MedAssist Control Center
        </p>
      </div>

      {/* Stats grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        {cards.map((c, i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{ background: "var(--tg-secondary-bg)" }}
          >
            <div
              className="flex items-center gap-2 mb-2"
              style={{ color: c.color }}
            >
              {c.icon}
              <span
                className="text-xs font-medium"
                style={{ color: "var(--tg-hint)" }}
              >
                {c.label}
              </span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: "var(--tg-text)" }}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Nav buttons */}
      <div className="px-4 space-y-3">
        {[
          {
            label: "👥 Manage Users",
            sub: "View, block, delete users",
            page: "users" as Page,
            color: "#38bdf8",
          },
          {
            label: "📢 Broadcast Message",
            sub: "Send message to all users",
            page: "broadcast" as Page,
            color: "#fb923c",
          },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigate(item.page)}
            className="w-full flex items-center justify-between p-4 rounded-2xl active:opacity-70"
            style={{ background: "var(--tg-secondary-bg)" }}
          >
            <div className="text-left">
              <p
                className="font-semibold text-sm"
                style={{ color: "var(--tg-text)" }}
              >
                {item.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--tg-hint)" }}>
                {item.sub}
              </p>
            </div>
            <ChevronRight size={18} style={{ color: item.color }} />
          </button>
        ))}

        <button
          onClick={() => {
            clearToken();
            window.location.reload();
          }}
          className="w-full py-3 rounded-2xl text-sm font-medium active:opacity-70"
          style={{ background: "var(--tg-secondary-bg)", color: "#ef4444" }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Users Page ────────────────────────────────────────────────────────────────
function UsersPage({
  isDark,
  onBack,
  onSelect,
}: {
  isDark: boolean;
  onBack: () => void;
  onSelect: (id: number) => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminFetch("/admin/users")
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <AdminSkeleton isDark={isDark} title="Users" rows={6} onBack={onBack} />
    );

  const filtered = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(u.telegram_id).includes(search) ||
      u.username?.toLowerCase().includes(search.toLowerCase()),
  );

  const inputStyle = {
    background: isDark ? "#1f2937" : "#f3f4f6",
    color: "var(--tg-text)",
    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
    borderRadius: 12,
    padding: "10px 14px",
    width: "100%",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div className="pb-6">
      <PageHeader title="Users" sub={`${users.length} total`} onBack={onBack} />

      <div className="px-4 mb-3">
        <input
          style={inputStyle}
          placeholder="🔍 Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="px-4 space-y-2">
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u.id)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl active:opacity-70 text-left"
            style={{ background: "var(--tg-secondary-bg)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: u.is_active ? "#1e3a5f" : "#3f1f1f" }}
            >
              <Users size={18} color={u.is_active ? "#38bdf8" : "#ef4444"} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold text-sm truncate"
                style={{ color: "var(--tg-text)" }}
              >
                {u.full_name || "No name"}
                {!u.is_active && (
                  <span className="ml-2 text-xs text-red-400">BLOCKED</span>
                )}
              </p>
              <p
                className="text-xs truncate"
                style={{ color: "var(--tg-hint)" }}
              >
                ID: {u.telegram_id} {u.username ? `· @${u.username}` : ""}
              </p>
            </div>
            <ChevronRight
              size={16}
              style={{ color: "var(--tg-hint)", flexShrink: 0 }}
            />
          </button>
        ))}
        {filtered.length === 0 && (
          <p
            className="text-center py-8 text-sm"
            style={{ color: "var(--tg-hint)" }}
          >
            No users found
          </p>
        )}
      </div>
    </div>
  );
}

// ── User Detail Page ──────────────────────────────────────────────────────────
function UserDetailPage({
  isDark,
  userId,
  onBack,
}: {
  isDark: boolean;
  userId: number;
  onBack: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    adminFetch(`/admin/users/${userId}`)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  if (loading)
    return (
      <AdminSkeleton
        isDark={isDark}
        title="User Detail"
        rows={5}
        onBack={onBack}
      />
    );
  if (!data)
    return (
      <div
        className="px-4 pt-8 text-center"
        style={{ color: "var(--tg-hint)" }}
      >
        Not found
      </div>
    );

  const { user, audit_logs, analytics } = data;

  const handleBlock = async () => {
    setBlocking(true);
    try {
      await adminFetch(`/admin/users/${userId}/block`, { method: "POST" });
      fetchData();
    } finally {
      setBlocking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${user.full_name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await adminFetch(`/admin/users/${userId}`, { method: "DELETE" });
      onBack();
    } finally {
      setDeleting(false);
    }
  };

  const infoRows = [
    ["Telegram ID", user.telegram_id],
    ["Username", user.username ? `@${user.username}` : "—"],
    ["Phone", user.phone_number || "—"],
    ["Age", `${user.age} years`],
    ["Weight", `${user.weight_kg} kg`],
    ["Height", `${user.height_cm} cm`],
    ["Gender", user.gender],
    ["Language", user.language?.toUpperCase()],
    ["Joined", new Date(user.created_at).toLocaleDateString()],
    ["Status", user.is_active ? "✅ Active" : "🚫 Blocked"],
  ];

  return (
    <div className="pb-6">
      <PageHeader
        title={user.full_name || "User"}
        sub={`ID: ${user.telegram_id}`}
        onBack={onBack}
      />

      {/* Info */}
      <div
        className="mx-4 rounded-2xl overflow-hidden mb-4"
        style={{ background: "var(--tg-secondary-bg)" }}
      >
        {infoRows.map(([label, value], i) => (
          <div
            key={i}
            className="flex justify-between px-4 py-3"
            style={{
              borderBottom:
                i < infoRows.length - 1
                  ? `1px solid ${isDark ? "#374151" : "#f1f5f9"}`
                  : "none",
            }}
          >
            <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
              {label}
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--tg-text)" }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Audit logs */}
      {audit_logs.length > 0 && (
        <div className="mx-4 mb-4">
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: "var(--tg-hint)" }}
          >
            Profile Change History ({audit_logs.length})
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--tg-secondary-bg)" }}
          >
            {audit_logs.slice(0, 10).map((log: any, i: number) => (
              <div
                key={i}
                className="px-4 py-3"
                style={{
                  borderBottom:
                    i < Math.min(audit_logs.length, 10) - 1
                      ? `1px solid ${isDark ? "#374151" : "#f1f5f9"}`
                      : "none",
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "#a78bfa" }}
                    >
                      {log.field}
                    </span>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--tg-hint)" }}
                    >
                      <span style={{ color: "#ef4444" }}>{log.old}</span>
                      {" → "}
                      <span style={{ color: "#22c55e" }}>{log.new}</span>
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--tg-hint)" }}>
                    {new Date(log.at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics */}
      {analytics.length > 0 && (
        <div className="mx-4 mb-4">
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: "var(--tg-hint)" }}
          >
            Recent Activity
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--tg-secondary-bg)" }}
          >
            {analytics.slice(0, 7).map((a: any, i: number) => (
              <div
                key={i}
                className="flex justify-between px-4 py-3"
                style={{
                  borderBottom:
                    i < Math.min(analytics.length, 7) - 1
                      ? `1px solid ${isDark ? "#374151" : "#f1f5f9"}`
                      : "none",
                }}
              >
                <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
                  {a.date}
                </span>
                <div className="flex gap-3 text-xs">
                  <span style={{ color: "#38bdf8" }}>💧{a.water_ml}ml</span>
                  <span style={{ color: "#fb923c" }}>🔥{a.calories}</span>
                  <span style={{ color: "#a78bfa" }}>🤖{a.ai_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 space-y-3">
        <button
          onClick={handleBlock}
          disabled={blocking}
          className="w-full py-3 rounded-2xl font-semibold text-sm active:opacity-70 disabled:opacity-50"
          style={{
            background: user.is_active ? "#3f1f1f" : "#1f3f1f",
            color: user.is_active ? "#ef4444" : "#22c55e",
          }}
        >
          {blocking
            ? "..."
            : user.is_active
              ? "🚫 Block User"
              : "✅ Unblock User"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 rounded-2xl font-semibold text-sm active:opacity-70 disabled:opacity-50"
          style={{ background: "#3f1f1f", color: "#ef4444" }}
        >
          {deleting ? "..." : "🗑️ Delete User"}
        </button>
      </div>
    </div>
  );
}

// ── Broadcast Page ────────────────────────────────────────────────────────────
function BroadcastPage({
  isDark,
  onBack,
}: {
  isDark: boolean;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSend = async () => {
    if (!text.trim()) return;
    if (!confirm("Send this message to ALL active users?")) return;
    setSending(true);
    try {
      const res = await adminFetch("/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setResult(res);
      setText("");
    } catch {
      alert("Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    background: isDark ? "#1f2937" : "#f3f4f6",
    color: "var(--tg-text)",
    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
    borderRadius: 12,
    padding: "12px 14px",
    width: "100%",
    fontSize: 14,
    outline: "none",
    resize: "none" as const,
    minHeight: 140,
  };

  return (
    <div className="pb-6">
      <PageHeader title="Broadcast" sub="Send to all users" onBack={onBack} />

      <div className="px-4 space-y-4">
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--tg-secondary-bg)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--tg-hint)" }}
          >
            Message (HTML supported)
          </p>
          <textarea
            style={inputStyle}
            placeholder="Write your message here...
You can use <b>bold</b> and <i>italic</i>"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs mt-2" style={{ color: "var(--tg-hint)" }}>
            {text.length} characters
          </p>
        </div>

        {result && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--tg-secondary-bg)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>
              ✅ Sent to {result.sent} users
            </p>
            {result.failed > 0 && (
              <p className="text-sm mt-1" style={{ color: "#ef4444" }}>
                ❌ Failed: {result.failed}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="w-full py-4 rounded-2xl font-semibold text-white active:opacity-70 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #1e3a5f, #2e86c1)" }}
        >
          <Send size={18} />
          {sending ? "Sending..." : "Send Broadcast"}
        </button>
      </div>
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────
function PageHeader({
  title,
  sub,
  onBack,
}: {
  title: string;
  sub?: string;
  onBack?: () => void;
}) {
  return (
    <div className="px-4 pt-5 pb-4 flex items-center gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="p-2 rounded-xl active:opacity-70"
          style={{ background: "var(--tg-secondary-bg)" }}
        >
          <ArrowLeft size={18} style={{ color: "var(--tg-text)" }} />
        </button>
      )}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--tg-text)" }}>
          {title}
        </h1>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: "var(--tg-hint)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function AdminSkeleton({
  isDark,
  title,
  rows,
  onBack,
}: {
  isDark: boolean;
  title: string;
  rows: number;
  onBack?: () => void;
}) {
  const shimmer = isDark ? "#374151" : "#e2e8f0";
  return (
    <div className="pb-6 animate-pulse">
      <div className="px-4 pt-5 pb-4 flex items-center gap-3">
        {onBack && (
          <div
            className="w-10 h-10 rounded-xl"
            style={{ background: shimmer }}
          />
        )}
        <div>
          <div
            className="h-6 w-32 rounded-lg"
            style={{ background: shimmer }}
          />
          <div
            className="h-3 w-20 rounded mt-1.5"
            style={{ background: shimmer }}
          />
        </div>
      </div>
      <div className="px-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl"
            style={{ background: "var(--tg-secondary-bg)" }}
          >
            <div className="h-full rounded-2xl p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex-shrink-0"
                style={{ background: shimmer }}
              />
              <div className="flex-1 space-y-2">
                <div
                  className="h-3 rounded"
                  style={{ background: shimmer, width: "60%" }}
                />
                <div
                  className="h-2.5 rounded"
                  style={{ background: shimmer, width: "40%" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-4">
        <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
          Loading...
        </span>
      </div>
    </div>
  );
}
