import { useState } from 'react'
import { uid, useStore } from '../lib/store'
import { todayKey } from '../lib/dates'
import { toggleRoutineItem } from '../lib/chores'
import { Modal } from './Modal'
import type { Routine } from '../lib/types'

/** Today's checklist for each routine, with a progress bar. */
export function RoutineCards({ compact }: { compact?: boolean }) {
  const { data, update } = useStore()
  const [editing, setEditing] = useState<Routine | null>(null)
  const today = todayKey()

  return (
    <div className={`routines ${compact ? 'compact' : ''}`}>
      {data.routines.map((r) => {
        const checked = data.routineLog[today]?.[r.id] ?? []
        const done = r.items.filter((i) => checked.includes(i.id)).length
        const complete = r.items.length > 0 && done === r.items.length
        return (
          <div key={r.id} className={`routine ${complete ? 'complete' : ''}`}>
            <div className="side-header">
              <h2>
                {r.icon} {r.name}
              </h2>
              <span className="muted small">
                {complete ? '✨ Done!' : `${done}/${r.items.length}`}
                {!compact && (
                  <button className="icon-btn" onClick={() => setEditing(r)} title="Edit routine">
                    ✎
                  </button>
                )}
              </span>
            </div>
            <div className="progress">
              <span style={{ width: `${r.items.length ? (done / r.items.length) * 100 : 0}%` }} />
            </div>
            {r.items.map((item) => (
              <label key={item.id} className={`step ${checked.includes(item.id) ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked.includes(item.id)}
                  onChange={() => update((d) => toggleRoutineItem(d, today, r.id, item.id))}
                />
                {item.title}
              </label>
            ))}
          </div>
        )
      })}
      {!compact && (
        <button className="btn small" onClick={() => setEditing({ id: uid(), name: '', icon: '⭐', items: [] })}>
          + New routine
        </button>
      )}
      {editing && <RoutineModal routine={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function RoutineModal({ routine, onClose }: { routine: Routine; onClose: () => void }) {
  const { data, update } = useStore()
  const isNew = !data.routines.some((r) => r.id === routine.id)
  const [draft, setDraft] = useState(routine)
  const [item, setItem] = useState('')

  const addItem = () => {
    if (!item.trim()) return
    setDraft((d) => ({ ...d, items: [...d.items, { id: uid(), title: item.trim() }] }))
    setItem('')
  }
  const move = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      const items = [...d.items]
      const target = index + dir
      if (target < 0 || target >= items.length) return d
      ;[items[index], items[target]] = [items[target], items[index]]
      return { ...d, items }
    })

  const save = () => {
    if (!draft.name.trim()) return
    const saved = { ...draft, name: draft.name.trim() }
    update((d) => ({ ...d, routines: isNew ? [...d.routines, saved] : d.routines.map((r) => (r.id === saved.id ? saved : r)) }))
    onClose()
  }

  return (
    <Modal title={isNew ? 'New routine' : 'Edit routine'} onClose={onClose}>
      <div className="form">
        <div className="row">
          <input className="emoji-input" value={draft.icon} maxLength={4} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
          <input
            autoFocus
            placeholder="e.g. Leaving the house"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={{ flex: 1 }}
          />
        </div>
        <div className="steps-editor">
          {draft.items.map((it, i) => (
            <div key={it.id} className="step">
              <span style={{ flex: 1 }}>{it.title}</span>
              <button type="button" className="icon-btn" onClick={() => move(i, -1)} title="Move up">
                ↑
              </button>
              <button type="button" className="icon-btn" onClick={() => move(i, 1)} title="Move down">
                ↓
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id) }))}
              >
                ✕
              </button>
            </div>
          ))}
          <input
            className="small-input"
            placeholder="+ Add a step (Enter)"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
            }}
          />
        </div>
        <div className="modal-actions">
          {!isNew && (
            <button
              className="btn danger"
              onClick={() => {
                update((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== routine.id) }))
                onClose()
              }}
            >
              Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={!draft.name.trim()}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
