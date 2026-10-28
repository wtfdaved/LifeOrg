import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { toggleTask } from '../lib/tasks'

const FocusContext = createContext<(taskId: string) => void>(() => {})

export const FocusProvider = FocusContext.Provider
export const useStartFocus = () => useContext(FocusContext)

const PRESETS = [5, 15, 25, 45]

// A short chime made with Web Audio, so no sound files or network are needed.
function chime() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.25, 0.5].forEach((delay, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = [660, 880, 1100][i]
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.6)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.6)
    })
  } catch {
    // Audio is a nicety; ignore if unavailable.
  }
}

export function FocusTimer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { data, update } = useStore()
  const task = data.tasks.find((t) => t.id === taskId)
  const [total, setTotal] = useState(() => Math.min(Math.max(task?.durationMins ?? 25, 5), 45) * 60_000)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(total)
  const [finished, setFinished] = useState(false)
  const chimed = useRef(false)

  useEffect(() => {
    if (endsAt === null) return
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now())
      setRemaining(left)
      if (left === 0 && !chimed.current) {
        chimed.current = true
        setEndsAt(null)
        chime()
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [endsAt])

  if (!task) return null

  const running = endsAt !== null
  const start = () => {
    chimed.current = false
    setEndsAt(Date.now() + (remaining || total))
    if (!remaining) setRemaining(total)
  }
  const pause = () => setEndsAt(null)
  const preset = (mins: number) => {
    setEndsAt(null)
    setTotal(mins * 60_000)
    setRemaining(mins * 60_000)
  }
  const addFive = () => {
    setTotal((t) => t + 5 * 60_000)
    if (running) setEndsAt((e) => (e ?? Date.now()) + 5 * 60_000)
    else setRemaining((r) => r + 5 * 60_000)
  }
  const toggleStep = (id: string) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId ? { ...t, subtasks: t.subtasks?.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) } : t
      )
    }))
  const complete = () => {
    if (!task.done) update((d) => toggleTask(d, taskId))
    setEndsAt(null)
    setFinished(true)
  }

  const mins = Math.floor(remaining / 60_000)
  const secs = Math.floor((remaining % 60_000) / 1000)
  const R = 88
  const C = 2 * Math.PI * R
  const progress = total ? remaining / total : 0
  const nextStep = task.subtasks?.find((s) => !s.done)

  return (
    <div className="focus-overlay">
      <button className="btn ghost focus-close" onClick={onClose}>
        ✕ Exit focus
      </button>
      {finished ? (
        <div className="focus-body">
          <div className="celebrate">🎉</div>
          <h1>Nice work!</h1>
          <p className="muted">"{task.title}" is done. Take a breath, grab some water.</p>
          <button className="btn primary" onClick={onClose}>
            Back to my day
          </button>
        </div>
      ) : (
        <div className="focus-body">
          <p className="muted small">FOCUSING ON</p>
          <h1 className="focus-title">{task.title}</h1>
          {nextStep && (
            <p className="focus-next">
              Next tiny step: <b>{nextStep.title}</b>
            </p>
          )}
          <svg width="220" height="220" viewBox="0 0 220 220" className="focus-ring">
            <circle cx="110" cy="110" r={R} className="ring-track" />
            <circle
              cx="110"
              cy="110"
              r={R}
              className="ring-progress"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              transform="rotate(-90 110 110)"
            />
            <text x="110" y="122" textAnchor="middle" className="ring-text">
              {mins}:{String(secs).padStart(2, '0')}
            </text>
          </svg>
          {remaining === 0 && <p className="success">Time's up! Keep going, take a break, or mark it done.</p>}
          <div className="focus-controls">
            {running ? (
              <button className="btn" onClick={pause}>
                ⏸ Pause
              </button>
            ) : (
              <button className="btn primary" onClick={start}>
                ▶ {remaining && remaining < total ? 'Resume' : 'Start'}
              </button>
            )}
            <button className="btn" onClick={addFive}>
              +5 min
            </button>
            <button className="btn primary" onClick={complete}>
              ✓ Done!
            </button>
          </div>
          <div className="focus-presets">
            {PRESETS.map((m) => (
              <button key={m} className="chip" onClick={() => preset(m)}>
                {m} min
              </button>
            ))}
          </div>
          {!!task.subtasks?.length && (
            <div className="focus-steps">
              {task.subtasks.map((s) => (
                <label key={s.id} className={`step ${s.done ? 'done' : ''}`}>
                  <input type="checkbox" checked={s.done} onChange={() => toggleStep(s.id)} />
                  {s.title}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
