import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { addDays, dateKeyOf, toDateKey, todayKey } from '../lib/dates'
import { addInterval, billOccurrences, choreDue, overdueBills } from '../lib/recurrence'
import { formatMoney } from '../lib/bills'
import { choreDoneOn } from '../lib/chores'
import { ENERGY_LABELS, MOODS } from '../lib/mood'
import { isOverdue, sortTasks, upsertTask } from '../lib/tasks'
import { newTask } from '../components/TaskModal'
import { BillLine } from './BillsView'
import { ChoreCard } from './ChoresView'
import type { MoodEntry, Task, View } from '../lib/types'

const STEPS = ['Feelings', 'Brain dump', 'Review', 'Top 3'] as const
const MAX_TOP = 3

export function CheckInView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { data, update } = useStore()
  const today = todayKey()
  const [step, setStep] = useState(0)
  const [dump, setDump] = useState('')
  const [dumped, setDumped] = useState(0)
  const plan = data.daily[today] ?? { top3: [] }
  const mood = data.moods[today]
  const money = (n: number) => formatMoney(n, data.settings.currency)

  const saveMood = (patch: Partial<MoodEntry>) =>
    update((d) => ({
      ...d,
      moods: { ...d.moods, [today]: { ...(d.moods[today] ?? { date: today, mood: 3, energy: 3, tags: [], note: '' }), ...patch } }
    }))

  const setPlan = (patch: Partial<typeof plan>) =>
    update((d) => ({ ...d, daily: { ...d.daily, [today]: { ...(d.daily[today] ?? { top3: [] }), ...patch } } }))

  const saveDump = () => {
    const lines = dump
      .split('\n')
      .map((l) => l.replace(/^[-*•\s]+/, '').trim())
      .filter(Boolean)
    if (!lines.length) return
    update((d) => lines.reduce((acc, title) => upsertTask(acc, newTask({ title, list: acc.lists[0] })), d))
    setDumped((n) => n + lines.length)
    setDump('')
  }

  const overdueTasks = useMemo(() => sortTasks(data.tasks.filter((t) => isOverdue(t, today))), [data.tasks, today])
  const dueChores = useMemo(
    () =>
      data.chores
        .map((chore) => ({ chore, due: choreDue(chore) }))
        .filter(({ chore, due }) => due <= today && !choreDoneOn(chore, today))
        .sort((a, b) => a.due.localeCompare(b.due)),
    [data.chores, today]
  )
  const bills = useMemo(
    () => [
      ...overdueBills(data.bills, today),
      ...billOccurrences(data.bills, today, addInterval(today, { every: 7, unit: 'day' })).filter((o) => !o.paid)
    ],
    [data.bills, today]
  )

  const moveTask = (t: Task, due: string | undefined) =>
    update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, due } : x)) }))

  const candidates = useMemo(
    () => sortTasks(data.tasks.filter((t) => !t.done && (!t.due || dateKeyOf(t.due) <= today))),
    [data.tasks, today]
  )

  const toggleTop = (t: Task) => {
    const has = plan.top3.includes(t.id)
    if (!has && plan.top3.length >= MAX_TOP) return
    setPlan({ top3: has ? plan.top3.filter((id) => id !== t.id) : [...plan.top3, t.id] })
    // Picking a to-do for today schedules it for today if it wasn't already.
    if (!has && !t.due) moveTask(t, today)
  }

  const finish = () => {
    setPlan({ checkedInAt: new Date().toISOString() })
    onNavigate('today')
  }

  const tomorrow = toDateKey(addDays(new Date(), 1))

  return (
    <div className="checkin">
      <div className="stepper">
        {STEPS.map((s, i) => (
          <button key={s} className={`stepper-item ${i === step ? 'active' : ''} ${i < step ? 'past' : ''}`} onClick={() => setStep(i)}>
            <span className="stepper-num">{i < step ? '✓' : i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      <section className="card checkin-card">
        {step === 0 && (
          <>
            <h1>Good morning ☀️</h1>
            <p className="muted">How are you feeling as the day starts?</p>
            <div className="mood-picker">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  className={`mood-btn ${mood?.mood === m.value ? 'selected' : ''}`}
                  style={{ ['--mood-color' as string]: m.color }}
                  onClick={() => saveMood({ mood: m.value })}
                >
                  <span className="mood-emoji">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
            <label className="energy">
              Energy: <b>{ENERGY_LABELS[(mood?.energy ?? 3) - 1]}</b>
              <input
                type="range"
                min={1}
                max={5}
                value={mood?.energy ?? 3}
                onChange={(e) => saveMood({ energy: Number(e.target.value) as MoodEntry['energy'] })}
              />
            </label>
            <label className="field">
              One thing that would make today a good day
              <input value={plan.intention ?? ''} placeholder="e.g. Finally call the insurance company" onChange={(e) => setPlan({ intention: e.target.value })} />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Brain dump 🧠</h1>
            <p className="muted">
              Get everything out of your head. One thing per line, without sorting or judging. Each line becomes a to-do you can sort later.
            </p>
            <textarea
              autoFocus
              className="journal"
              rows={8}
              placeholder={'Buy dog food\nEmail landlord about the sink\nBirthday gift for Sam'}
              value={dump}
              onChange={(e) => setDump(e.target.value)}
            />
            <div className="row">
              <button className="btn" onClick={saveDump} disabled={!dump.trim()}>
                Add to my to-dos
              </button>
              {dumped > 0 && <span className="success">✓ {dumped} added. Your head is a little lighter.</span>}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Quick review 👀</h1>
            <p className="muted">Here's what needs a decision. Handle it now or move it. Either is fine.</p>

            <h3>Overdue to-dos ({overdueTasks.length})</h3>
            {overdueTasks.length > 1 && (
              <button className="btn small" onClick={() => update((d) => ({ ...d, tasks: d.tasks.map((t) => (isOverdue(t, today) ? { ...t, due: today } : t)) }))}>
                Move all to today
              </button>
            )}
            {overdueTasks.map((t) => (
              <div key={t.id} className="review-row">
                <span className="task-title">{t.title}</span>
                <button className="btn small" onClick={() => moveTask(t, today)}>Today</button>
                <button className="btn small" onClick={() => moveTask(t, tomorrow)}>Tomorrow</button>
                <button className="btn small" onClick={() => moveTask(t, undefined)}>Someday</button>
                <button className="btn small" onClick={() => update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) }))}>
                  Drop it
                </button>
              </div>
            ))}
            {overdueTasks.length === 0 && <p className="muted small">Nothing overdue. 🙌</p>}

            <h3>Bills due this week ({bills.length})</h3>
            {bills.map((o) => (
              <BillLine key={o.bill.id + o.due} occ={o} money={money} />
            ))}
            {bills.length === 0 && <p className="muted small">No bills due in the next 7 days.</p>}

            <h3>Chores due ({dueChores.length})</h3>
            <div className="chore-grid">
              {dueChores.slice(0, 6).map(({ chore, due }) => (
                <ChoreCard key={chore.id} chore={chore} due={due} />
              ))}
            </div>
            {dueChores.length === 0 && <p className="muted small">No chores due today.</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h1>Pick your top 3 🎯</h1>
            <p className="muted">
              If you only got these done, today would still be a win. Pick up to {MAX_TOP}. Smaller is better.
            </p>
            <div className="pick-list">
              {candidates.map((t) => {
                const picked = plan.top3.includes(t.id)
                return (
                  <button
                    key={t.id}
                    className={`pick ${picked ? 'selected' : ''}`}
                    disabled={!picked && plan.top3.length >= MAX_TOP}
                    onClick={() => toggleTop(t)}
                  >
                    <span className="pick-num">{picked ? plan.top3.indexOf(t.id) + 1 : ''}</span>
                    {t.title}
                    {t.due && dateKeyOf(t.due) < today && <span className="overdue small"> overdue</span>}
                  </button>
                )
              })}
              {candidates.length === 0 && <p className="muted small">No open to-dos. Go back to the brain dump to add some.</p>}
            </div>
          </>
        )}

        <div className="modal-actions checkin-actions">
          {step > 0 && (
            <button className="btn" onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
          <span className="spacer" />
          {step < STEPS.length - 1 ? (
            <button
              className="btn primary"
              onClick={() => {
                if (step === 1) saveDump()
                setStep(step + 1)
              }}
            >
              Next →
            </button>
          ) : (
            <button className="btn primary" onClick={finish}>
              Start my day 🚀
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
