// src/types/share.ts

/** A single recipient’s split allocation */
export interface Recipient {
  name: string
  percentage: number
  amount: number
}

/** One expense line in an expense record */
export interface ExpenseItem {
  type: string
  description: string
  quantity: number
  unitPrice: number
  vat: boolean
}

/** Share record status */
export type Progress = 'in-progress' | 'completed'

/** Fields common to both income and expense entries */
export interface BaseEntry {
  /** Firestore document ID */
  id: string
  /** 'income' for payments, 'expense' for expense records */
  type: 'income' | 'expense'
  clientName: string
  clientId: string
  claimRef: string
  /** ISO date string */
  date: string
  progress: Progress
  createdBy: string
  /** ISO timestamp string */
  updatedAt: string
}

/** Flattened income (payment) entry */
export interface IncomeEntry extends BaseEntry {
  type: 'income'
  reasons: string[]               // e.g. ['VD','H','S']
  vdProfit: number
  actualPaid: number
  legalFeePct: number
  legalFeeCost: number
  storageCost?: number
  recoveryCost?: number
  piCost?: number
  /** Computed total of this payment */
  amount: number
}

/** Flattened expense entry */
export interface ExpenseEntry extends BaseEntry {
  type: 'expense'
  items: ExpenseItem[]            // list of expense lines
  /** Computed total cost of all items **/
  totalCost: number
}

/** Either an income or an expense record, as shown in your table */
export type ShareEntry = IncomeEntry | ExpenseEntry

/** A single split event (by date‐range or by record) */
export interface SplitRecord {
  id: string
  type: 'date' | 'record'
  /** If type==='record', the income record being split */
  recordId?: string
  /** If type==='date', the range of dates */
  startDate?: string
  endDate?: string
  recipients: Recipient[]
  totalSplitAmount: number
  /** ISO timestamp string */
  createdAt: string
  createdBy: string
}
