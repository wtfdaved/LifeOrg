const pad = (n: number): string => String(n).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD (not UTC, so late-evening entries land on the right day). */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local date-time as YYYY-MM-DDTHH:mm, the format <input type="datetime-local"> uses. */
export function toLocalDateTime(d: Date): string {
  return `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Parse a YYYY-MM-DD or local date-time string as a local Date. */
export function parseLocal(value: string): Date {
  return isDateOnly(value) ? new Date(`${value}T00:00`) : new Date(value)
}

export function dateKeyOf(value: string): string {
  return value.slice(0, 10)
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

export function formatDue(value: string): string {
  const d = parseLocal(value)
  const key = toDateKey(d)
  const today = todayKey()
  const tomorrow = toDateKey(addDays(new Date(), 1))
  const day =
    key === today
      ? 'Today'
      : key === tomorrow
        ? 'Tomorrow'
        : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  if (isDateOnly(value)) return day
  return `${day} ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}
