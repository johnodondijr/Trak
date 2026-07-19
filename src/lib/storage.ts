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
  const serialize = (trimRaw: boolean): string =>
    JSON.stringify(
      txns.map<StoredTransaction>((t) => ({
        ...t,
        // Raw SMS text is only needed for auditing/de-dup; trim it when space
        // is tight so a large import (thousands of messages) still persists.
        raw: trimRaw ? t.raw.slice(0, 160) : t.raw,
        date: t.date.toISOString(),
      })),
    );

  try {
    localStorage.setItem(STORAGE_KEY, serialize(false));
  } catch {
    try {
      // Retry with trimmed raw text before giving up.
      localStorage.setItem(STORAGE_KEY, serialize(true));
    } catch {
      // Storage full or unavailable — fail silently; the in-memory state still
      // works for the current session.
    }
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
