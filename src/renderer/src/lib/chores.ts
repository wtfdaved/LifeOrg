import type { AppData, Chore, Energy } from './types'

const ENERGY_RANK: Record<Energy, number> = { low: 0, medium: 1, high: 2 }

export function fitsEnergy(needed: Energy | undefined, available: Energy | 'any'): boolean {
  return available === 'any' || ENERGY_RANK[needed ?? 'low'] <= ENERGY_RANK[available]
}

export function choreDoneOn(chore: Chore, date: string): boolean {
  return chore.history.includes(date)
}

function patchChore(data: AppData, id: string, fn: (c: Chore) => Chore): AppData {
  return { ...data, chores: data.chores.map((c) => (c.id === id ? fn(c) : c)) }
}

/** Toggle whether the chore was done on `date`; lastDone always tracks the latest history entry. */
export function toggleChoreDone(data: AppData, id: string, date: string): AppData {
  return patchChore(data, id, (c) => {
    const history = c.history.includes(date) ? c.history.filter((d) => d !== date) : [...c.history, date].sort()
    return { ...c, history, lastDone: history[history.length - 1] }
  })
}

export function toggleRoutineItem(data: AppData, date: string, routineId: string, itemId: string): AppData {
  const day = data.routineLog[date] ?? {}
  const checked = day[routineId] ?? []
  const next = checked.includes(itemId) ? checked.filter((i) => i !== itemId) : [...checked, itemId]
  return { ...data, routineLog: { ...data.routineLog, [date]: { ...day, [routineId]: next } } }
}

/** Count of things finished on `date`: to-dos, chores and routine steps. */
export function winsOn(data: AppData, date: string): number {
  const tasks = data.tasks.filter((t) => t.done && t.completedAt && toLocalKey(t.completedAt) === date).length
  const chores = data.chores.filter((c) => c.history.includes(date)).length
  const routines = Object.values(data.routineLog[date] ?? {}).reduce((n, ids) => n + ids.length, 0)
  return tasks + chores + routines
}

function toLocalKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
