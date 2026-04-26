import { useState } from 'react'
import { useTelegram } from '@/hooks/useTelegram'
import { Dashboard } from '@/components/Dashboard'
import { MapView } from '@/components/MapView'
import { Profile } from '@/components/Profile'
import { BottomNav } from '@/components/BottomNav'

type Tab = 'dashboard' | 'map' | 'profile'

export default function App() {
  const { isDark } = useTelegram()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--tg-bg)' }}
    >
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 72 }}>
        {activeTab === 'dashboard' && <Dashboard isDark={isDark} />}
        {activeTab === 'map' && <MapView isDark={isDark} />}
        {activeTab === 'profile' && <Profile isDark={isDark} />}
      </div>

      {/* Bottom navigation */}
      <BottomNav active={activeTab} onChange={setActiveTab} isDark={isDark} />
    </div>
  )
}
