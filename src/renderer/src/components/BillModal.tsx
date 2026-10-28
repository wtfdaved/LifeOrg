import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { uid, useStore } from '../lib/store'
import { todayKey } from '../lib/dates'
import { FREQUENCY_PRESETS, freqKey, parseFreqKey } from '../lib/recurrence'
import type { Bill } from '../lib/types'

export const BILL_CATEGORIES = ['Housing', 'Utilities', 'Phone & Internet', 'Insurance', 'Loans & Credit', 'Subscriptions', 'Car', 'Health', 'Other']

export function newBill(): Bill {
  return {
    id: uid(),
    name: '',
    amount: 0,
    category: 'Utilities',
    anchor: todayKey(),
    frequency: { every: 1, unit: 'month' },
    autopay: false,
    paid: {}
  }
}

export function BillModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { data, update } = useStore()
  const isNew = !data.bills.some((b) => b.id === bill.id)
  const [draft, setDraft] = useState(bill)
  const [amount, setAmount] = useState(bill.amount ? String(bill.amount) : '')
  const set = <K extends keyof Bill>(key: K, value: Bill[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const billFrequencies = [
    ...FREQUENCY_PRESETS.filter((p) => p.value && p.value.unit !== 'day'),
    { label: 'One time', value: null }
  ]

  const parsedAmount = Number(amount.replace(/[^0-9.]/g, ''))
  const valid = draft.name.trim() && amount.trim() !== '' && Number.isFinite(parsedAmount)

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const saved = { ...draft, name: draft.name.trim(), amount: Math.round(parsedAmount * 100) / 100 }
    update((d) => ({ ...d, bills: isNew ? [...d.bills, saved] : d.bills.map((b) => (b.id === saved.id ? saved : b)) }))
    onClose()
  }

  return (
    <Modal title={isNew ? 'New bill' : 'Edit bill'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <input autoFocus placeholder="e.g. Electric bill" value={draft.name} onChange={(e) => set('name', e.target.value)} />
        <div className="row">
          <label>
            Amount
            <input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            Category
            <select value={draft.category} onChange={(e) => set('category', e.target.value)}>
              {BILL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <label>
            {isNew ? 'Next due date' : 'First due date'}
            <input type="date" value={draft.anchor} onChange={(e) => e.target.value && set('anchor', e.target.value)} />
          </label>
          <label>
            Repeats
            <select value={freqKey(draft.frequency)} onChange={(e) => set('frequency', parseFreqKey(e.target.value))}>
              {billFrequencies.map((p) => (
                <option key={p.label} value={freqKey(p.value)}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={draft.autopay} onChange={(e) => set('autopay', e.target.checked)} />
          On autopay (it's a reminder only; it won't show as overdue)
        </label>
        <textarea
          placeholder="Notes (account number hint, how to pay, website…)"
          rows={2}
          value={draft.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
        />
        <div className="modal-actions">
          {!isNew && (
            <>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  if (!confirm(`Delete "${bill.name}" and its payment history?`)) return
                  update((d) => ({ ...d, bills: d.bills.filter((b) => b.id !== bill.id) }))
                  onClose()
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  update((d) => ({ ...d, bills: d.bills.map((b) => (b.id === bill.id ? { ...b, archived: !b.archived } : b)) }))
                  onClose()
                }}
              >
                {bill.archived ? 'Restore' : 'Archive'}
              </button>
            </>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!valid}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
