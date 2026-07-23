import type { Transaction } from "./parser/types";

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

export function bankOnlyTransactions(txns: Transaction[]): Transaction[] {
  return txns.filter(isBankOnlyTransaction);
}
