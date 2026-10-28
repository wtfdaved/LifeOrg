import { useMemo, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { dateKeyOf, parseLocal, todayKey } from '../lib/dates'
import { isOverdue, sortTasks, upsertTask } from '../lib/tasks'
import { moodMeta, MOODS } from '../lib/mood'
import { TaskRow } from '../components/TaskRow'
import { TaskModal, newTask } from '../components/TaskModal'
import type { Task, View } from '../lib/types'

export function TodayView({ onNavigate, onOpenPage }: { onNavigate: (v: View) => void; onOpenPage: (id: string) => void }) {
  const { data, update } = useStore()
  const [editing, setEditing] = useState<Task | null>(null)
  const [quick, setQuick] = useState('')
  const today = todayKey()

  const todaysTasks = useMemo(
    () => sortTasks(data.tasks.filter((t) => t.due && (dateKeyOf(t.due) === today || isOverdue(t)))),
    [data.tasks, today]
  )

  const todaysEvents = useMemo(
    () =>
      data.events
        .filter((e) => {
          const start = dateKeyOf(e.start)
          const end = e.end ? dateKeyOf(e.end) : start
          return start <= today && today <= end
        })
        .sort((a, b) => Number(!a.allDay) - Number(!b.allDay) || a.start.localeCompare(b.start)),
    [data.events, today]
  )

  const recentPages = useMemo(
    () => [...data.pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [data.pages]
  )

  const mood = data.moods[today]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const quickAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!quick.trim()) return
    update((d) => upsertTask(d, newTask({ title: quick.trim(), due: today, list: d.lists[0] })))
    setQuick('')
  }

  const setMood = (value: (typeof MOODS)[number]['value']) =>
    update((d) => ({
      ...d,
      moods: { ...d.moods, [today]: { ...(d.moods[today] ?? { date: today, energy: 3, tags: [], note: '' }), mood: value } }
    }))

  const done = todaysTasks.filter((t) => t.done).length

  return (
    <div className="today">
      <header>
        <h1>{greeting}</h1>
        <p className="muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </header>

      <div className="today-grid">
        <section className="card">
          <div className="side-header">
            <h2>To-dos</h2>
            <span className="muted small">
              {done}/{todaysTasks.length} done
            </span>
          </div>
          <form onSubmit={quickAdd}>
            <input className="quick-add" placeholder="Add a to-do for today…" value={quick} onChange={(e) => setQuick(e.target.value)} />
          </form>
          <div className="task-list">
            {todaysTasks.map((t) => (
              <TaskRow key={t.id} task={t} onEdit={setEditing} />
            ))}
            {todaysTasks.length === 0 && <p className="muted small">Nothing due today.</p>}
          </div>
        </section>

        <section className="card">
          <div className="side-header">
            <h2>Schedule</h2>
            <button className="btn ghost small" onClick={() => onNavigate('calendar')}>
              Open calendar →
            </button>
          </div>
          {todaysEvents.map((e) => (
            <div key={e.id} className="agenda-item" style={{ borderLeftColor: e.color }}>
              <span className="agenda-time">
                {e.allDay ? 'All day' : parseLocal(e.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
              {e.title}
            </div>
          ))}
          {todaysEvents.length === 0 && <p className="muted small">No events today.</p>}
        </section>

        <section className="card">
          <div className="side-header">
            <h2>Mood</h2>
            <button className="btn ghost small" onClick={() => onNavigate('mood')}>
              Journal →
            </button>
          </div>
          <div className="mood-picker compact">
            {MOODS.map((m) => (
              <button
                key={m.value}
                className={`mood-btn ${mood?.mood === m.value ? 'selected' : ''}`}
                style={{ ['--mood-color' as string]: m.color }}
                onClick={() => setMood(m.value)}
                title={m.label}
              >
                <span className="mood-emoji">{m.emoji}</span>
              </button>
            ))}
          </div>
          {mood && <p className="muted small">Feeling {moodMeta(mood.mood).label.toLowerCase()} today.</p>}
        </section>

        <section className="card">
          <div className="side-header">
            <h2>Recent pages</h2>
            <button className="btn ghost small" onClick={() => onNavigate('pages')}>
              Whiteboard →
            </button>
          </div>
          {recentPages.map((p) => (
            <button key={p.id} className="side-item" onClick={() => onOpenPage(p.id)}>
              {p.icon} {p.title || 'Untitled'}
            </button>
          ))}
        </section>
      </div>
      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
