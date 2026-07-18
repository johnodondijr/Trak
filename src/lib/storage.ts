/**
 * LocalStorage persistence for imported transactions.
 *
 * Transactions are stored as their raw SMS text plus a snapshot of the parsed
 * fields. On load we keep the stored raw text as the source of truth and could
 * re-parse if the parser improves; for now we rehydrate the stored snapshot
 * (converting the ISO date string back into a `Date`).
 */
import type { Transaction } from "./parser/types";

const STORAGE_KEY = "trak.transactions.v1";

interface StoredTransaction extends Omit<Transaction, "date"> {
  date: string;
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredTransaction[];
    return parsed
      .map((t) => ({ ...t, date: new Date(t.date) }))
      .filter((t) => !isNaN(t.date.getTime()));
  } catch {
    return [];
  }
}

export function saveTransactions(txns: Transaction[]): void {
  try {
    const serializable: StoredTransaction[] = txns.map((t) => ({
      ...t,
      date: t.date.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Storage full or unavailable — fail silently; the in-memory state still
    // works for the current session.
  }
}

export function clearTransactions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Merge freshly parsed transactions into an existing set, de-duplicating by
 * transaction ref (falling back to raw text when a ref is missing). Returns the
 * combined list sorted newest first.
 */
export function mergeTransactions(
  existing: Transaction[],
  incoming: Transaction[],
): Transaction[] {
  const byKey = new Map<string, Transaction>();
  const keyOf = (t: Transaction) => (t.ref ? `ref:${t.ref}` : `raw:${t.raw}`);
  for (const t of existing) byKey.set(keyOf(t), t);
  for (const t of incoming) byKey.set(keyOf(t), t);
  return [...byKey.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}
