import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { uid, useStore } from '../lib/store'
import { todayKey, parseLocal } from '../lib/dates'
import { FREQUENCY_PRESETS, freqKey, parseFreqKey } from '../lib/recurrence'
import type { Chore, Energy } from '../lib/types'
import { ENERGY_ICONS } from './TaskModal'

export function newChore(): Chore {
  return {
    id: uid(),
    title: '',
    icon: '🧹',
    area: 'Home',
    frequency: { every: 1, unit: 'week' },
    startDate: todayKey(),
    history: [],
    minutes: 10,
    energy: 'low'
  }
}

export function ChoreModal({ chore, onClose }: { chore: Chore; onClose: () => void }) {
  const { data, update } = useStore()
  const isNew = !data.chores.some((c) => c.id === chore.id)
  const [draft, setDraft] = useState(chore)
  const set = <K extends keyof Chore>(key: K, value: Chore[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const areas = Array.from(new Set(['Home', 'Kitchen', 'Bathroom', 'Bedroom', 'Yard', 'Car', 'Pets', ...data.chores.map((c) => c.area)]))

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    const saved = { ...draft, title: draft.title.trim() }
    update((d) => ({ ...d, chores: isNew ? [...d.chores, saved] : d.chores.map((c) => (c.id === saved.id ? saved : c)) }))
    onClose()
  }

  return (
    <Modal title={isNew ? 'New chore' : 'Edit chore'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <div className="row">
          <input className="emoji-input" value={draft.icon} maxLength={4} onChange={(e) => set('icon', e.target.value)} aria-label="Icon" />
          <input autoFocus placeholder="e.g. Empty the dishwasher" value={draft.title} onChange={(e) => set('title', e.target.value)} style={{ flex: 1 }} />
        </div>
        <div className="row">
          <label>
            Repeats
            <select value={freqKey(draft.frequency)} onChange={(e) => set('frequency', parseFreqKey(e.target.value)!)}>
              {FREQUENCY_PRESETS.map((p) => (
                <option key={p.label} value={freqKey(p.value)}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {draft.lastDone ? 'Started' : 'First due'}
            <input type="date" value={draft.startDate} onChange={(e) => e.target.value && set('startDate', e.target.value)} />
          </label>
        </div>
        <div className="row">
          <label>
            Area
            <input list="chore-areas" value={draft.area} onChange={(e) => set('area', e.target.value)} />
            <datalist id="chore-areas">
              {areas.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <label>
            Takes about
            <select value={draft.minutes} onChange={(e) => set('minutes', Number(e.target.value))}>
              {[2, 5, 10, 15, 20, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Energy needed
          <div className="segmented">
            {(['low', 'medium', 'high'] as Energy[]).map((e) => (
              <button type="button" key={e} className={draft.energy === e ? 'selected' : ''} onClick={() => set('energy', e)}>
                {ENERGY_ICONS[e]} {e}
              </button>
            ))}
          </div>
        </label>
        {!isNew && (
          <p className="muted small">
            Done {draft.history.length} time{draft.history.length === 1 ? '' : 's'}
            {draft.lastDone && `, last on ${parseLocal(draft.lastDone).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}.
          </p>
        )}
        <div className="modal-actions">
          {!isNew && (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                update((d) => ({ ...d, chores: d.chores.filter((c) => c.id !== chore.id) }))
                onClose()
              }}
            >
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!draft.title.trim()}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
