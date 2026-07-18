/**
 * Public parsing API.
 *
 * {@link parseMessage} routes a single SMS to the right provider parser and
 * attaches a spending category. {@link parseMessages} runs a whole inbox dump,
 * de-duplicates by transaction ref, and returns transactions sorted newest
 * first along with a count of lines it couldn't parse.
 */
import type { Transaction } from "./types";
import { parseMpesa, isMpesa } from "./mpesa";
import { parseAirtel, isAirtel } from "./airtel";
import { categorize } from "../categorize";

export * from "./types";
export { isMpesa } from "./mpesa";
export { isAirtel } from "./airtel";

/**
 * Parse one SMS into a fully-categorized {@link Transaction}, or `null` if the
 * text isn't a recognizable mobile-money transaction.
 */
export function parseMessage(raw: string): Transaction | null {
  const text = raw.trim();
  if (!text) return null;

  // Prefer the provider the text clearly belongs to; fall back to trying both
  // so a mislabeled or brand-less message still gets a chance.
  const order = isAirtel(text) && !isMpesa(text)
    ? [parseAirtel, parseMpesa]
    : [parseMpesa, parseAirtel];

  for (const parse of order) {
    const parsed = parse(text);
    if (parsed) {
      return { ...parsed, category: categorize(parsed) };
    }
  }
  return null;
}

export interface ParseResult {
  transactions: Transaction[];
  /** Non-empty lines/blocks that did not parse into a transaction. */
  unparsed: string[];
}

/**
 * Split a raw paste of many SMS messages into individual transactions.
 *
 * Messages are separated by blank lines when present; otherwise each non-empty
 * line is treated as its own message. Duplicates (same non-empty ref) are
 * collapsed so re-importing the same inbox is idempotent.
 */
export function parseMessages(input: string): ParseResult {
  const blocks = splitMessages(input);
  const transactions: Transaction[] = [];
  const unparsed: string[] = [];
  const seenRefs = new Set<string>();

  for (const block of blocks) {
    const txn = parseMessage(block);
    if (!txn) {
      unparsed.push(block);
      continue;
    }
    if (txn.ref && seenRefs.has(txn.ref)) continue;
    if (txn.ref) seenRefs.add(txn.ref);
    transactions.push(txn);
  }

  transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  return { transactions, unparsed };
}

/**
 * Break a paste into message blocks. If the text contains blank-line
 * separators we split on those (a message can span multiple lines); otherwise
 * we split per line.
 */
function splitMessages(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const hasBlankLines = /\n\s*\n/.test(normalized);
  const parts = hasBlankLines ? normalized.split(/\n\s*\n+/) : normalized.split(/\n/);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}
