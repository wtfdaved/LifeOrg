import { useStore } from '../lib/store'
import { formatDue } from '../lib/dates'
import { isOverdue, PRIORITY_COLORS, toggleTask } from '../lib/tasks'
import type { Task } from '../lib/types'
import { useStartFocus } from './FocusTimer'
import { ENERGY_ICONS } from './TaskModal'

export function TaskRow({ task, onEdit, draggable }: { task: Task; onEdit: (t: Task) => void; draggable?: boolean }) {
  const { update } = useStore()
  const startFocus = useStartFocus()
  const steps = task.subtasks ?? []
  return (
    <div
      className={`task-row ${task.done ? 'done' : ''} ${draggable ? 'draggable-task' : ''}`}
      data-task-id={task.id}
      data-title={task.title}
      data-duration={task.durationMins}
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => update((d) => toggleTask(d, task.id))}
        style={{ accentColor: PRIORITY_COLORS[task.priority] }}
        aria-label={`Mark "${task.title}" ${task.done ? 'not done' : 'done'}`}
      />
      <button className="task-title" onClick={() => onEdit(task)}>
        {task.title}
      </button>
      <span className="task-meta">
        {steps.length > 0 && (
          <span title="Steps done">
            ☰ {steps.filter((x) => x.done).length}/{steps.length}
          </span>
        )}
        {task.energy && <span title={`${task.energy} energy`}>{ENERGY_ICONS[task.energy]}</span>}
        <span className="tag">{task.list}</span>
        {task.due && <span className={isOverdue(task) ? 'overdue' : ''}>{formatDue(task.due)}</span>}
        {!task.done && (
          <button className="icon-btn focus-btn" title="Focus on this" onClick={() => startFocus(task.id)}>
            ▶ Focus
          </button>
        )}
        <span className="priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} title={`${task.priority} priority`} />
      </span>
    </div>
  )
}
