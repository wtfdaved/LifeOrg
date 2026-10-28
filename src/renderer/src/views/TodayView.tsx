import { useMemo, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { dateKeyOf, parseLocal, todayKey } from '../lib/dates'
import { addInterval, billOccurrences, choreDue, overdueBills } from '../lib/recurrence'
import { formatMoney } from '../lib/bills'
import { choreDoneOn, winsOn } from '../lib/chores'
import { isOverdue, sortTasks, upsertTask } from '../lib/tasks'
import { moodMeta } from '../lib/mood'
import { TaskRow } from '../components/TaskRow'
import { TaskModal, newTask } from '../components/TaskModal'
import { RoutineCards } from '../components/Routines'
import { BillLine } from './BillsView'
import { ChoreCard } from './ChoresView'
import type { Task, View } from '../lib/types'

export function TodayView({ onNavigate, onOpenPage }: { onNavigate: (v: View) => void; onOpenPage: (id: string) => void }) {
  const { data, update } = useStore()
  const [editing, setEditing] = useState<Task | null>(null)
  const [quick, setQuick] = useState('')
  const today = todayKey()
  const plan = data.daily[today]
  const money = (n: number) => formatMoney(n, data.settings.currency)

  const top3 = (plan?.top3 ?? []).map((id) => data.tasks.find((t) => t.id === id)).filter((t): t is Task => !!t)

  const todaysTasks = useMemo(
    () =>
      sortTasks(
        data.tasks.filter((t) => !plan?.top3.includes(t.id) && t.due && (dateKeyOf(t.due) === today || isOverdue(t, today)))
      ),
    [data.tasks, today, plan]
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

  const dueChores = useMemo(
    () =>
      data.chores
        .map((chore) => ({ chore, due: choreDue(chore) }))
        .filter(({ chore, due }) => due <= today || choreDoneOn(chore, today))
        .sort((a, b) => Number(choreDoneOn(a.chore, today)) - Number(choreDoneOn(b.chore, today)) || a.due.localeCompare(b.due)),
    [data.chores, today]
  )

  const bills = useMemo(
    () => [
      ...overdueBills(data.bills, today),
      ...billOccurrences(data.bills, today, addInterval(today, { every: 7, unit: 'day' })).filter((o) => !o.paid)
    ],
    [data.bills, today]
  )

  const recentPages = useMemo(
    () => [...data.pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4),
    [data.pages]
  )

  const mood = data.moods[today]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const wins = winsOn(data, today)

  const quickAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!quick.trim()) return
    update((d) => upsertTask(d, newTask({ title: quick.trim(), due: today, list: d.lists[0] })))
    setQuick('')
  }

  return (
    <div className="today">
      <header className="today-header">
        <div>
          <h1>{greeting}</h1>
          <p className="muted">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {mood && ` · feeling ${moodMeta(mood.mood).emoji}`}
          </p>
        </div>
        <span className="wins-pill big">🏆 {wins} win{wins === 1 ? '' : 's'} today</span>
      </header>

      {!plan?.checkedInAt ? (
        <button className="checkin-banner" onClick={() => onNavigate('checkin')}>
          <span className="checkin-banner-icon">☀️</span>
          <span>
            <b>Start your morning check-in</b>
            <span className="muted"> About 3 minutes: how you feel, a brain dump, a quick review, then your top 3.</span>
          </span>
          <span className="btn primary">Let's go →</span>
        </button>
      ) : (
        plan.intention && (
          <div className="intention">
            🎯 Today's intention: <b>{plan.intention}</b>
          </div>
        )
      )}

      <div className="today-grid">
        <section className="card top3-card">
          <div className="side-header">
            <h2>Top 3</h2>
            <button className="btn ghost small" onClick={() => onNavigate('checkin')}>
              {top3.length ? 'Change' : 'Pick'} →
            </button>
          </div>
          {top3.map((t, i) => (
            <div key={t.id} className="top3-row">
              <span className="pick-num">{i + 1}</span>
              <TaskRow task={t} onEdit={setEditing} />
            </div>
          ))}
          {top3.length === 0 && (
            <p className="muted small">Pick up to three things that would make today a win, during your check-in.</p>
          )}
        </section>

        <section className="card">
          <RoutineCards compact />
        </section>

        <section className="card">
          <div className="side-header">
            <h2>Also on today</h2>
            <span className="muted small">
              {todaysTasks.filter((t) => t.done).length}/{todaysTasks.length} done
            </span>
          </div>
          <form onSubmit={quickAdd}>
            <input className="quick-add" placeholder="Add a to-do for today…" value={quick} onChange={(e) => setQuick(e.target.value)} />
          </form>
          <div className="task-list">
            {todaysTasks.map((t) => (
              <TaskRow key={t.id} task={t} onEdit={setEditing} />
            ))}
            {todaysTasks.length === 0 && <p className="muted small">Nothing else due today.</p>}
          </div>
        </section>

        <section className="card">
          <div className="side-header">
            <h2>Schedule</h2>
            <button className="btn ghost small" onClick={() => onNavigate('calendar')}>
              Calendar →
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
            <h2>Chores</h2>
            <button className="btn ghost small" onClick={() => onNavigate('chores')}>
              All chores →
            </button>
          </div>
          <div className="chore-grid single">
            {dueChores.slice(0, 5).map(({ chore, due }) => (
              <ChoreCard key={chore.id} chore={chore} due={due} />
            ))}
          </div>
          {dueChores.length > 5 && <p className="muted small">+{dueChores.length - 5} more</p>}
          {dueChores.length === 0 && <p className="muted small">No chores due. Enjoy it. 🌿</p>}
        </section>

        <section className="card">
          <div className="side-header">
            <h2>Bills this week</h2>
            <button className="btn ghost small" onClick={() => onNavigate('bills')}>
              All bills →
            </button>
          </div>
          {bills.map((o) => (
            <BillLine key={o.bill.id + o.due} occ={o} money={money} />
          ))}
          {bills.length === 0 && <p className="muted small">No bills due in the next 7 days.</p>}
        </section>

        <section className="card">
          <div className="side-header">
            <h2>Recent notes</h2>
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
