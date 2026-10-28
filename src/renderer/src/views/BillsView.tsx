import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { parseLocal, toDateKey, todayKey } from '../lib/dates'
import { addInterval, billOccurrences, describeFrequency, overdueBills, type BillOccurrence } from '../lib/recurrence'
import { formatMoney, toggleBillPaid } from '../lib/bills'
import { BillModal, newBill } from '../components/BillModal'
import type { Bill } from '../lib/types'

export function BillsView() {
  const { data } = useStore()
  const [editing, setEditing] = useState<Bill | null>(null)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const today = todayKey()
  const money = (n: number) => formatMoney(n, data.settings.currency)

  const monthStart = toDateKey(month)
  const monthEnd = toDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0))
  const monthOcc = useMemo(() => billOccurrences(data.bills, monthStart, monthEnd), [data.bills, monthStart, monthEnd])
  const overdue = useMemo(() => overdueBills(data.bills, today), [data.bills, today])
  const upcoming = useMemo(
    () => billOccurrences(data.bills, today, addInterval(today, { every: 14, unit: 'day' })).filter((o) => !o.paid),
    [data.bills, today]
  )

  const total = monthOcc.reduce((n, o) => n + o.bill.amount, 0)
  const paid = monthOcc.filter((o) => o.paid || o.bill.autopay).reduce((n, o) => n + o.bill.amount, 0)

  const byCategory = useMemo(() => {
    const out: Record<string, number> = {}
    for (const o of monthOcc) out[o.bill.category] = (out[o.bill.category] ?? 0) + o.bill.amount
    return Object.entries(out).sort((a, b) => b[1] - a[1])
  }, [monthOcc])

  const active = data.bills.filter((b) => !b.archived).sort((a, b) => a.name.localeCompare(b.name))
  const archived = data.bills.filter((b) => b.archived)

  return (
    <div className="bills">
      <header className="view-header">
        <div>
          <h1>Bills</h1>
          <p className="muted">Never miss a due date. Mark a bill paid and it rolls forward to the next one.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing(newBill())}>
          + New bill
        </button>
      </header>

      {overdue.length > 0 && (
        <section className="card alert-card">
          <h2>⚠️ Past due</h2>
          {overdue.map((o) => (
            <BillLine key={o.bill.id + o.due} occ={o} money={money} onEdit={() => setEditing(o.bill)} />
          ))}
        </section>
      )}

      <div className="bills-grid">
        <section className="card">
          <h2>Due in the next 2 weeks</h2>
          {upcoming.map((o) => (
            <BillLine key={o.bill.id + o.due} occ={o} money={money} onEdit={() => setEditing(o.bill)} />
          ))}
          {upcoming.length === 0 && <p className="muted small">Nothing due soon. 🙌</p>}
        </section>

        <section className="card">
          <div className="view-header">
            <button className="btn ghost small" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              ‹
            </button>
            <h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <button className="btn ghost small" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              ›
            </button>
          </div>
          <div className="stats">
            <div className="stat">
              <span className="stat-value">{money(total)}</span>
              <span className="muted small">total this month</span>
            </div>
            <div className="stat">
              <span className="stat-value">{money(paid)}</span>
              <span className="muted small">paid / autopay</span>
            </div>
            <div className="stat">
              <span className="stat-value">{money(total - paid)}</span>
              <span className="muted small">still to pay</span>
            </div>
          </div>
          <div className="progress big">
            <span style={{ width: `${total ? (paid / total) * 100 : 0}%` }} />
          </div>
          {monthOcc.map((o) => (
            <BillLine key={o.bill.id + o.due} occ={o} money={money} onEdit={() => setEditing(o.bill)} />
          ))}
          {byCategory.length > 0 && (
            <>
              <h3>By category</h3>
              <div className="tag-bars">
                {byCategory.map(([cat, amt]) => (
                  <div key={cat} className="tag-bar">
                    <span className="tag-bar-label">{cat}</span>
                    <span className="tag-bar-track">
                      <span style={{ width: `${(amt / total) * 100}%`, background: 'var(--accent)' }} />
                    </span>
                    <span className="muted small">{money(amt)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card">
        <h2>All bills</h2>
        <table className="bill-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Repeats</th>
              <th>Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {active.map((b) => (
              <tr key={b.id} onClick={() => setEditing(b)}>
                <td>{b.name}</td>
                <td className="muted">{b.category}</td>
                <td className="muted">{describeFrequency(b.frequency)}</td>
                <td>{money(b.amount)}</td>
                <td>{b.autopay && <span className="tag">autopay</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {active.length === 0 && <p className="muted small">Add rent, utilities, phone, subscriptions, loans and anything else you pay.</p>}
        {archived.length > 0 && (
          <p className="muted small">
            Archived:{' '}
            {archived.map((b) => (
              <button key={b.id} className="link-btn" onClick={() => setEditing(b)}>
                {b.name}
              </button>
            ))}
          </p>
        )}
      </section>
      {editing && <BillModal bill={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

export function BillLine({ occ, money, onEdit }: { occ: BillOccurrence; money: (n: number) => string; onEdit?: () => void }) {
  const { update } = useStore()
  const today = todayKey()
  const late = !occ.paid && !occ.bill.autopay && occ.due < today
  return (
    <div className={`bill-line ${occ.paid ? 'paid' : ''}`}>
      <span className={`bill-date ${late ? 'overdue' : ''}`}>
        {parseLocal(occ.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
      <button className="task-title" onClick={onEdit}>
        {occ.bill.name}
        {occ.bill.autopay && <span className="tag">autopay</span>}
      </button>
      <span className="bill-amount">{money(occ.bill.amount)}</span>
      <button
        className={`btn small ${occ.paid ? '' : 'primary'}`}
        onClick={() => update((d) => toggleBillPaid(d, occ.bill.id, occ.due))}
      >
        {occ.paid ? '✓ Paid' : 'Mark paid'}
      </button>
    </div>
  )
}
