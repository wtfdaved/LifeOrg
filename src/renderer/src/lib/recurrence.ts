import type { Bill, Chore, Frequency } from './types.ts'

const pad = (n: number): string => String(n).padStart(2, '0')

function parts(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number)
  return [y, m, d]
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate() // month is 1-based here
}

/**
 * Add `times` intervals to a YYYY-MM-DD date. Month and year steps keep the original
 * day of month, clamped to the month's length (Jan 31 + 1 month = Feb 28/29).
 */
export function addInterval(key: string, freq: Frequency, times = 1): string {
  const [y, m, d] = parts(key)
  const n = freq.every * times
  if (freq.unit === 'day' || freq.unit === 'week') {
    const date = new Date(y, m - 1, d + n * (freq.unit === 'week' ? 7 : 1))
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  const months = (m - 1) + n * (freq.unit === 'year' ? 12 : 1)
  const year = y + Math.floor(months / 12)
  const month = (months % 12) + 1
  return `${year}-${pad(month)}-${pad(Math.min(d, daysInMonth(year, month)))}`
}

/** Due dates of a repeating (or one-time, when freq is null) item that fall in [from, to]. */
export function occurrencesBetween(anchor: string, freq: Frequency | null, from: string, to: string): string[] {
  if (!freq) return anchor >= from && anchor <= to ? [anchor] : []
  const out: string[] = []
  // Step from the anchor each time (not from the previous date) so month-end clamping doesn't drift.
  for (let i = 0; ; i++) {
    const date = addInterval(anchor, freq, i)
    if (date > to) break
    if (date >= from) out.push(date)
    if (i > 5000) break
  }
  return out
}

export function choreDue(chore: Chore): string {
  return chore.lastDone ? addInterval(chore.lastDone, chore.frequency) : chore.startDate
}

export type DueStatus = 'overdue' | 'today' | 'soon' | 'later'

export function dueStatus(due: string, today: string, soonDays = 7): DueStatus {
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return due <= addInterval(today, { every: soonDays, unit: 'day' }) ? 'soon' : 'later'
}

export interface BillOccurrence {
  bill: Bill
  due: string
  paid: boolean
}

/** Every due date of every active bill in [from, to], soonest first. */
export function billOccurrences(bills: Bill[], from: string, to: string): BillOccurrence[] {
  return bills
    .filter((b) => !b.archived)
    .flatMap((bill) =>
      occurrencesBetween(bill.anchor, bill.frequency, from, to).map((due) => ({ bill, due, paid: !!bill.paid[due] }))
    )
    .sort((a, b) => a.due.localeCompare(b.due) || a.bill.name.localeCompare(b.bill.name))
}

/** Unpaid, non-autopay bill due dates before today. */
export function overdueBills(bills: Bill[], today: string): BillOccurrence[] {
  const yesterday = addInterval(today, { every: -1, unit: 'day' })
  return billOccurrences(bills, '0000-01-01', yesterday).filter((o) => !o.paid && !o.bill.autopay)
}

export function describeFrequency(freq: Frequency | null): string {
  if (!freq) return 'One time'
  const names = { day: 'day', week: 'week', month: 'month', year: 'year' }
  if (freq.every === 1) return { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' }[freq.unit]
  if (freq.every === 2 && freq.unit === 'week') return 'Every 2 weeks'
  return `Every ${freq.every} ${names[freq.unit]}s`
}

export const FREQUENCY_PRESETS: { label: string; value: Frequency | null }[] = [
  { label: 'Daily', value: { every: 1, unit: 'day' } },
  { label: 'Every 2 days', value: { every: 2, unit: 'day' } },
  { label: 'Every 3 days', value: { every: 3, unit: 'day' } },
  { label: 'Weekly', value: { every: 1, unit: 'week' } },
  { label: 'Every 2 weeks', value: { every: 2, unit: 'week' } },
  { label: 'Monthly', value: { every: 1, unit: 'month' } },
  { label: 'Every 3 months', value: { every: 3, unit: 'month' } },
  { label: 'Every 6 months', value: { every: 6, unit: 'month' } },
  { label: 'Yearly', value: { every: 1, unit: 'year' } }
]

export const freqKey = (f: Frequency | null): string => (f ? `${f.every}:${f.unit}` : 'once')
export const parseFreqKey = (key: string): Frequency | null => {
  if (key === 'once') return null
  const [every, unit] = key.split(':')
  return { every: Number(every), unit: unit as Frequency['unit'] }
}
