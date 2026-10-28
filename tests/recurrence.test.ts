import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addInterval, billOccurrences, choreDue, dueStatus, occurrencesBetween, overdueBills } from '../src/renderer/src/lib/recurrence.ts'
import type { Bill, Chore } from '../src/renderer/src/lib/types.ts'

const monthly = { every: 1, unit: 'month' } as const

test('addInterval handles days, weeks, months and years', () => {
  assert.equal(addInterval('2026-12-30', { every: 3, unit: 'day' }), '2027-01-02')
  assert.equal(addInterval('2026-10-28', { every: 2, unit: 'week' }), '2026-11-11')
  assert.equal(addInterval('2026-11-15', monthly, 2), '2027-01-15')
  assert.equal(addInterval('2028-02-29', { every: 1, unit: 'year' }), '2029-02-28')
  assert.equal(addInterval('2026-11-01', { every: -1, unit: 'day' }), '2026-10-31')
})

test('monthly dates clamp to month end without drifting', () => {
  assert.deepEqual(occurrencesBetween('2026-01-31', monthly, '2026-01-01', '2026-04-30'), [
    '2026-01-31',
    '2026-02-28',
    '2026-03-31',
    '2026-04-30'
  ])
})

test('one-time items occur once', () => {
  assert.deepEqual(occurrencesBetween('2026-05-01', null, '2026-01-01', '2026-12-31'), ['2026-05-01'])
  assert.deepEqual(occurrencesBetween('2027-05-01', null, '2026-01-01', '2026-12-31'), [])
})

test('chore due date follows the last time it was done', () => {
  const chore: Chore = {
    id: 'c', title: 'Laundry', icon: '🧺', area: 'Home', frequency: { every: 1, unit: 'week' },
    startDate: '2026-10-01', history: [], minutes: 30, energy: 'medium'
  }
  assert.equal(choreDue(chore), '2026-10-01')
  assert.equal(choreDue({ ...chore, lastDone: '2026-10-27' }), '2026-11-03')
  assert.equal(dueStatus('2026-10-01', '2026-10-28'), 'overdue')
  assert.equal(dueStatus('2026-10-28', '2026-10-28'), 'today')
  assert.equal(dueStatus('2026-11-03', '2026-10-28'), 'soon')
  assert.equal(dueStatus('2026-12-03', '2026-10-28'), 'later')
})

test('bills: occurrences, paid state and overdue', () => {
  const rent: Bill = { id: 'r', name: 'Rent', amount: 1200, category: 'Housing', anchor: '2026-09-01', frequency: monthly, autopay: false, paid: { '2026-09-01': 'x' } }
  const phone: Bill = { ...rent, id: 'p', name: 'Phone', anchor: '2026-09-15', autopay: true, paid: {} }
  const occ = billOccurrences([rent, phone], '2026-10-01', '2026-10-31')
  assert.deepEqual(occ.map((o) => `${o.bill.name}@${o.due}`), ['Rent@2026-10-01', 'Phone@2026-10-15'])
  // Autopay bills are never "overdue"; the paid September rent isn't either.
  assert.deepEqual(overdueBills([rent, phone], '2026-10-28').map((o) => o.due), ['2026-10-01'])
})
