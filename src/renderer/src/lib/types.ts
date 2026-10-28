export type Priority = 'low' | 'medium' | 'high'
export type Energy = 'low' | 'medium' | 'high'

export interface Frequency {
  every: number
  unit: 'day' | 'week' | 'month' | 'year'
}

export interface CalendarEvent {
  id: string
  title: string
  start: string // ISO date-time, or YYYY-MM-DD when allDay
  end?: string
  allDay: boolean
  color: string
  notes?: string
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  notes?: string
  done: boolean
  completedAt?: string
  priority: Priority
  energy?: Energy
  // When set, the task shows on the calendar. A date-only value is an all-day task;
  // a date-time value is a time-blocked task lasting `durationMins`.
  due?: string
  durationMins: number
  subtasks?: Subtask[]
  list: string
  createdAt: string
}

export interface Chore {
  id: string
  title: string
  icon: string
  area: string
  frequency: Frequency
  startDate: string // first due date (YYYY-MM-DD)
  lastDone?: string // YYYY-MM-DD
  history: string[] // dates it was done, oldest first
  minutes: number
  energy: Energy
}

export interface RoutineItem {
  id: string
  title: string
}

export interface Routine {
  id: string
  name: string
  icon: string
  items: RoutineItem[]
}

export interface Bill {
  id: string
  name: string
  amount: number
  category: string
  anchor: string // first due date (YYYY-MM-DD); later due dates repeat from it
  frequency: Frequency | null // null = one-time
  autopay: boolean
  notes?: string
  paid: Record<string, string> // due date (YYYY-MM-DD) -> ISO time it was marked paid
  archived?: boolean
}

export interface DailyPlan {
  checkedInAt?: string
  top3: string[] // task ids
  intention?: string
}

export interface MoodEntry {
  date: string // YYYY-MM-DD
  mood: 1 | 2 | 3 | 4 | 5
  energy: 1 | 2 | 3 | 4 | 5
  tags: string[]
  note: string
}

export interface Page {
  id: string
  title: string
  icon: string
  parentId: string | null
  content: unknown[] // BlockNote document blocks
  createdAt: string
  updatedAt: string
}

export interface Settings {
  autoLockMinutes: number
  weekStartsOn: 0 | 1
  theme: 'light' | 'dark' | 'system'
  currency: string
}

export interface AppData {
  schema: 1
  events: CalendarEvent[]
  tasks: Task[]
  chores: Chore[]
  routines: Routine[]
  routineLog: Record<string, Record<string, string[]>> // date -> routine id -> checked item ids
  bills: Bill[]
  daily: Record<string, DailyPlan>
  moods: Record<string, MoodEntry>
  pages: Page[]
  lists: string[]
  settings: Settings
}

export type View = 'today' | 'checkin' | 'calendar' | 'tasks' | 'chores' | 'bills' | 'mood' | 'pages' | 'settings'
