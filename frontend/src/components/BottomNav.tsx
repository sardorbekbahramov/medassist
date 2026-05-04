import { LayoutDashboard, MapPin, User, Shield } from "lucide-react";

type Tab = "dashboard" | "map" | "profile" | "admin";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  isDark: boolean;
  isAdmin?: boolean;
}

export function BottomNav({
  active,
  onChange,
  isDark,
  isAdmin,
}: BottomNavProps) {
  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    {
      key: "dashboard",
      icon: <LayoutDashboard size={22} />,
      label: "Dashboard",
    },
    { key: "map", icon: <MapPin size={22} />, label: "Nearby" },
    { key: "profile", icon: <User size={22} />, label: "Profile" },
    ...(isAdmin
      ? [{ key: "admin" as Tab, icon: <Shield size={22} />, label: "Admin" }]
      : []),
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-2"
      style={{
        background: "var(--tg-bg)",
        borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90"
            style={{
              color: isActive
                ? tab.key === "admin"
                  ? "#ef4444"
                  : "var(--tg-link)"
                : "var(--tg-hint)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span style={{ opacity: isActive ? 1 : 0.6 }}>{tab.icon}</span>
            <span
              className="text-xs font-medium"
              style={{ opacity: isActive ? 1 : 0.6 }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
