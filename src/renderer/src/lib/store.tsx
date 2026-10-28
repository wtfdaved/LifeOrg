import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AppData, Chore, Routine } from './types'
import { todayKey } from './dates'

export function uid(): string {
  return crypto.randomUUID()
}

const routine = (name: string, icon: string, items: string[]): Routine => ({
  id: uid(),
  name,
  icon,
  items: items.map((title) => ({ id: uid(), title }))
})

export function starterRoutines(): Routine[] {
  return [
    routine('Morning', '🌅', ['Drink a glass of water', 'Take meds / vitamins', 'Make the bed', 'Do my LifeOrg check-in']),
    routine('Evening', '🌙', ['10-minute tidy', 'Lay out tomorrow (clothes, bag, keys)', 'Plug in phone outside bedroom'])
  ]
}

export function starterChores(): Chore[] {
  const today = todayKey()
  const chore = (title: string, icon: string, area: string, every: number, unit: 'day' | 'week', minutes: number, energy: Chore['energy']): Chore => ({
    id: uid(), title, icon, area, frequency: { every, unit }, startDate: today, history: [], minutes, energy
  })
  return [
    chore('Wipe kitchen counters', '🧽', 'Kitchen', 2, 'day', 5, 'low'),
    chore('Take out trash & recycling', '🗑️', 'Kitchen', 1, 'week', 5, 'low'),
    chore('Laundry', '🧺', 'Bedroom', 1, 'week', 20, 'medium'),
    chore('Change bed sheets', '🛏️', 'Bedroom', 2, 'week', 15, 'medium'),
    chore('Clean bathroom', '🛁', 'Bathroom', 1, 'week', 25, 'high')
  ]
}

export function emptyData(): AppData {
  const now = new Date().toISOString()
  return {
    schema: 1,
    events: [],
    tasks: [],
    chores: starterChores(),
    routines: starterRoutines(),
    routineLog: {},
    bills: [],
    daily: {},
    moods: {},
    lists: ['Personal', 'Work', 'Errands'],
    pages: [
      {
        id: uid(),
        title: 'Welcome',
        icon: '👋',
        parentId: null,
        createdAt: now,
        updatedAt: now,
        content: [
          { type: 'heading', content: 'Welcome to your whiteboard' },
          { type: 'paragraph', content: 'Type "/" for headings, lists, checklists, tables, images and more.' },
          { type: 'checkListItem', content: 'Add your first event on the Calendar' },
          { type: 'checkListItem', content: 'Log how you feel today in Mood' }
        ]
      }
    ],
    settings: { autoLockMinutes: 15, weekStartsOn: 0, theme: 'system', currency: 'USD' }
  }
}

/** Fill in fields added after a vault was created, so older vaults keep working. */
export function migrate(raw: unknown): AppData {
  const base = emptyData()
  const data = (raw ?? {}) as Partial<AppData>
  return {
    ...base,
    ...data,
    settings: { ...base.settings, ...data.settings },
    lists: data.lists?.length ? data.lists : base.lists,
    pages: data.pages ?? base.pages,
    // Vaults from before chores/routines existed get the starter set once.
    chores: data.chores ?? base.chores,
    routines: data.routines ?? base.routines,
    routineLog: data.routineLog ?? {},
    bills: data.bills ?? [],
    daily: data.daily ?? {}
  }
}

type SaveState = 'saved' | 'saving' | 'error'

interface Store {
  data: AppData
  update: (fn: (draft: AppData) => AppData) => void
  saveState: SaveState
  flush: () => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

const SAVE_DELAY_MS = 600

export function StoreProvider({ initial, children }: { initial: AppData; children: ReactNode }) {
  const [data, setData] = useState(initial)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const pending = useRef<AppData | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const toSave = pending.current
    if (!toSave) return
    pending.current = null
    const res = await window.vault.save(toSave)
    setSaveState(res.ok ? (pending.current ? 'saving' : 'saved') : 'error')
  }, [])

  const update = useCallback(
    (fn: (draft: AppData) => AppData) => {
      setData((prev) => {
        const next = fn(prev)
        pending.current = next
        return next
      })
      setSaveState('saving')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
    },
    [flush]
  )

  // Flush on unmount (e.g. locking) and when the window is closing.
  useEffect(() => {
    const onUnload = () => void flush()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      void flush()
    }
  }, [flush])

  return <StoreContext.Provider value={{ data, update, saveState, flush }}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store
}
