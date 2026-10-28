export type Priority = 'low' | 'medium' | 'high'

export interface CalendarEvent {
  id: string
  title: string
  start: string // ISO date-time, or YYYY-MM-DD when allDay
  end?: string
  allDay: boolean
  color: string
  notes?: string
}

export interface Task {
  id: string
  title: string
  notes?: string
  done: boolean
  completedAt?: string
  priority: Priority
  // When set, the task shows on the calendar. A date-only value is an all-day task;
  // a date-time value is a time-blocked task lasting `durationMins`.
  due?: string
  durationMins: number
  list: string
  createdAt: string
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
}

export interface AppData {
  schema: 1
  events: CalendarEvent[]
  tasks: Task[]
  moods: Record<string, MoodEntry>
  pages: Page[]
  lists: string[]
  settings: Settings
}

export type View = 'today' | 'calendar' | 'tasks' | 'mood' | 'pages' | 'settings'
