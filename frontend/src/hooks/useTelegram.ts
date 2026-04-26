import { useEffect, useState } from 'react'

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
  }
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    start_param?: string
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (fn: () => void) => void
    offClick: (fn: () => void) => void
  }
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    onClick: (fn: () => void) => void
    offClick: (fn: () => void) => void
    setText: (text: string) => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  sendData: (data: string) => void
  isExpanded: boolean
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp
  const [isDark, setIsDark] = useState(tg?.colorScheme === 'dark')

  useEffect(() => {
    if (!tg) return
    tg.ready()
    tg.expand()

    // Apply theme colors as CSS variables
    const tp = tg.themeParams
    const root = document.documentElement
    if (tp.bg_color) root.style.setProperty('--tg-bg', tp.bg_color)
    if (tp.text_color) root.style.setProperty('--tg-text', tp.text_color)
    if (tp.hint_color) root.style.setProperty('--tg-hint', tp.hint_color)
    if (tp.link_color) root.style.setProperty('--tg-link', tp.link_color)
    if (tp.button_color) root.style.setProperty('--tg-button', tp.button_color)
    if (tp.button_text_color) root.style.setProperty('--tg-button-text', tp.button_text_color)
    if (tp.secondary_bg_color) root.style.setProperty('--tg-secondary-bg', tp.secondary_bg_color)

    setIsDark(tg.colorScheme === 'dark')

    // Toggle dark class on html element
    document.documentElement.classList.toggle('dark', tg.colorScheme === 'dark')
  }, [])

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    isDark,
    colorScheme: tg?.colorScheme ?? 'light',
    initData: tg?.initData ?? '',
  }
}
