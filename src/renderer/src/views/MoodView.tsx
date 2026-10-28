import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { addDays, parseLocal, toDateKey, todayKey } from '../lib/dates'
import { averageMood, ENERGY_LABELS, MOODS, moodMeta, SUGGESTED_TAGS } from '../lib/mood'
import type { MoodEntry } from '../lib/types'

export function MoodView() {
  const { data, update } = useStore()
  const [date, setDate] = useState(todayKey())
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [tagInput, setTagInput] = useState('')

  const entry = data.moods[date]

  const save = (patch: Partial<MoodEntry>) =>
    update((d) => {
      const prev = d.moods[date] ?? { date, mood: 3, energy: 3, tags: [], note: '' }
      return { ...d, moods: { ...d.moods, [date]: { ...prev, ...patch } } }
    })

  const toggleTag = (tag: string) => {
    const tags = entry?.tags ?? []
    save({ tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag] })
  }

  const clear = () =>
    update((d) => {
      const { [date]: _removed, ...rest } = d.moods
      return { ...d, moods: rest }
    })

  // Month grid starting on the configured first day of week.
  const cells = useMemo(() => {
    const offset = (month.getDay() - data.settings.weekStartsOn + 7) % 7
    const start = addDays(month, -offset)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [month, data.settings.weekStartsOn])

  const stats = useMemo(() => {
    const today = new Date()
    const last7 = averageMood(data.moods, toDateKey(addDays(today, -6)), toDateKey(today))
    const last30 = averageMood(data.moods, toDateKey(addDays(today, -29)), toDateKey(today))
    const tagMood: Record<string, { sum: number; n: number }> = {}
    for (const m of Object.values(data.moods)) {
      for (const t of m.tags) {
        tagMood[t] ??= { sum: 0, n: 0 }
        tagMood[t].sum += m.mood
        tagMood[t].n++
      }
    }
    const tags = Object.entries(tagMood)
      .filter(([, v]) => v.n >= 2)
      .map(([tag, v]) => ({ tag, avg: v.sum / v.n, n: v.n }))
      .sort((a, b) => b.avg - a.avg)
    let streak = 0
    for (let d = new Date(); data.moods[toDateKey(d)]; d = addDays(d, -1)) streak++
    return { last7, last30, tags, streak }
  }, [data.moods])

  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 7 + i + data.settings.weekStartsOn).toLocaleDateString(undefined, { weekday: 'short' })
  )

  const allTags = Array.from(new Set([...SUGGESTED_TAGS, ...Object.values(data.moods).flatMap((m) => m.tags)]))

  return (
    <div className="mood-layout">
      <section className="card mood-entry">
        <header className="view-header">
          <h1>
            {date === todayKey()
              ? 'How are you today?'
              : parseLocal(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h1>
          <input type="date" value={date} max={todayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </header>

        <div className="mood-picker">
          {MOODS.map((m) => (
            <button
              key={m.value}
              className={`mood-btn ${entry?.mood === m.value ? 'selected' : ''}`}
              style={{ ['--mood-color' as string]: m.color }}
              onClick={() => save({ mood: m.value })}
            >
              <span className="mood-emoji">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        <label className="energy">
          Energy: <b>{ENERGY_LABELS[(entry?.energy ?? 3) - 1]}</b>
          <input
            type="range"
            min={1}
            max={5}
            value={entry?.energy ?? 3}
            onChange={(e) => save({ energy: Number(e.target.value) as MoodEntry['energy'] })}
          />
        </label>

        <div className="tags">
          {allTags.map((t) => (
            <button key={t} className={`chip ${entry?.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t)}>
              {t}
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const t = tagInput.trim().toLowerCase()
              if (t && !entry?.tags.includes(t)) toggleTag(t)
              setTagInput('')
            }}
          >
            <input className="small-input" placeholder="+ tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
          </form>
        </div>

        <textarea
          className="journal"
          rows={6}
          placeholder="Journal — what's on your mind?"
          value={entry?.note ?? ''}
          onChange={(e) => save({ note: e.target.value })}
        />
        {entry && (
          <button className="btn ghost small" onClick={clear}>
            Clear this day
          </button>
        )}
      </section>

      <section className="card">
        <header className="view-header">
          <button className="btn ghost small" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            ‹
          </button>
          <h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <button className="btn ghost small" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            ›
          </button>
        </header>
        <div className="mood-grid">
          {weekdayLabels.map((w) => (
            <div key={w} className="mood-grid-head">
              {w}
            </div>
          ))}
          {cells.map((d) => {
            const key = toDateKey(d)
            const m = data.moods[key]
            const inMonth = d.getMonth() === month.getMonth()
            return (
              <button
                key={key}
                className={`mood-cell ${inMonth ? '' : 'outside'} ${key === date ? 'current' : ''}`}
                style={m ? { background: moodMeta(m.mood).color } : undefined}
                title={m ? `${moodMeta(m.mood).label}${m.note ? ` — ${m.note.slice(0, 80)}` : ''}` : undefined}
                disabled={key > todayKey()}
                onClick={() => setDate(key)}
              >
                {d.getDate()}
                {m && <span className="mood-cell-emoji">{moodMeta(m.mood).emoji}</span>}
              </button>
            )
          })}
        </div>

        <div className="stats">
          <Stat label="7-day average" value={stats.last7} />
          <Stat label="30-day average" value={stats.last30} />
          <div className="stat">
            <span className="stat-value">{stats.streak}</span>
            <span className="muted small">day streak</span>
          </div>
        </div>
        {stats.tags.length > 0 && (
          <>
            <h3>Mood by tag</h3>
            <div className="tag-bars">
              {stats.tags.map(({ tag, avg, n }) => (
                <div key={tag} className="tag-bar">
                  <span className="tag-bar-label">{tag}</span>
                  <span className="tag-bar-track">
                    <span style={{ width: `${(avg / 5) * 100}%`, background: moodMeta(Math.round(avg)).color }} />
                  </span>
                  <span className="muted small">
                    {avg.toFixed(1)} · {n} days
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="stat">
      <span className="stat-value">{value === null ? '—' : `${moodMeta(Math.round(value)).emoji} ${value.toFixed(1)}`}</span>
      <span className="muted small">{label}</span>
    </div>
  )
}
