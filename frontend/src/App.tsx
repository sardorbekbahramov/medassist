import { useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { Dashboard } from "@/components/Dashboard";
import { MapView } from "@/components/MapView";
import { Profile } from "@/components/Profile";
import { Admin } from "@/components/Admin";
import { BottomNav } from "@/components/BottomNav";

type Tab = "dashboard" | "map" | "profile" | "admin";

const ADMIN_TG_ID = 6227059075;

export default function App() {
  const { isDark, user } = useTelegram();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const isAdmin = user?.id === ADMIN_TG_ID;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--tg-bg)" }}
    >
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 72 }}>
        {activeTab === "dashboard" && <Dashboard isDark={isDark} />}
        {activeTab === "map" && <MapView isDark={isDark} />}
        {activeTab === "profile" && <Profile isDark={isDark} />}
        {activeTab === "admin" && <Admin isDark={isDark} />}
      </div>
      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        isDark={isDark}
        isAdmin={isAdmin}
      />
    </div>
  );
}
