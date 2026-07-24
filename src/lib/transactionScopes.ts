import type { Transaction } from "./parser/types";

export interface WalletLine {
  id: string;
  label: string;
  count: number;
}

/**
 * How many M-PESA lines the user has told us they own. `"auto"` lets Trak guess
 * from the imported messages; a number is the user's declared truth and always
 * wins (this is what fixes phantom extra lines — see {@link planLines}).
 */
export type LineCount = number | "auto";

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

interface LinePlan {
  /** Lines to surface in the UI. Empty when the user effectively has one line. */
  lines: WalletLine[];
  /** Maps every detected group id to the canonical line it belongs to. */
  canonicalOf: Map<string, string>;
}

/**
 * Decide how the imported M-PESA messages map onto the user's real lines.
 *
 * The Android SMS backup tags each message with a SIM `sub_id`, but that id is
 * not stable: swap or re-seat a SIM (or factory-reset the phone) and the *same*
 * physical line reappears under a new id — which is why a two-line user can see
 * a phantom third "line". So we never blindly trust the detected group count:
 *
 * - When the user has **declared** a line count, that wins. We keep the N groups
 *   with the most transactions as the real lines and fold any leftover (stray)
 *   groups into the largest one.
 * - In **auto** mode we keep only groups that carry a meaningful share of the
 *   traffic (>= 10% of the busiest line) and merge the rest, which drops obvious
 *   strays while still showing genuinely-used second lines.
 *
 * Either way, a single effective line yields no switcher at all.
 */
export function planLines(txns: Transaction[], declared: LineCount = "auto"): LinePlan {
  const wallet = walletTransactions(txns);
  // Only SIM-tagged messages define a line. Untagged ones (e.g. bank-to-M-PESA
  // transfers) can't be attributed to a specific line, so they never form one —
  // they simply show up in the combined "All lines" view.
  const counts = new Map<string, number>();
  for (const t of wallet) {
    if (!t.lineId) continue;
    counts.set(t.lineId, (counts.get(t.lineId) ?? 0) + 1);
  }

  const empty: LinePlan = { lines: [], canonicalOf: new Map() };
  if (counts.size === 0) return empty;

  // Busiest group first (real lines dominate), tie-broken by sub-id for stability.
  const groups = [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || numericLinePart(a.id) - numericLinePart(b.id));

  let keep: { id: string; count: number }[];
  if (declared === "auto") {
    const threshold = groups[0].count * 0.1;
    keep = groups.filter((g) => g.count >= threshold);
  } else {
    const n = Math.max(1, Math.min(Math.floor(declared), groups.length));
    keep = groups.slice(0, n);
  }
  if (keep.length === 0) keep = [groups[0]];

  // One effective line → the wallet is undivided, no switcher needed.
  if (keep.length <= 1) return empty;

  // Label kept lines "Line 1, 2, …" ordered by sub-id so numbering is stable.
  const ordered = [...keep].sort((a, b) => numericLinePart(a.id) - numericLinePart(b.id));
  const keepIds = new Set(ordered.map((g) => g.id));
  const primary = groups[0].id; // busiest line absorbs any stray groups

  const canonicalOf = new Map<string, string>();
  for (const g of groups) {
    canonicalOf.set(g.id, keepIds.has(g.id) ? g.id : primary);
  }

  // Recount per canonical line so folded strays are reflected in the badge.
  const finalCounts = new Map<string, number>();
  for (const t of wallet) {
    if (!t.lineId) continue;
    const canon = canonicalOf.get(t.lineId);
    if (!canon) continue;
    finalCounts.set(canon, (finalCounts.get(canon) ?? 0) + 1);
  }

  const lines: WalletLine[] = ordered.map((g, i) => ({
    id: g.id,
    label: `Line ${i + 1}`,
    count: finalCounts.get(g.id) ?? g.count,
  }));

  return { lines, canonicalOf };
}

/** The M-PESA lines to offer in the UI given the user's declared line count. */
export function walletLineOptions(txns: Transaction[], declared: LineCount = "auto"): WalletLine[] {
  return planLines(txns, declared).lines;
}

/**
 * Wallet transactions for a single line (or every line when `"all"`), honouring
 * the same line plan the UI shows so folded strays follow their canonical line.
 */
export function transactionsForLine(
  txns: Transaction[],
  lineId: string | "all",
  declared: LineCount = "auto",
): Transaction[] {
  const wallet = walletTransactions(txns);
  if (lineId === "all") return wallet;
  const { canonicalOf } = planLines(txns, declared);
  return wallet.filter((txn) => txn.lineId != null && canonicalOf.get(txn.lineId) === lineId);
}

function numericLinePart(id: string): number {
  const m = id.match(/\d+/);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
}
