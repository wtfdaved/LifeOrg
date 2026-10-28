import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AppData } from './types'

export function uid(): string {
  return crypto.randomUUID()
}

export function emptyData(): AppData {
  const now = new Date().toISOString()
  return {
    schema: 1,
    events: [],
    tasks: [],
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
    settings: { autoLockMinutes: 15, weekStartsOn: 0, theme: 'system' }
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
    pages: data.pages ?? base.pages
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
