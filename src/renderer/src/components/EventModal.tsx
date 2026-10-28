import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { uid, useStore } from '../lib/store'
import type { CalendarEvent } from '../lib/types'

export const EVENT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b']

export function newEvent(partial: Partial<CalendarEvent> = {}): CalendarEvent {
  return { id: uid(), title: '', start: '', allDay: false, color: EVENT_COLORS[0], ...partial }
}

export function EventModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const { data, update } = useStore()
  const isNew = !data.events.some((e) => e.id === event.id)
  const [draft, setDraft] = useState(event)
  const set = <K extends keyof CalendarEvent>(key: K, value: CalendarEvent[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const inputType = draft.allDay ? 'date' : 'datetime-local'
  const toggleAllDay = (allDay: boolean) =>
    setDraft((d) => ({
      ...d,
      allDay,
      start: allDay ? d.start.slice(0, 10) : `${d.start.slice(0, 10)}T09:00`,
      end: d.end ? (allDay ? d.end.slice(0, 10) : `${d.end.slice(0, 10)}T10:00`) : undefined
    }))

  const endBeforeStart = !!draft.end && draft.end < draft.start

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim() || !draft.start || endBeforeStart) return
    const saved = { ...draft, title: draft.title.trim() }
    update((d) => ({
      ...d,
      events: isNew ? [...d.events, saved] : d.events.map((ev) => (ev.id === saved.id ? saved : ev))
    }))
    onClose()
  }

  return (
    <Modal title={isNew ? 'New event' : 'Edit event'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <input autoFocus placeholder="Event title" value={draft.title} onChange={(e) => set('title', e.target.value)} />
        <label className="checkbox">
          <input type="checkbox" checked={draft.allDay} onChange={(e) => toggleAllDay(e.target.checked)} />
          All day
        </label>
        <div className="row">
          <label>
            Starts
            <input type={inputType} value={draft.start} onChange={(e) => set('start', e.target.value)} />
          </label>
          <label>
            Ends
            <input type={inputType} value={draft.end ?? ''} onChange={(e) => set('end', e.target.value || undefined)} />
          </label>
        </div>
        {endBeforeStart && <p className="error">The end must be after the start.</p>}
        <div className="color-row">
          {EVENT_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${draft.color === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => set('color', c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <textarea placeholder="Notes" rows={3} value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        <div className="modal-actions">
          {!isNew && (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                update((d) => ({ ...d, events: d.events.filter((ev) => ev.id !== event.id) }))
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
          <button type="submit" className="btn primary" disabled={!draft.title.trim() || !draft.start || endBeforeStart}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
