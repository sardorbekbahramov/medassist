import { useEffect, useState } from "react";
import {
  User,
  Scale,
  Ruler,
  Calendar,
  Droplets,
  Flame,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { api, UserProfile } from "@/lib/api";

interface ProfileProps {
  isDark: boolean;
}

export function Profile({ isDark }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    api
      .getProfile()
      .then((p) => {
        setProfile(p);
        setForm(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        full_name: form.full_name,
        age: Number(form.age),
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
        gender: form.gender,
        language: form.language,
      });
      setProfile(updated);
      setForm(updated);
      setEditing(false);
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!profile)
    return (
      <div className="flex items-center justify-center h-64 px-6 text-center">
        <p className="text-sm" style={{ color: "var(--tg-hint)" }}>
          Profile not found. Please complete onboarding in the bot.
        </p>
      </div>
    );

  const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
  const bmiLabel =
    bmi < 18.5
      ? "Underweight"
      : bmi < 25
        ? "Normal ✅"
        : bmi < 30
          ? "Overweight ⚠️"
          : "Obese ❗";
  const bmiColor =
    bmi < 18.5
      ? "#f59e0b"
      : bmi < 25
        ? "#22c55e"
        : bmi < 30
          ? "#f97316"
          : "#ef4444";

  const inputStyle = {
    background: isDark ? "#1f2937" : "#f3f4f6",
    color: "var(--tg-text)",
    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
    borderRadius: 10,
    padding: "8px 12px",
    width: "100%",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div className="pb-6 space-y-4">
      {/* Header */}
      <div className="px-4 pt-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--tg-text)" }}>
            Profile
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--tg-hint)" }}>
            Your health information
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-opacity active:opacity-70"
            style={{
              background: "var(--tg-secondary-bg)",
              color: "var(--tg-link)",
            }}
          >
            <Edit2 size={14} /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setForm(profile);
              }}
              className="p-2 rounded-xl transition-opacity active:opacity-70"
              style={{
                background: "var(--tg-secondary-bg)",
                color: "var(--tg-hint)",
              }}
            >
              <X size={16} />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-50"
              style={{
                background: "var(--tg-button)",
                color: "var(--tg-button-text)",
              }}
            >
              {saving ? (
                "..."
              ) : (
                <>
                  <Check size={14} /> Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Avatar + name */}
      <div
        className="mx-4 rounded-2xl p-5 flex items-center gap-4"
        style={{ background: "var(--tg-secondary-bg)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: isDark ? "#1e3a5f" : "#dbeafe" }}
        >
          <User size={28} style={{ color: "var(--tg-link)" }} />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              style={inputStyle}
              value={form.full_name || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
              placeholder="Full name"
            />
          ) : (
            <>
              <p
                className="text-lg font-bold truncate"
                style={{ color: "var(--tg-text)" }}
              >
                {profile.full_name}
              </p>
              <p className="text-sm mt-0.5" style={{ color: "var(--tg-hint)" }}>
                {profile.gender.charAt(0).toUpperCase() +
                  profile.gender.slice(1)}{" "}
                · {profile.language.toUpperCase()}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing ? (
        <div
          className="mx-4 rounded-2xl p-4 space-y-4"
          style={{ background: "var(--tg-secondary-bg)" }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--tg-text)" }}
          >
            Edit Profile
          </p>

          <div>
            <label
              className="text-xs mb-1.5 block font-medium"
              style={{ color: "var(--tg-hint)" }}
            >
              Age
            </label>
            <input
              type="number"
              style={inputStyle}
              value={form.age || ""}
              min={1}
              max={120}
              onChange={(e) =>
                setForm((f) => ({ ...f, age: Number(e.target.value) }))
              }
            />
          </div>

          <div>
            <label
              className="text-xs mb-1.5 block font-medium"
              style={{ color: "var(--tg-hint)" }}
            >
              Weight (kg)
            </label>
            <input
              type="number"
              style={inputStyle}
              value={form.weight_kg || ""}
              min={1}
              max={500}
              step={0.1}
              onChange={(e) =>
                setForm((f) => ({ ...f, weight_kg: Number(e.target.value) }))
              }
            />
          </div>

          <div>
            <label
              className="text-xs mb-1.5 block font-medium"
              style={{ color: "var(--tg-hint)" }}
            >
              Height (cm)
            </label>
            <input
              type="number"
              style={inputStyle}
              value={form.height_cm || ""}
              min={50}
              max={300}
              step={0.1}
              onChange={(e) =>
                setForm((f) => ({ ...f, height_cm: Number(e.target.value) }))
              }
            />
          </div>

          <div>
            <label
              className="text-xs mb-1.5 block font-medium"
              style={{ color: "var(--tg-hint)" }}
            >
              Gender
            </label>
            <select
              style={inputStyle}
              value={form.gender || "other"}
              onChange={(e) =>
                setForm((f) => ({ ...f, gender: e.target.value }))
              }
            >
              <option value="male">♂ Male</option>
              <option value="female">♀ Female</option>
              <option value="other">⚥ Other</option>
            </select>
          </div>

          <div>
            <label
              className="text-xs mb-1.5 block font-medium"
              style={{ color: "var(--tg-hint)" }}
            >
              Language
            </label>
            <select
              style={inputStyle}
              value={form.language || "en"}
              onChange={(e) =>
                setForm((f) => ({ ...f, language: e.target.value }))
              }
            >
              <option value="en">🇬🇧 English</option>
              <option value="ru">🇷🇺 Русский</option>
              <option value="uz">🇺🇿 O'zbek</option>
            </select>
          </div>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="px-4 grid grid-cols-2 gap-3">
            <InfoCard
              icon={<Calendar size={16} />}
              label="Age"
              value={`${profile.age} years`}
              color="#a78bfa"
            />
            <InfoCard
              icon={<Scale size={16} />}
              label="Weight"
              value={`${profile.weight_kg} kg`}
              color="#fb923c"
            />
            <InfoCard
              icon={<Ruler size={16} />}
              label="Height"
              value={`${profile.height_cm} cm`}
              color="#34d399"
            />
            <InfoCard
              icon={<span style={{ fontSize: 14 }}>📊</span>}
              label="BMI"
              value={`${bmi.toFixed(1)} — ${bmiLabel}`}
              color={bmiColor}
            />
          </div>

          {/* Daily goals */}
          <div
            className="mx-4 rounded-2xl p-4"
            style={{ background: "var(--tg-secondary-bg)" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--tg-hint)" }}
            >
              Daily Goals
            </p>
            <div className="space-y-3">
              <GoalRow
                icon={<Droplets size={16} style={{ color: "#38bdf8" }} />}
                label="Water intake"
                value={`${profile.daily_water_goal_ml} ml`}
              />
              <GoalRow
                icon={<Flame size={16} style={{ color: "#fb923c" }} />}
                label="Calories"
                value={`${profile.daily_calories_goal} kcal`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--tg-secondary-bg)" }}
    >
      <div className="flex items-center gap-2 mb-1.5" style={{ color }}>
        {icon}
        <span
          className="text-xs font-medium"
          style={{ color: "var(--tg-hint)" }}
        >
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold" style={{ color: "var(--tg-text)" }}>
        {value}
      </p>
    </div>
  );
}

function GoalRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm" style={{ color: "var(--tg-hint)" }}>
          {label}
        </span>
      </div>
      <span
        className="text-sm font-semibold"
        style={{ color: "var(--tg-text)" }}
      >
        {value}
      </span>
    </div>
  );
}
