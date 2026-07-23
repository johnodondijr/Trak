import type { Transaction } from "./parser/types";

function isOfficialMpesa(t: Transaction): boolean {
  return t.provider === "mpesa" && /^[A-Z0-9]{8,12}\s+(Confirmed|Failed)\b/i.test(t.raw.trim());
}

function preference(t: Transaction): number {
  if (isOfficialMpesa(t) && t.balance !== null) return 4;
  if (isOfficialMpesa(t)) return 3;
  if (t.provider === "mpesa") return 2;
  return 1;
}

function keyOf(t: Transaction): string {
  return t.ref ? `ref:${t.ref}` : `raw:${t.raw}|${t.date.getTime()}`;
}

function pickPreferred(existing: Transaction, incoming: Transaction): Transaction {
  return preference(incoming) > preference(existing) ? incoming : existing;
}

export function dedupeTransactions(transactions: Transaction[]): Transaction[] {
  const byKey = new Map<string, Transaction>();
  for (const t of transactions) {
    const key = keyOf(t);
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickPreferred(existing, t) : t);
  }
  return [...byKey.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function mergeTransactionSets(existing: Transaction[], incoming: Transaction[]): Transaction[] {
  return dedupeTransactions([...existing, ...incoming]);
}
