import type { AppData } from './types'

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return amount.toFixed(2)
  }
}

export function toggleBillPaid(data: AppData, billId: string, due: string): AppData {
  return {
    ...data,
    bills: data.bills.map((b) => {
      if (b.id !== billId) return b
      const { [due]: wasPaid, ...rest } = b.paid
      return { ...b, paid: wasPaid ? rest : { ...b.paid, [due]: new Date().toISOString() } }
    })
  }
}
