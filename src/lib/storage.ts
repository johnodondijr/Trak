/**
 * LocalStorage persistence for imported transactions.
 *
 * Transactions are stored as their raw SMS text plus a parsed snapshot. On load
 * we re-parse the raw text so parser/category improvements apply to existing
 * imports, while preserving the stored SMS receipt date.
 */
import type { Transaction } from "./parser/types";
import type { LineCount } from "./transactionScopes";
import { parseMessage } from "./parser";
import { dedupeTransactions, mergeTransactionSets } from "./transactionDedupe";

const STORAGE_KEY = "trak.transactions.v1";
const LINE_COUNT_KEY = "trak.lineCount";

/**
 * The number of M-PESA lines the user has told us they own. `"auto"` (the
 * default) lets Trak infer it from the messages. Persisted so the setting — and
 * with it the phantom-line fix and the home line switcher — survives reloads.
 */
export function loadLineCount(): LineCount {
  try {
    const raw = localStorage.getItem(LINE_COUNT_KEY);
    if (!raw || raw === "auto") return "auto";
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 ? n : "auto";
  } catch {
    return "auto";
  }
}

export function saveLineCount(value: LineCount): void {
  try {
    localStorage.setItem(LINE_COUNT_KEY, value === "auto" ? "auto" : String(value));
  } catch {
    // ignore — the in-memory setting still applies for this session.
  }
}

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
        return reparsed ? { ...reparsed, date, lineId: t.lineId ?? reparsed.lineId } : { ...t, date };
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
