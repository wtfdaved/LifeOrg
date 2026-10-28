import { useCallback, useEffect, useState } from 'react'
import { MantineProvider } from '@mantine/core'
import { LockScreen } from './components/LockScreen'
import { emptyData, migrate, StoreProvider, useStore } from './lib/store'
import type { AppData, View } from './lib/types'
import { TodayView } from './views/TodayView'
import { CalendarView } from './views/CalendarView'
import { TasksView } from './views/TasksView'
import { MoodView } from './views/MoodView'
import { PagesView } from './views/PagesView'
import { SettingsView } from './views/SettingsView'
import { useColorScheme } from './lib/theme'
import { ChoresView } from './views/ChoresView'
import { BillsView } from './views/BillsView'
import { CheckInView } from './views/CheckInView'
import { FocusProvider, FocusTimer } from './components/FocusTimer'
import { todayKey } from './lib/dates'

export function App() {
  const [data, setData] = useState<AppData | null>(null)

  const onUnlocked = useCallback((raw: unknown) => setData(migrate(raw)), [])
  const onCreate = useCallback(async (password: string) => {
    const initial = emptyData()
    const res = await window.vault.create(password, initial)
    if (!res.ok) throw new Error(res.error)
    setData(initial)
  }, [])

  return (
    <MantineProvider>
      {data ? (
        <StoreProvider initial={data}>
          <Shell onLocked={() => setData(null)} />
        </StoreProvider>
      ) : (
        <LockScreen onUnlocked={onUnlocked} onCreate={onCreate} />
      )}
    </MantineProvider>
  )
}

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'checkin', label: 'Morning check-in', icon: '🧭' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'tasks', label: 'To-dos', icon: '✅' },
  { id: 'chores', label: 'Chores & routines', icon: '🧹' },
  { id: 'bills', label: 'Bills', icon: '💵' },
  { id: 'mood', label: 'Mood', icon: '🌈' },
  { id: 'pages', label: 'Whiteboard', icon: '📝' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

function Shell({ onLocked }: { onLocked: () => void }) {
  const { data, saveState, flush } = useStore()
  // Mornings open straight into the check-in until it's done for the day.
  const [view, setView] = useState<View>(() =>
    !data.daily[todayKey()]?.checkedInAt && new Date().getHours() < 12 ? 'checkin' : 'today'
  )
  const [openPageId, setOpenPageId] = useState<string | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const scheme = useColorScheme(data.settings.theme)

  const lock = useCallback(async () => {
    await flush()
    await window.vault.lock()
    onLocked()
  }, [flush, onLocked])

  // Auto-lock after a period without keyboard or mouse activity.
  useEffect(() => {
    const minutes = data.settings.autoLockMinutes
    if (!minutes) return
    let timer = window.setTimeout(lock, minutes * 60_000)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(lock, minutes * 60_000)
    }
    const events = ['mousemove', 'keydown', 'mousedown', 'wheel'] as const
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [data.settings.autoLockMinutes, lock])

  const openPage = (id: string) => {
    setOpenPageId(id)
    setView('pages')
  }

  return (
    <FocusProvider value={setFocusTaskId}>
    <div className="shell" data-scheme={scheme}>
      <nav className="sidebar">
        <div className="brand">
          <span className="brand-mark">✦</span> LifeOrg
        </div>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.id === 'checkin' && !data.daily[todayKey()]?.checkedInAt && <span className="nav-dot" title="Not done yet today" />}
          </button>
        ))}
        <div className="sidebar-footer">
          <span className={`save-dot ${saveState}`} />
          <span className="muted">
            {saveState === 'saved' ? 'Encrypted & saved' : saveState === 'saving' ? 'Saving…' : 'Save failed'}
          </span>
          <button className="btn ghost small" onClick={lock} title="Lock now">
            🔒 Lock
          </button>
        </div>
      </nav>
      <main className="content">
        {view === 'today' && <TodayView onNavigate={setView} onOpenPage={openPage} />}
        {view === 'checkin' && <CheckInView onNavigate={setView} />}
        {view === 'calendar' && <CalendarView />}
        {view === 'chores' && <ChoresView />}
        {view === 'bills' && <BillsView />}
        {view === 'tasks' && <TasksView />}
        {view === 'mood' && <MoodView />}
        {view === 'pages' && <PagesView openPageId={openPageId} onOpenPage={setOpenPageId} scheme={scheme} />}
        {view === 'settings' && <SettingsView />}
      </main>
      {focusTaskId && <FocusTimer taskId={focusTaskId} onClose={() => setFocusTaskId(null)} />}
    </div>
    </FocusProvider>
  )
}
