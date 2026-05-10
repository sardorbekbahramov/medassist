import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Droplets,
  Flame,
  Heart,
  Zap,
  Moon,
  Footprints,
  Plus,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { api, DailyStats, UserProfile } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type GoalType = "sleep" | "walking";

interface ActiveGoal {
  type: GoalType;
  addedAt: number;
}

interface GoalEntry {
  date: string; // "YYYY-MM-DD"
  value: number;
}

interface GoalsStorage {
  active: ActiveGoal[];
  sleep: GoalEntry[]; // soat
  walking: GoalEntry[]; // qadam
}

const GOALS_KEY = "medassist_goals_v1";
const SLEEP_GOAL = 8; // soat
const WALKING_GOAL = 10000; // qadam

function loadGoals(): GoalsStorage {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { active: [], sleep: [], walking: [] };
}

function saveGoals(g: GoalsStorage) {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(g));
  } catch {}
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface DashboardProps {
  isDark: boolean;
}

export function Dashboard({ isDark }: DashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dots, setDots] = useState(0);
  const [goals, setGoals] = useState<GoalsStorage>(loadGoals);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [logModal, setLogModal] = useState<GoalType | null>(null);
  const [logValue, setLogValue] = useState("");

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    const fetchData = async (retries = 5) => {
      try {
        const [p, s] = await Promise.all([
          api.getProfile(),
          api.getWeeklyStats(),
        ]);
        setProfile(p);
        setStats(s);
        setLoading(false);
      } catch {
        if (retries > 0) setTimeout(() => fetchData(retries - 1), 2500);
        else {
          setError("Ma'lumotlarni yuklab bo'lmadi. Qayta urinib ko'ring.");
          setLoading(false);
        }
      }
    };
    fetchData();
  }, []);

  // Goals saqlash
  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

  const addGoal = (type: GoalType) => {
    if (goals.active.find((g) => g.type === type)) return;
    setGoals((prev) => ({
      ...prev,
      active: [...prev.active, { type, addedAt: Date.now() }],
    }));
    setShowGoalPicker(false);
  };

  const removeGoal = (type: GoalType) => {
    setGoals((prev) => ({
      ...prev,
      active: prev.active.filter((g) => g.type !== type),
    }));
  };

  const logGoalEntry = (type: GoalType, value: number) => {
    const today = todayStr();
    setGoals((prev) => {
      const arr = prev[type].filter((e) => e.date !== today);
      return { ...prev, [type]: [...arr, { date: today, value }] };
    });
    setLogModal(null);
    setLogValue("");
  };

  if (loading) return <LoadingState dots={dots} isDark={isDark} />;
  if (error) return <ErrorState message={error} />;
  if (!profile) return null;

  const today = stats[stats.length - 1];
  const waterPct = today
    ? Math.min(
        100,
        Math.round((today.water_ml / profile.daily_water_goal_ml) * 100),
      )
    : 0;
  const calPct = today
    ? Math.min(
        100,
        Math.round(
          (today.calories_consumed / profile.daily_calories_goal) * 100,
        ),
      )
    : 0;

  const days = last7Days();
  const chartData = days.map((d) => {
    const s = stats.find((x) => x.date === d);
    const shortDay = new Date(d).toLocaleDateString("uz", { weekday: "short" });
    return {
      day: shortDay,
      water: s?.water_ml ?? 0,
      calories: s?.calories_consumed ?? 0,
      goal_water: profile.daily_water_goal_ml,
      goal_cal: profile.daily_calories_goal,
    };
  });

  const sleepData = days.map((d) => {
    const e = goals.sleep.find((x) => x.date === d);
    return {
      day: new Date(d).toLocaleDateString("uz", { weekday: "short" }),
      value: e?.value ?? 0,
    };
  });

  const walkingData = days.map((d) => {
    const e = goals.walking.find((x) => x.date === d);
    return {
      day: new Date(d).toLocaleDateString("uz", { weekday: "short" }),
      value: e?.value ?? 0,
    };
  });

  const todaySleep = goals.sleep.find((e) => e.date === todayStr())?.value ?? 0;
  const todayWalking =
    goals.walking.find((e) => e.date === todayStr())?.value ?? 0;

  const accent = isDark ? "#38bdf8" : "#0284c7";
  const accentOrange = isDark ? "#fb923c" : "#ea580c";
  const accentPurple = "#a78bfa";
  const accentGreen = "#22c55e";
  const gridColor = isDark ? "#1f2937" : "#f1f5f9";
  const textColor = isDark ? "#6b7280" : "#94a3b8";

  const availableGoals: {
    type: GoalType;
    label: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      type: "sleep",
      label: "Kunlik uyqu",
      icon: <Moon size={18} />,
      color: accentPurple,
    },
    {
      type: "walking",
      label: "Kunlik yurish",
      icon: <Footprints size={18} />,
      color: accentGreen,
    },
  ];
  const availableToAdd = availableGoals.filter(
    (g) => !goals.active.find((a) => a.type === g.type),
  );

  return (
    <div className="pb-6 space-y-4">
      {/* Header */}
      <div className="px-4 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <Heart size={18} style={{ color: "#ef4444" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--tg-text)" }}>
            Sog'liq paneli
          </h1>
        </div>
        <p className="text-sm mt-0.5 ml-6" style={{ color: "var(--tg-hint)" }}>
          {profile.full_name}
        </p>
      </div>

      {/* Water + Calories cards */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={<Droplets size={18} />}
          label="Suv bugun"
          value={`${today?.water_ml ?? 0}`}
          unit="ml"
          sub={`/ ${profile.daily_water_goal_ml} ml`}
          pct={waterPct}
          color={accent}
          isDark={isDark}
        />
        <StatCard
          icon={<Flame size={18} />}
          label="Kaloriya"
          value={`${today?.calories_consumed ?? 0}`}
          unit="kkal"
          sub={`/ ${profile.daily_calories_goal} kkal`}
          pct={calPct}
          color={accentOrange}
          isDark={isDark}
        />
      </div>

      {/* Today macros */}
      {today && (
        <div
          className="mx-4 rounded-2xl p-4"
          style={{ background: "var(--tg-secondary-bg)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--tg-hint)" }}
          >
            Bugungi makrolar
          </p>
          <div className="grid grid-cols-3 gap-2">
            <MacroItem
              label="Oqsil"
              value={today.protein_g}
              unit="g"
              color="#a78bfa"
            />
            <MacroItem
              label="Yog'"
              value={today.fat_g}
              unit="g"
              color={accentOrange}
            />
            <MacroItem
              label="Uglerod"
              value={today.carbs_g}
              unit="g"
              color="#34d399"
            />
          </div>
        </div>
      )}

      {/* Water chart */}
      <ChartSection
        title="Suv — 7 kun"
        icon={<Droplets size={14} style={{ color: accent }} />}
        isDark={isDark}
      >
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: textColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: textColor }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: isDark ? "#111827" : "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v} ml`, "Suv"]}
            />
            <Area
              type="monotone"
              dataKey="water"
              stroke={accent}
              strokeWidth={2.5}
              fill="url(#waterGrad)"
              dot={{ fill: accent, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Calories chart */}
      <ChartSection
        title="Kaloriya — 7 kun"
        icon={<Flame size={14} style={{ color: accentOrange }} />}
        isDark={isDark}
      >
        <ResponsiveContainer width="100%" height={130}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: textColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: textColor }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: isDark ? "#111827" : "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v} kkal`, "Kaloriya"]}
            />
            <Bar dataKey="calories" radius={[8, 8, 0, 0]} maxBarSize={32}>
              {chartData.map((e, i) => (
                <Cell
                  key={i}
                  fill={e.calories >= e.goal_cal ? "#22c55e" : accentOrange}
                  fillOpacity={0.88}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* ── Active Goal Sections ── */}
      {goals.active.map((ag) => {
        if (ag.type === "sleep")
          return (
            <GoalSection
              key="sleep"
              title="Uyqu — 7 kun"
              icon={<Moon size={14} style={{ color: accentPurple }} />}
              todayValue={todaySleep}
              goalValue={SLEEP_GOAL}
              unit="soat"
              color={accentPurple}
              isDark={isDark}
              onLog={() => {
                setLogModal("sleep");
                setLogValue("");
              }}
              onRemove={() => removeGoal("sleep")}
            >
              <ResponsiveContainer width="100%" height={130}>
                <BarChart
                  data={sleepData}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: textColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: textColor }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 12]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: isDark ? "#111827" : "#fff",
                      border: "none",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} soat`, "Uyqu"]}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={32}>
                    {sleepData.map((e, i) => (
                      <Cell
                        key={i}
                        fill={e.value >= SLEEP_GOAL ? "#22c55e" : accentPurple}
                        fillOpacity={e.value === 0 ? 0.2 : 0.88}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GoalSection>
          );

        if (ag.type === "walking")
          return (
            <GoalSection
              key="walking"
              title="Yurish — 7 kun"
              icon={<Footprints size={14} style={{ color: accentGreen }} />}
              todayValue={todayWalking}
              goalValue={WALKING_GOAL}
              unit="qadam"
              color={accentGreen}
              isDark={isDark}
              onLog={() => {
                setLogModal("walking");
                setLogValue("");
              }}
              onRemove={() => removeGoal("walking")}
            >
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart
                  data={walkingData}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="walkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={accentGreen}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={accentGreen}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: textColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: textColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: isDark ? "#111827" : "#fff",
                      border: "none",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} qadam`, "Yurish"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={accentGreen}
                    strokeWidth={2.5}
                    fill="url(#walkGrad)"
                    dot={{ fill: accentGreen, r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </GoalSection>
          );
        return null;
      })}

      {/* ── Add Goal Button ── */}
      {availableToAdd.length > 0 && (
        <div className="px-4">
          {!showGoalPicker ? (
            <button
              onClick={() => setShowGoalPicker(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed active:opacity-70"
              style={{
                borderColor: isDark ? "#374151" : "#e2e8f0",
                color: "var(--tg-hint)",
              }}
            >
              <Plus size={16} />
              <span className="text-sm font-medium">Maqsad qo'shish</span>
            </button>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--tg-secondary-bg)" }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: isDark ? "#374151" : "#f1f5f9" }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--tg-text)" }}
                >
                  Qaysi maqsadni qo'shish?
                </p>
                <button onClick={() => setShowGoalPicker(false)}>
                  <X size={16} style={{ color: "var(--tg-hint)" }} />
                </button>
              </div>
              {availableToAdd.map((g) => (
                <button
                  key={g.type}
                  onClick={() => addGoal(g.type)}
                  className="w-full flex items-center gap-3 px-4 py-4 active:opacity-70 text-left"
                  style={{
                    borderBottom: `1px solid ${isDark ? "#374151" : "#f1f5f9"}`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: `${g.color}20`, color: g.color }}
                  >
                    {g.icon}
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--tg-text)" }}
                    >
                      {g.label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--tg-hint)" }}>
                      {g.type === "sleep"
                        ? `Maqsad: ${SLEEP_GOAL} soat`
                        : `Maqsad: ${WALKING_GOAL.toLocaleString()} qadam`}
                    </p>
                  </div>
                  <Plus
                    size={16}
                    style={{ color: g.color, marginLeft: "auto" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI usage */}
      {today && (
        <div
          className="mx-4 rounded-2xl p-4"
          style={{ background: "var(--tg-secondary-bg)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={15} style={{ color: "#a78bfa" }} />
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--tg-text)" }}
            >
              AI bugun
            </p>
          </div>
          <div className="flex gap-4">
            <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
              📝 Matn:{" "}
              <strong style={{ color: "var(--tg-text)" }}>
                {today.text_analyses_count}
              </strong>
            </span>
            <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
              🔍 Rasm:{" "}
              <strong style={{ color: "var(--tg-text)" }}>
                {today.vision_analyses_count}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {logModal && (
        <LogModal
          type={logModal}
          value={logValue}
          onChange={setLogValue}
          onConfirm={() => {
            const v = parseFloat(logValue);
            if (!isNaN(v) && v > 0) logGoalEntry(logModal, v);
          }}
          onClose={() => {
            setLogModal(null);
            setLogValue("");
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
}

// ── GoalSection ───────────────────────────────────────────────────────────────
function GoalSection({
  title,
  icon,
  todayValue,
  goalValue,
  unit,
  color,
  isDark,
  onLog,
  onRemove,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  todayValue: number;
  goalValue: number;
  unit: string;
  color: string;
  isDark: boolean;
  onLog: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const pct = Math.min(100, Math.round((todayValue / goalValue) * 100));
  return (
    <div className="mx-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--tg-text)" }}
          >
            {title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onLog}
            className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold active:opacity-70"
            style={{ background: `${color}20`, color }}
          >
            <Plus size={12} /> Qo'shish
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-xl active:opacity-70"
            style={{ background: isDark ? "#3f1f1f" : "#fee2e2" }}
          >
            <Trash2 size={14} color="#ef4444" />
          </button>
        </div>
      </div>

      {/* Today progress */}
      <div className="mb-2 px-1 flex items-center gap-3">
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: isDark ? "#1f2937" : "#e2e8f0" }}
        >
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${pct}%`,
              background: color,
              transition: "width 1s ease",
            }}
          />
        </div>
        <span
          className="text-xs font-medium whitespace-nowrap"
          style={{ color }}
        >
          {todayValue} / {goalValue} {unit}
        </span>
      </div>

      <div
        className="rounded-2xl p-3 pt-4"
        style={{ background: "var(--tg-secondary-bg)" }}
      >
        {children}
      </div>
    </div>
  );
}

// ── LogModal ──────────────────────────────────────────────────────────────────
function LogModal({
  type,
  value,
  onChange,
  onConfirm,
  onClose,
  isDark,
}: {
  type: GoalType;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const config = {
    sleep: {
      label: "Bugungi uyqu soatini kiriting",
      placeholder: "Masalan: 7.5",
      unit: "soat",
      max: 24,
    },
    walking: {
      label: "Bugungi qadam sonini kiriting",
      placeholder: "Masalan: 8500",
      unit: "qadam",
      max: 100000,
    },
  }[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full rounded-t-3xl p-6 space-y-4"
        style={{ background: isDark ? "#111827" : "#ffffff" }}
      >
        <div className="flex items-center justify-between">
          <p
            className="font-semibold text-base"
            style={{ color: "var(--tg-text)" }}
          >
            {config.label}
          </p>
          <button onClick={onClose}>
            <X size={20} style={{ color: "var(--tg-hint)" }} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={config.placeholder}
            className="flex-1 rounded-2xl px-4 py-3 text-lg font-bold outline-none"
            style={{
              background: isDark ? "#1f2937" : "#f3f4f6",
              color: "var(--tg-text)",
              border: "none",
            }}
            autoFocus
          />
          <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
            {config.unit}
          </span>
        </div>
        <button
          onClick={onConfirm}
          disabled={
            !value || isNaN(parseFloat(value)) || parseFloat(value) <= 0
          }
          className="w-full py-3 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 active:opacity-80"
          style={{ background: "linear-gradient(135deg, #1e3a5f, #2e86c1)" }}
        >
          <Check size={18} /> Saqlash
        </button>
      </div>
    </div>
  );
}

// ── ChartSection ──────────────────────────────────────────────────────────────
function ChartSection({
  title,
  icon,
  isDark,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--tg-text)" }}
        >
          {title}
        </p>
      </div>
      <div
        className="rounded-2xl p-3 pt-4"
        style={{ background: "var(--tg-secondary-bg)" }}
      >
        {children}
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  unit,
  sub,
  pct,
  color,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sub: string;
  pct: number;
  color: string;
  isDark: boolean;
}) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 300);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--tg-secondary-bg)" }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
        {icon}
        <span
          className="text-xs font-medium"
          style={{ color: "var(--tg-hint)" }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-bold" style={{ color: "var(--tg-text)" }}>
          {value}
        </p>
        <span className="text-xs" style={{ color: "var(--tg-hint)" }}>
          {unit}
        </span>
      </div>
      <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--tg-hint)" }}>
        {sub}
      </p>
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: isDark ? "#1f2937" : "#e2e8f0" }}
      >
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${animPct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
      <p className="text-xs mt-1 text-right font-medium" style={{ color }}>
        {pct}%
      </p>
    </div>
  );
}

// ── MacroItem ─────────────────────────────────────────────────────────────────
function MacroItem({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div
      className="text-center py-2 rounded-xl"
      style={{ background: `${color}15` }}
    >
      <p className="text-base font-bold" style={{ color }}>
        {value.toFixed(1)}
        <span className="text-xs ml-0.5">{unit}</span>
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--tg-hint)" }}>
        {label}
      </p>
    </div>
  );
}

// ── LoadingState ──────────────────────────────────────────────────────────────
function LoadingState({ dots, isDark }: { dots: number; isDark: boolean }) {
  const accent = isDark ? "#38bdf8" : "#0284c7";
  const accentOrange = isDark ? "#fb923c" : "#ea580c";
  const gridColor = isDark ? "#1f2937" : "#f1f5f9";
  const textColor = isDark ? "#374151" : "#e2e8f0";
  const skeletonData = [
    { day: "Du", water: 800, calories: 900 },
    { day: "Se", water: 1200, calories: 1400 },
    { day: "Ch", water: 600, calories: 700 },
    { day: "Pa", water: 1500, calories: 1800 },
    { day: "Ju", water: 900, calories: 1100 },
    { day: "Sh", water: 1100, calories: 1300 },
    { day: "Ya", water: 400, calories: 500 },
  ];
  return (
    <div className="pb-6 space-y-4 animate-pulse">
      <div className="px-4 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <Heart size={18} style={{ color: "#ef444466" }} />
          <div
            className="h-5 w-36 rounded-lg"
            style={{ background: "var(--tg-secondary-bg)" }}
          />
        </div>
        <div
          className="h-3 w-24 rounded mt-2 ml-6"
          style={{ background: "var(--tg-secondary-bg)" }}
        />
      </div>
      <div className="px-4 grid grid-cols-2 gap-3">
        {[accent, accentOrange].map((color, i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{ background: "var(--tg-secondary-bg)" }}
          >
            <div
              className="h-3 w-20 rounded mb-3"
              style={{ background: gridColor }}
            />
            <div
              className="h-7 w-16 rounded mb-1"
              style={{ background: gridColor }}
            />
            <div
              className="h-2.5 w-24 rounded mb-3"
              style={{ background: gridColor }}
            />
            <div
              className="w-full h-1.5 rounded-full"
              style={{ background: gridColor }}
            >
              <div
                className="h-1.5 rounded-full w-1/3"
                style={{ background: `${color}55` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mx-4">
        <div
          className="h-4 w-28 rounded mb-2"
          style={{ background: "var(--tg-secondary-bg)" }}
        />
        <div
          className="rounded-2xl p-3 pt-4"
          style={{ background: "var(--tg-secondary-bg)" }}
        >
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart
              data={skeletonData}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="skelWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridColor}
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: textColor }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: textColor }}
                axisLine={false}
                tickLine={false}
              />
              <Area
                type="monotone"
                dataKey="water"
                stroke={`${accent}40`}
                strokeWidth={2}
                fill="url(#skelWater)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mx-4">
        <div
          className="h-4 w-28 rounded mb-2"
          style={{ background: "var(--tg-secondary-bg)" }}
        />
        <div
          className="rounded-2xl p-3 pt-4"
          style={{ background: "var(--tg-secondary-bg)" }}
        >
          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={skeletonData}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridColor}
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: textColor }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: textColor }}
                axisLine={false}
                tickLine={false}
              />
              <Bar
                dataKey="calories"
                radius={[8, 8, 0, 0]}
                maxBarSize={32}
                fill={`${accentOrange}30`}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-center pt-2">
        <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
          Ma'lumotlar yuklanmoqda{".".repeat(dots)}
        </span>
      </div>
    </div>
  );
}

// ── ErrorState ────────────────────────────────────────────────────────────────
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64 px-6 text-center">
      <div>
        <p className="text-2xl mb-2">😔</p>
        <p className="text-sm" style={{ color: "var(--tg-hint)" }}>
          {message}
        </p>
      </div>
    </div>
  );
}
