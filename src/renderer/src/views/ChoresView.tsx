import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { parseLocal, todayKey } from '../lib/dates'
import { choreDue, describeFrequency, dueStatus, type DueStatus } from '../lib/recurrence'
import { choreDoneOn, fitsEnergy, toggleChoreDone, winsOn } from '../lib/chores'
import { ChoreModal, newChore } from '../components/ChoreModal'
import { RoutineCards } from '../components/Routines'
import { ENERGY_ICONS } from '../components/TaskModal'
import type { Chore, Energy } from '../lib/types'

const SECTIONS: { id: DueStatus | 'done'; label: string }[] = [
  { id: 'overdue', label: '⏰ Catch up' },
  { id: 'today', label: '📌 Due today' },
  { id: 'done', label: '✅ Done today' },
  { id: 'soon', label: '📆 This week' },
  { id: 'later', label: '🗂 Later' }
]

export function ChoresView() {
  const { data } = useStore()
  const [energy, setEnergy] = useState<Energy | 'any'>('any')
  const [quickOnly, setQuickOnly] = useState(false)
  const [editing, setEditing] = useState<Chore | null>(null)
  const today = todayKey()

  const grouped = useMemo(() => {
    const groups: Record<string, { chore: Chore; due: string }[]> = {}
    for (const chore of data.chores) {
      if (!fitsEnergy(chore.energy, energy) || (quickOnly && chore.minutes > 10)) continue
      const due = choreDue(chore)
      const key = choreDoneOn(chore, today) ? 'done' : dueStatus(due, today)
      ;(groups[key] ??= []).push({ chore, due })
    }
    for (const list of Object.values(groups)) list.sort((a, b) => a.due.localeCompare(b.due) || a.chore.minutes - b.chore.minutes)
    return groups
  }, [data.chores, energy, quickOnly, today])

  const wins = winsOn(data, today)

  return (
    <div className="chores-layout">
      <section className="chores-main">
        <header className="view-header">
          <div>
            <h1>Chores & routines</h1>
            <p className="muted">Chores come back on their own schedule. No guilt, just the next small thing.</p>
          </div>
          <button className="btn primary" onClick={() => setEditing(newChore())}>
            + New chore
          </button>
        </header>

        <div className="filter-bar">
          <span className="muted small">My energy right now:</span>
          <div className="segmented">
            {(['any', 'low', 'medium', 'high'] as const).map((e) => (
              <button key={e} className={energy === e ? 'selected' : ''} onClick={() => setEnergy(e)}>
                {e === 'any' ? 'Show all' : `${ENERGY_ICONS[e]} ${e}`}
              </button>
            ))}
          </div>
          <button className={`chip ${quickOnly ? 'selected' : ''}`} onClick={() => setQuickOnly(!quickOnly)}>
            ⚡ Quick wins (≤10 min)
          </button>
          <span className="wins-pill">🏆 {wins} win{wins === 1 ? '' : 's'} today</span>
        </div>

        {SECTIONS.map(({ id, label }) =>
          grouped[id]?.length ? (
            <div key={id} className="chore-section">
              <h3>
                {label} <span className="badge">{grouped[id].length}</span>
              </h3>
              <div className="chore-grid">
                {grouped[id].map(({ chore, due }) => (
                  <ChoreCard key={chore.id} chore={chore} due={due} onEdit={() => setEditing(chore)} />
                ))}
              </div>
            </div>
          ) : null
        )}
        {data.chores.length === 0 && <p className="empty">No chores yet. Add one to get started.</p>}
      </section>

      <aside className="chores-side">
        <RoutineCards />
      </aside>
      {editing && <ChoreModal chore={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function relative(due: string, today: string): string {
  const days = Math.round((parseLocal(due).getTime() - parseLocal(today).getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days < 0 ? `${-days} days ago` : `in ${days} days`
}

export function ChoreCard({ chore, due, onEdit }: { chore: Chore; due: string; onEdit?: () => void }) {
  const { update } = useStore()
  const today = todayKey()
  const done = choreDoneOn(chore, today)
  const status = dueStatus(due, today)
  return (
    <div className={`chore-card ${done ? 'done' : status}`}>
      <span className="chore-icon">{chore.icon}</span>
      <div className="chore-info">
        <button className="task-title" onClick={onEdit}>
          {chore.title}
        </button>
        <span className="muted small">
          {done
            ? 'Done today 🎉'
            : `${status === 'overdue' ? 'Was due' : 'Due'} ${relative(due, today)} · ${describeFrequency(chore.frequency)}`}
          {' · '}
          {chore.minutes} min {ENERGY_ICONS[chore.energy]}
        </span>
      </div>
      <button
        className={`btn small ${done ? '' : 'primary'}`}
        onClick={() => update((d) => toggleChoreDone(d, chore.id, today))}
        title={done ? 'Undo' : 'Mark done'}
      >
        {done ? 'Undo' : '✓ Done'}
      </button>
    </div>
  )
}
