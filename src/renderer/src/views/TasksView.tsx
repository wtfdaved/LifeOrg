import { useMemo, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { dateKeyOf, todayKey } from '../lib/dates'
import { isOverdue, sortTasks, upsertTask } from '../lib/tasks'
import { TaskModal, newTask } from '../components/TaskModal'
import { TaskRow } from '../components/TaskRow'
import type { Task } from '../lib/types'

type Filter = 'today' | 'upcoming' | 'unscheduled' | 'all' | 'done'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'unscheduled', label: 'Someday' },
  { id: 'all', label: 'All open' },
  { id: 'done', label: 'Completed' }
]

export function TasksView() {
  const { data, update } = useStore()
  const [filter, setFilter] = useState<Filter>('today')
  const [list, setList] = useState<string | null>(null)
  const [quick, setQuick] = useState('')
  const [editing, setEditing] = useState<Task | null>(null)
  const [newList, setNewList] = useState('')

  const today = todayKey()
  const visible = useMemo(() => {
    const matches = (t: Task): boolean => {
      if (list && t.list !== list) return false
      switch (filter) {
        case 'today':
          return !t.done && !!t.due && dateKeyOf(t.due) <= today
        case 'upcoming':
          return !t.done && !!t.due && dateKeyOf(t.due) > today
        case 'unscheduled':
          return !t.done && !t.due
        case 'all':
          return !t.done
        case 'done':
          return t.done
      }
    }
    const filtered = data.tasks.filter(matches)
    return filter === 'done'
      ? filtered.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      : sortTasks(filtered)
  }, [data.tasks, filter, list, today])

  const counts = useMemo(
    () => Object.fromEntries(data.lists.map((l) => [l, data.tasks.filter((t) => !t.done && t.list === l).length])),
    [data.lists, data.tasks]
  )

  const quickAdd = (e: FormEvent) => {
    e.preventDefault()
    const title = quick.trim()
    if (!title) return
    const due = filter === 'today' ? today : undefined
    update((d) => upsertTask(d, newTask({ title, due, list: list ?? d.lists[0] })))
    setQuick('')
  }

  const addList = (e: FormEvent) => {
    e.preventDefault()
    const name = newList.trim()
    if (!name || data.lists.includes(name)) return
    update((d) => ({ ...d, lists: [...d.lists, name] }))
    setNewList('')
  }

  const removeList = (name: string) => {
    if (data.lists.length <= 1) return
    const fallback = data.lists.find((l) => l !== name)!
    if (!confirm(`Delete the "${name}" list? Its to-dos move to "${fallback}".`)) return
    update((d) => ({
      ...d,
      lists: d.lists.filter((l) => l !== name),
      tasks: d.tasks.map((t) => (t.list === name ? { ...t, list: fallback } : t))
    }))
    if (list === name) setList(null)
  }

  const overdueCount = data.tasks.filter((t) => isOverdue(t)).length

  return (
    <div className="two-pane">
      <aside className="pane-side">
        <h3>View</h3>
        {FILTERS.map((f) => (
          <button key={f.id} className={`side-item ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
            {f.id === 'today' && overdueCount > 0 && <span className="badge overdue-badge">{overdueCount} overdue</span>}
          </button>
        ))}
        <h3>Lists</h3>
        <button className={`side-item ${list === null ? 'active' : ''}`} onClick={() => setList(null)}>
          All lists
        </button>
        {data.lists.map((l) => (
          <div key={l} className={`side-item ${list === l ? 'active' : ''}`}>
            <button className="side-item-label" onClick={() => setList(l)}>
              {l}
            </button>
            <span className="badge">{counts[l]}</span>
            <button className="icon-btn" title={`Delete ${l}`} onClick={() => removeList(l)}>
              ✕
            </button>
          </div>
        ))}
        <form onSubmit={addList}>
          <input className="small-input" placeholder="+ New list" value={newList} onChange={(e) => setNewList(e.target.value)} />
        </form>
      </aside>
      <section className="pane-main">
        <header className="view-header">
          <h1>{FILTERS.find((f) => f.id === filter)!.label}</h1>
          <button className="btn primary" onClick={() => setEditing(newTask({ list: list ?? data.lists[0] }))}>
            + New to-do
          </button>
        </header>
        {filter !== 'done' && (
          <form onSubmit={quickAdd}>
            <input
              className="quick-add"
              placeholder={filter === 'today' ? 'Add a to-do for today… (Enter)' : 'Add a to-do… (Enter)'}
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
            />
          </form>
        )}
        <div className="task-list">
          {visible.map((t) => (
            <TaskRow key={t.id} task={t} onEdit={setEditing} />
          ))}
          {visible.length === 0 && <p className="empty">Nothing here.</p>}
        </div>
      </section>
      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
