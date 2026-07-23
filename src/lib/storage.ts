/**
 * LocalStorage persistence for imported transactions.
 *
 * Transactions are stored as their raw SMS text plus a parsed snapshot. On load
 * we re-parse the raw text so parser/category improvements apply to existing
 * imports, while preserving the stored SMS receipt date.
 */
import type { Transaction } from "./parser/types";
import { parseMessage } from "./parser";
import { dedupeTransactions, mergeTransactionSets } from "./transactionDedupe";

const STORAGE_KEY = "trak.transactions.v1";

interface StoredTransaction extends Omit<Transaction, "date"> {
  date: string;
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredTransaction[];
    const rehydrated = parsed
      .map((t) => {
        const date = new Date(t.date);
        if (isNaN(date.getTime())) return null;
        const reparsed = t.raw ? parseMessage(t.raw) : null;
        return reparsed ? { ...reparsed, date } : { ...t, date };
      })
      .filter((t): t is Transaction => t !== null);
    return dedupeTransactions(rehydrated);
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
  return mergeTransactionSets(existing, incoming);
}
