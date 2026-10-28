import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import type { EventClickArg, EventContentArg, EventDropArg, EventInput, DateSelectArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { useStore } from '../lib/store'
import { addDays, isDateOnly, parseLocal, toDateKey, toLocalDateTime } from '../lib/dates'
import { PRIORITY_COLORS, sortTasks, toggleTask } from '../lib/tasks'
import { EventModal, newEvent } from '../components/EventModal'
import { TaskModal, newTask } from '../components/TaskModal'
import { TaskRow } from '../components/TaskRow'
import { Modal } from '../components/Modal'
import type { CalendarEvent, Task } from '../lib/types'

const TASK_PREFIX = 'task:'

type Editing = { kind: 'event'; item: CalendarEvent } | { kind: 'task'; item: Task } | null

// Our model stores an all-day end date inclusively (what people type); FullCalendar's is exclusive.
const toFcEnd = (ev: CalendarEvent) =>
  ev.end && ev.allDay ? toDateKey(addDays(parseLocal(ev.end), 1)) : ev.end
const fromFcEnd = (end: Date | null, allDay: boolean) =>
  end ? (allDay ? toDateKey(addDays(end, -1)) : toLocalDateTime(end)) : undefined
const fromFcStart = (start: Date, allDay: boolean) => (allDay ? toDateKey(start) : toLocalDateTime(start))

export function CalendarView() {
  const { data, update } = useStore()
  const [editing, setEditing] = useState<Editing>(null)
  const [choosing, setChoosing] = useState<{ start: string; end?: string; allDay: boolean } | null>(null)
  const unscheduledRef = useRef<HTMLDivElement>(null)

  const unscheduled = useMemo(() => sortTasks(data.tasks.filter((t) => !t.done && !t.due)), [data.tasks])

  const fcEvents = useMemo<EventInput[]>(() => {
    const events: EventInput[] = data.events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      start: ev.start,
      end: toFcEnd(ev),
      allDay: ev.allDay,
      backgroundColor: ev.color,
      borderColor: ev.color
    }))
    const tasks: EventInput[] = data.tasks
      .filter((t) => t.due)
      .map((t) => {
        const allDay = isDateOnly(t.due!)
        const end = allDay ? undefined : toLocalDateTime(new Date(parseLocal(t.due!).getTime() + t.durationMins * 60_000))
        return {
          id: TASK_PREFIX + t.id,
          title: t.title,
          start: t.due,
          end,
          allDay,
          classNames: ['fc-task', t.done ? 'fc-task-done' : ''],
          backgroundColor: 'transparent',
          borderColor: PRIORITY_COLORS[t.priority],
          extendedProps: { task: t }
        }
      })
    return [...events, ...tasks]
  }, [data.events, data.tasks])

  // Let unscheduled to-dos be dragged from the side panel onto the calendar.
  useEffect(() => {
    if (!unscheduledRef.current) return
    const draggable = new Draggable(unscheduledRef.current, {
      itemSelector: '.draggable-task',
      eventData: (el) => ({
        title: el.dataset.title,
        duration: { minutes: Number(el.dataset.duration) || 30 },
        create: false
      })
    })
    return () => draggable.destroy()
  }, [])

  const onEventChange = (info: EventDropArg | EventResizeDoneArg) => {
    const { event } = info
    if (!event.start) return
    const start = fromFcStart(event.start, event.allDay)
    if (event.id.startsWith(TASK_PREFIX)) {
      const id = event.id.slice(TASK_PREFIX.length)
      const durationMins =
        !event.allDay && event.end ? Math.round((event.end.getTime() - event.start.getTime()) / 60_000) : undefined
      update((d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === id ? { ...t, due: start, durationMins: durationMins ?? t.durationMins } : t))
      }))
    } else {
      const end = fromFcEnd(event.end, event.allDay)
      update((d) => ({
        ...d,
        events: d.events.map((ev) => (ev.id === event.id ? { ...ev, start, end, allDay: event.allDay } : ev))
      }))
    }
  }

  const onEventClick = (info: EventClickArg) => {
    if (info.event.id.startsWith(TASK_PREFIX)) {
      setEditing({ kind: 'task', item: info.event.extendedProps.task as Task })
    } else {
      const ev = data.events.find((e) => e.id === info.event.id)
      if (ev) setEditing({ kind: 'event', item: ev })
    }
  }

  const onSelect = (info: DateSelectArg) => {
    info.view.calendar.unselect()
    setChoosing({
      start: fromFcStart(info.start, info.allDay),
      end: info.allDay ? fromFcEnd(info.end, true) : toLocalDateTime(info.end),
      allDay: info.allDay
    })
  }

  const renderEvent = (arg: EventContentArg) => {
    const task = arg.event.extendedProps.task as Task | undefined
    if (!task) return true // default rendering for regular events
    return (
      <div className="fc-task-content">
        <input
          type="checkbox"
          checked={task.done}
          onClick={(e) => e.stopPropagation()}
          onChange={() => update((d) => toggleTask(d, task.id))}
          aria-label={`Mark "${task.title}" done`}
        />
        <span>
          {arg.timeText && <b>{arg.timeText} </b>}
          {task.title}
        </span>
      </div>
    )
  }

  return (
    <div className="calendar-layout">
      <div className="calendar-main">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          buttonText={{ month: 'Month', week: 'Week', day: 'Day', list: 'Agenda', today: 'Today' }}
          height="100%"
          firstDay={data.settings.weekStartsOn}
          nowIndicator
          editable
          selectable
          selectMirror
          droppable
          dayMaxEvents={4}
          scrollTime="07:00:00"
          events={fcEvents}
          eventContent={renderEvent}
          eventClick={onEventClick}
          eventDrop={onEventChange}
          eventResize={onEventChange}
          select={onSelect}
          drop={(info) => {
            const id = info.draggedEl.dataset.taskId
            const due = fromFcStart(info.date, info.allDay)
            update((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, due } : t)) }))
          }}
        />
      </div>
      <aside className="calendar-side">
        <div className="side-header">
          <h3>Unscheduled to-dos</h3>
          <button className="btn small" onClick={() => setEditing({ kind: 'task', item: newTask() })}>
            + To-do
          </button>
        </div>
        <p className="muted small">Drag a to-do onto a day or time slot to schedule it.</p>
        <div ref={unscheduledRef} className="task-list">
          {unscheduled.map((t) => (
            <TaskRow key={t.id} task={t} draggable onEdit={(task) => setEditing({ kind: 'task', item: task })} />
          ))}
          {unscheduled.length === 0 && <p className="muted small">Everything is scheduled. 🎉</p>}
        </div>
      </aside>

      {choosing && (
        <Modal title="Add to calendar" onClose={() => setChoosing(null)}>
          <div className="choice-buttons">
            <button
              className="btn primary"
              onClick={() => {
                setEditing({ kind: 'event', item: newEvent(choosing) })
                setChoosing(null)
              }}
            >
              📅 Event
            </button>
            <button
              className="btn"
              onClick={() => {
                const durationMins =
                  !choosing.allDay && choosing.end
                    ? Math.round((parseLocal(choosing.end).getTime() - parseLocal(choosing.start).getTime()) / 60_000)
                    : 30
                setEditing({ kind: 'task', item: newTask({ due: choosing.start, durationMins }) })
                setChoosing(null)
              }}
            >
              ✅ To-do
            </button>
          </div>
        </Modal>
      )}
      {editing?.kind === 'event' && <EventModal event={editing.item} onClose={() => setEditing(null)} />}
      {editing?.kind === 'task' && <TaskModal task={editing.item} onClose={() => setEditing(null)} />}
    </div>
  )
}
