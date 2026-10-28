import type { AppData, Task } from './types'
import { dateKeyOf, todayKey } from './dates'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1
    if (!!a.due !== !!b.due) return a.due ? -1 : 1
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  })
}

export function isOverdue(task: Task, today = todayKey()): boolean {
  return !task.done && !!task.due && dateKeyOf(task.due) < today
}

export function tasksDueOn(tasks: Task[], dateKey: string): Task[] {
  return tasks.filter((t) => t.due && dateKeyOf(t.due) === dateKey)
}

export function upsertTask(data: AppData, task: Task): AppData {
  const exists = data.tasks.some((t) => t.id === task.id)
  return { ...data, tasks: exists ? data.tasks.map((t) => (t.id === task.id ? task : t)) : [...data.tasks, task] }
}

export function toggleTask(data: AppData, id: string): AppData {
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done, completedAt: t.done ? undefined : new Date().toISOString() } : t
    )
  }
}

export function deleteTask(data: AppData, id: string): AppData {
  return { ...data, tasks: data.tasks.filter((t) => t.id !== id) }
}

export const PRIORITY_COLORS: Record<Task['priority'], string> = {
  high: '#e5484d',
  medium: '#f5a524',
  low: '#8e8e93'
}
