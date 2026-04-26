import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Droplets, Flame, Activity, TrendingUp } from 'lucide-react'
import { api, DailyStats, UserProfile } from '@/lib/api'

interface DashboardProps {
  isDark: boolean
}

export function Dashboard({ isDark }: DashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getProfile(), api.getWeeklyStats()])
      .then(([p, s]) => {
        setProfile(p)
        setStats(s)
      })
      .catch(() => setError('Could not load data. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!profile) return null

  const today = stats[stats.length - 1]
  const waterPct = today ? Math.min(100, Math.round((today.water_ml / profile.daily_water_goal_ml) * 100)) : 0
  const calPct = today ? Math.min(100, Math.round((today.calories_consumed / profile.daily_calories_goal) * 100)) : 0

  const chartData = stats.map(s => ({
    day: new Date(s.date).toLocaleDateString('en', { weekday: 'short' }),
    water: s.water_ml,
    calories: s.calories_consumed,
    goal_water: profile.daily_water_goal_ml,
    goal_cal: profile.daily_calories_goal,
  }))

  const accent = isDark ? '#38bdf8' : '#0284c7'
  const accentOrange = isDark ? '#fb923c' : '#ea580c'
  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const textColor = isDark ? '#9ca3af' : '#6b7280'

  return (
    <div className="pb-6 space-y-4">
      {/* Header */}
      <div className="px-4 pt-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--tg-text)' }}>
          Health Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tg-hint)' }}>
          Welcome back, {profile.full_name}
        </p>
      </div>

      {/* Stat cards row */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={<Droplets size={18} />}
          label="Water Today"
          value={`${today?.water_ml ?? 0} ml`}
          sub={`Goal: ${profile.daily_water_goal_ml} ml`}
          pct={waterPct}
          color="#38bdf8"
          isDark={isDark}
        />
        <StatCard
          icon={<Flame size={18} />}
          label="Calories"
          value={`${today?.calories_consumed ?? 0}`}
          sub={`Goal: ${profile.daily_calories_goal} kcal`}
          pct={calPct}
          color="#fb923c"
          isDark={isDark}
        />
      </div>

      {/* Macros card */}
      {today && (
        <div className="mx-4 rounded-2xl p-4" style={{ background: 'var(--tg-secondary-bg)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--tg-text)' }}>
            Today's Macros
          </p>
          <div className="grid grid-cols-3 gap-2">
            <MacroItem label="Protein" value={today.protein_g} unit="g" color="#a78bfa" />
            <MacroItem label="Fat" value={today.fat_g} unit="g" color="#fb923c" />
            <MacroItem label="Carbs" value={today.carbs_g} unit="g" color="#34d399" />
          </div>
        </div>
      )}

      {/* Water chart */}
      <div className="mx-4">
        <p className="text-sm font-medium mb-2 px-0" style={{ color: 'var(--tg-text)' }}>
          <Droplets size={14} className="inline mr-1.5" style={{ color: accent }} />
          Water (7 days)
        </p>
        <div
          className="rounded-2xl p-3 pt-4"
          style={{ background: 'var(--tg-secondary-bg)' }}
        >
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#1f2937' : '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 12,
                  color: isDark ? '#f9fafb' : '#111827',
                }}
                formatter={(v: number) => [`${v} ml`, 'Water']}
              />
              <Area type="monotone" dataKey="water" stroke={accent} strokeWidth={2} fill="url(#waterGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calories chart */}
      <div className="mx-4">
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--tg-text)' }}>
          <Flame size={14} className="inline mr-1.5" style={{ color: accentOrange }} />
          Calories (7 days)
        </p>
        <div
          className="rounded-2xl p-3 pt-4"
          style={{ background: 'var(--tg-secondary-bg)' }}
        >
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#1f2937' : '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 12,
                  color: isDark ? '#f9fafb' : '#111827',
                }}
                formatter={(v: number) => [`${v} kcal`, 'Calories']}
              />
              <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.calories >= entry.goal_cal ? '#22c55e' : accentOrange}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI usage */}
      {today && (
        <div className="mx-4 rounded-2xl p-4" style={{ background: 'var(--tg-secondary-bg)' }}>
          <div className="flex items-center gap-2">
            <Activity size={16} style={{ color: accent }} />
            <p className="text-sm font-medium" style={{ color: 'var(--tg-text)' }}>AI Analyses Today</p>
          </div>
          <div className="mt-2 flex gap-4">
            <span className="text-sm" style={{ color: 'var(--tg-hint)' }}>
              📝 Text: <strong style={{ color: 'var(--tg-text)' }}>{today.text_analyses_count}</strong>
            </span>
            <span className="text-sm" style={{ color: 'var(--tg-hint)' }}>
              🔍 Vision: <strong style={{ color: 'var(--tg-text)' }}>{today.vision_analyses_count}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon, label, value, sub, pct, color, isDark
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  pct: number
  color: string
  isDark: boolean
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--tg-secondary-bg)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium" style={{ color: 'var(--tg-hint)' }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--tg-text)' }}>{value}</p>
      <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--tg-hint)' }}>{sub}</p>
      <div className="w-full h-1.5 rounded-full" style={{ background: isDark ? '#374151' : '#e5e7eb' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-xs mt-1 text-right" style={{ color }}>
        {pct}%
      </p>
    </div>
  )
}

function MacroItem({ label, value, unit, color }: {
  label: string; value: number; unit: string; color: string
}) {
  return (
    <div className="text-center">
      <p className="text-base font-bold" style={{ color }}>
        {value.toFixed(1)}{unit}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--tg-hint)' }}>{label}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>Loading your health data...</p>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64 px-6 text-center">
      <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>{message}</p>
    </div>
  )
}
