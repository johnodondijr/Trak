import type { Transaction } from "./parser/types";

export interface WalletLine {
  id: string;
  label: string;
  count: number;
}

export function isMpesaLinkedTransaction(txn: Transaction): boolean {
  if (txn.provider !== "bank") return true;
  return /\bM-?PESA\b/i.test(txn.raw);
}

export function isBankOnlyTransaction(txn: Transaction): boolean {
  return txn.provider === "bank" && !isMpesaLinkedTransaction(txn);
}

export function walletTransactions(txns: Transaction[]): Transaction[] {
  return txns.filter(isMpesaLinkedTransaction);
}

export function walletLineOptions(txns: Transaction[]): WalletLine[] {
  const counts = new Map<string, number>();
  for (const txn of walletTransactions(txns)) {
    const id = txn.lineId;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => numericLinePart(a[0]) - numericLinePart(b[0]))
    .map(([id, count], index) => ({ id, count, label: `Line ${index + 1}` }));
}

export function transactionsForLine(txns: Transaction[], lineId: string | "all"): Transaction[] {
  const wallet = walletTransactions(txns);
  if (lineId === "all") return wallet;
  return wallet.filter((txn) => txn.lineId === lineId);
}

export function bankOnlyTransactions(txns: Transaction[]): Transaction[] {
  return txns.filter(isBankOnlyTransaction);
}

function numericLinePart(id: string): number {
  const m = id.match(/\d+/);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
}
