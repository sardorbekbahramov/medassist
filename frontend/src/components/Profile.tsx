import { useEffect, useState } from 'react'
import { User, Scale, Ruler, Calendar, Droplets, Flame } from 'lucide-react'
import { api, UserProfile } from '@/lib/api'

interface ProfileProps {
  isDark: boolean
}

export function Profile({ isDark }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 px-6 text-center">
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          Profile not found. Please complete onboarding in the bot.
        </p>
      </div>
    )
  }

  const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2)
  const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
  const bmiColor = bmi < 18.5 ? '#f59e0b' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f97316' : '#ef4444'

  return (
    <div className="pb-6 space-y-4">
      {/* Header */}
      <div className="px-4 pt-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--tg-text)' }}>Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tg-hint)' }}>Your health information</p>
      </div>

      {/* Avatar + name */}
      <div className="mx-4 rounded-2xl p-5 flex items-center gap-4"
        style={{ background: 'var(--tg-secondary-bg)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
          style={{ background: isDark ? '#1e3a5f' : '#dbeafe' }}>
          <User size={28} style={{ color: 'var(--tg-link)' }} />
        </div>
        <div>
          <p className="text-lg font-semibold" style={{ color: 'var(--tg-text)' }}>
            {profile.full_name}
          </p>
          <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
            {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)} · {profile.language.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <InfoCard icon={<Calendar size={16} />} label="Age" value={`${profile.age} years`} color="#a78bfa" />
        <InfoCard icon={<Scale size={16} />} label="Weight" value={`${profile.weight_kg} kg`} color="#fb923c" />
        <InfoCard icon={<Ruler size={16} />} label="Height" value={`${profile.height_cm} cm`} color="#34d399" />
        <InfoCard
          icon={<span style={{ fontSize: 14 }}>📊</span>}
          label="BMI"
          value={`${bmi.toFixed(1)} — ${bmiLabel}`}
          color={bmiColor}
        />
      </div>

      {/* Daily goals */}
      <div className="mx-4 rounded-2xl p-4" style={{ background: 'var(--tg-secondary-bg)' }}>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--tg-text)' }}>Daily Goals</p>
        <div className="space-y-3">
          <GoalRow
            icon={<Droplets size={16} style={{ color: '#38bdf8' }} />}
            label="Water intake"
            value={`${profile.daily_water_goal_ml} ml`}
            color="#38bdf8"
            isDark={isDark}
          />
          <GoalRow
            icon={<Flame size={16} style={{ color: '#fb923c' }} />}
            label="Calories"
            value={`${profile.daily_calories_goal} kcal`}
            color="#fb923c"
            isDark={isDark}
          />
        </div>
      </div>

      {/* Edit hint */}
      <div className="mx-4 rounded-2xl p-4 text-center"
        style={{ background: 'var(--tg-secondary-bg)' }}>
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          To update your profile, use <strong style={{ color: 'var(--tg-text)' }}>/profile</strong> in the bot
        </p>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--tg-secondary-bg)' }}>
      <div className="flex items-center gap-2 mb-1.5" style={{ color }}>
        {icon}
        <span className="text-xs" style={{ color: 'var(--tg-hint)' }}>{label}</span>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--tg-text)' }}>{value}</p>
    </div>
  )
}

function GoalRow({ icon, label, value, color, isDark }: {
  icon: React.ReactNode; label: string; value: string; color: string; isDark: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm" style={{ color: 'var(--tg-hint)' }}>{label}</span>
      </div>
      <span className="text-sm font-semibold" style={{ color: 'var(--tg-text)' }}>{value}</span>
    </div>
  )
}
