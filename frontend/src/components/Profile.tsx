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
import { Droplets, Flame, Activity, Heart, Zap } from "lucide-react";
import { api, DailyStats, UserProfile } from "@/lib/api";

interface DashboardProps {
  isDark: boolean;
}

export function Dashboard({ isDark }: DashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dots, setDots] = useState(0);

  // Animated dots for loading
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
        if (retries > 0) {
          setTimeout(() => fetchData(retries - 1), 2500);
        } else {
          setError("Could not load data. Please try again.");
          setLoading(false);
        }
      }
    };
    fetchData();
  }, []);

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

  const chartData = stats.map((s) => ({
    day: new Date(s.date).toLocaleDateString("en", { weekday: "short" }),
    water: s.water_ml,
    calories: s.calories_consumed,
    goal_water: profile.daily_water_goal_ml,
    goal_cal: profile.daily_calories_goal,
  }));

  const accent = isDark ? "#38bdf8" : "#0284c7";
  const accentOrange = isDark ? "#fb923c" : "#ea580c";
  const gridColor = isDark ? "#1f2937" : "#f1f5f9";
  const textColor = isDark ? "#6b7280" : "#94a3b8";

  return (
    <div className="pb-6 space-y-4">
      {/* Header */}
      <div className="px-4 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <Heart size={18} style={{ color: "#ef4444" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--tg-text)" }}>
            Health Dashboard
          </h1>
        </div>
        <p className="text-sm mt-0.5 ml-6" style={{ color: "var(--tg-hint)" }}>
          {profile.full_name} · {profile.language.toUpperCase()}
        </p>
      </div>

      {/* Stat cards */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={<Droplets size={18} />}
          label="Water Today"
          value={`${today?.water_ml ?? 0}`}
          unit="ml"
          sub={`/ ${profile.daily_water_goal_ml} ml`}
          pct={waterPct}
          color="#38bdf8"
          isDark={isDark}
        />
        <StatCard
          icon={<Flame size={18} />}
          label="Calories"
          value={`${today?.calories_consumed ?? 0}`}
          unit="kcal"
          sub={`/ ${profile.daily_calories_goal} kcal`}
          pct={calPct}
          color="#fb923c"
          isDark={isDark}
        />
      </div>

      {/* Macros */}
      {today && (
        <div
          className="mx-4 rounded-2xl p-4"
          style={{ background: "var(--tg-secondary-bg)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--tg-hint)" }}
          >
            Today's Macros
          </p>
          <div className="grid grid-cols-3 gap-2">
            <MacroItem
              label="Protein"
              value={today.protein_g}
              unit="g"
              color="#a78bfa"
            />
            <MacroItem
              label="Fat"
              value={today.fat_g}
              unit="g"
              color="#fb923c"
            />
            <MacroItem
              label="Carbs"
              value={today.carbs_g}
              unit="g"
              color="#34d399"
            />
          </div>
        </div>
      )}

      {/* Water chart */}
      <div className="mx-4">
        <div className="flex items-center gap-2 mb-2">
          <Droplets size={14} style={{ color: accent }} />
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--tg-text)" }}
          >
            Water — 7 days
          </p>
        </div>
        <div
          className="rounded-2xl p-3 pt-4"
          style={{ background: "var(--tg-secondary-bg)" }}
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
                  color: isDark ? "#f9fafb" : "#111827",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
                formatter={(v: number) => [`${v} ml`, "Water"]}
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
        </div>
      </div>

      {/* Calories chart */}
      <div className="mx-4">
        <div className="flex items-center gap-2 mb-2">
          <Flame size={14} style={{ color: accentOrange }} />
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--tg-text)" }}
          >
            Calories — 7 days
          </p>
        </div>
        <div
          className="rounded-2xl p-3 pt-4"
          style={{ background: "var(--tg-secondary-bg)" }}
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
                  color: isDark ? "#f9fafb" : "#111827",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
                formatter={(v: number) => [`${v} kcal`, "Calories"]}
              />
              <Bar dataKey="calories" radius={[8, 8, 0, 0]} maxBarSize={32}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.calories >= entry.goal_cal
                        ? "#22c55e"
                        : accentOrange
                    }
                    fillOpacity={0.88}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
              AI Today
            </p>
          </div>
          <div className="flex gap-4">
            <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
              📝 Text:{" "}
              <strong style={{ color: "var(--tg-text)" }}>
                {today.text_analyses_count}
              </strong>
            </span>
            <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
              🔍 Vision:{" "}
              <strong style={{ color: "var(--tg-text)" }}>
                {today.vision_analyses_count}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
          className="h-1.5 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
          }}
        />
      </div>
      <p className="text-xs mt-1 text-right font-medium" style={{ color }}>
        {pct}%
      </p>
    </div>
  );
}

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

function LoadingState({ dots, isDark }: { dots: number; isDark: boolean }) {
  const accent = isDark ? "#38bdf8" : "#0284c7";
  const accentOrange = isDark ? "#fb923c" : "#ea580c";
  const gridColor = isDark ? "#1f2937" : "#f1f5f9";
  const textColor = isDark ? "#374151" : "#e2e8f0";

  // Fake skeleton data
  const skeletonData = [
    { day: "Mon", water: 800, calories: 900 },
    { day: "Tue", water: 1200, calories: 1400 },
    { day: "Wed", water: 600, calories: 700 },
    { day: "Thu", water: 1500, calories: 1800 },
    { day: "Fri", water: 900, calories: 1100 },
    { day: "Sat", water: 1100, calories: 1300 },
    { day: "Sun", water: 400, calories: 500 },
  ];

  const dotStr = ".".repeat(dots);

  return (
    <div className="pb-6 space-y-4 animate-pulse">
      {/* Header skeleton */}
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

      {/* Stat card skeletons */}
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
                className="h-1.5 rounded-full w-1/3 transition-all"
                style={{ background: `${color}55` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Water chart skeleton */}
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

      {/* Calories chart skeleton */}
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

      {/* Loading text */}
      <div className="flex justify-center pt-2">
        <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
          Loading your health data{dotStr}
        </span>
      </div>
    </div>
  );
}

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
