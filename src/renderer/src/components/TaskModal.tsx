import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { uid, useStore } from '../lib/store'
import { deleteTask, upsertTask } from '../lib/tasks'
import { isDateOnly } from '../lib/dates'
import type { Priority, Task } from '../lib/types'

export function newTask(partial: Partial<Task> = {}): Task {
  return {
    id: uid(),
    title: '',
    done: false,
    priority: 'medium',
    durationMins: 30,
    list: 'Personal',
    createdAt: new Date().toISOString(),
    ...partial
  }
}

export function TaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { data, update } = useStore()
  const isNew = !data.tasks.some((t) => t.id === task.id)
  const [draft, setDraft] = useState(task)
  const [timed, setTimed] = useState(!!task.due && !isDateOnly(task.due))

  const set = <K extends keyof Task>(key: K, value: Task[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const dueDate = draft.due?.slice(0, 10) ?? ''
  const dueTime = draft.due && !isDateOnly(draft.due) ? draft.due.slice(11, 16) : '09:00'

  const setDue = (date: string, time: string, withTime: boolean) =>
    set('due', date ? (withTime ? `${date}T${time}` : date) : undefined)

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    update((d) => upsertTask(d, { ...draft, title: draft.title.trim() }))
    onClose()
  }

  return (
    <Modal title={isNew ? 'New to-do' : 'Edit to-do'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <input autoFocus placeholder="What needs doing?" value={draft.title} onChange={(e) => set('title', e.target.value)} />
        <div className="row">
          <label>
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDue(e.target.value, dueTime, timed)} />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={timed}
              disabled={!dueDate}
              onChange={(e) => {
                setTimed(e.target.checked)
                setDue(dueDate, dueTime, e.target.checked)
              }}
            />
            Block time on calendar
          </label>
        </div>
        {timed && dueDate && (
          <div className="row">
            <label>
              Start
              <input type="time" value={dueTime} onChange={(e) => setDue(dueDate, e.target.value, true)} />
            </label>
            <label>
              Duration
              <select value={draft.durationMins} onChange={(e) => set('durationMins', Number(e.target.value))}>
                {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : `${m / 60} h`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="row">
          <label>
            Priority
            <select value={draft.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            List
            <select value={draft.list} onChange={(e) => set('list', e.target.value)}>
              {data.lists.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <textarea placeholder="Notes" rows={3} value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        <div className="modal-actions">
          {!isNew && (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                update((d) => deleteTask(d, task.id))
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
