/**
 * Public parsing API.
 *
 * {@link parseMessage} routes a single SMS to the right provider parser and
 * attaches a spending category. {@link parseMessages} runs a whole inbox dump,
 * de-duplicates by transaction ref, and returns transactions sorted newest
 * first along with a count of lines it couldn't parse.
 */
import type { Transaction, Provider } from "./types";
import { parseMpesa, isMpesa } from "./mpesa";
import { parseAirtel, isAirtel } from "./airtel";
import { parseBank } from "./bank";
import { categorize } from "../categorize";
import { dedupeTransactions } from "../transactionDedupe";

export * from "./types";
export { isMpesa } from "./mpesa";
export { isAirtel } from "./airtel";

/**
 * Parse one SMS into a fully-categorized {@link Transaction}, or `null` if the
 * text isn't a recognizable mobile-money transaction.
 *
 * When {@link hint} is supplied (e.g. from the SMS sender address in a backup
 * file) that provider's parser is tried first, which disambiguates the rare
 * message whose wording could belong to either network.
 */
export function parseMessage(raw: string, hint?: Provider | null): Transaction | null {
  const text = raw.trim();
  if (!text) return null;

  // Prefer the hinted provider, else the one the text clearly belongs to;
  // always fall back to trying both so nothing is dropped on a wording change.
  let order: Array<typeof parseMpesa>;
  if (hint === "airtel") order = [parseAirtel, parseMpesa];
  else if (hint === "mpesa") order = [parseMpesa, parseAirtel];
  else order = isAirtel(text) && !isMpesa(text) ? [parseAirtel, parseMpesa] : [parseMpesa, parseAirtel];

  for (const parse of order) {
    const parsed = parse(text);
    if (parsed) {
      return { ...parsed, category: categorize(parsed) };
    }
  }
  // Fall back to bank-sourced templates (card purchases, bank-app transfers).
  const bank = parseBank(text);
  if (bank) return { ...bank, category: categorize(bank) };
  return null;
}

/** A single SMS with the metadata a backup file provides alongside the text. */
export interface RawSms {
  /** The message text (M-Pesa / Airtel confirmation). */
  body: string;
  /** Sender address / short-code, e.g. "MPESA" or "AirtelMoney". */
  address?: string | null;
  /** When the SMS was received — authoritative, unlike the in-text date. */
  date?: Date | null;
  subId?: string | null;
}

/** Map an SMS sender address to a provider, or null when it isn't one we track. */
export function providerFromAddress(address: string | null | undefined): Provider | null {
  if (!address) return null;
  const a = address.toLowerCase();
  if (/m-?pesa|safaricom/.test(a)) return "mpesa";
  if (/airtel/.test(a)) return "airtel";
  return null;
}

/**
 * Parse an SMS that carries backup metadata. The sender address disambiguates
 * the provider, and the SMS receipt time overrides the (2-digit-year, sometimes
 * ambiguous) date embedded in the message body.
 */
export function parseSms(sms: RawSms): Transaction | null {
  const hint = providerFromAddress(sms.address);
  const txn = parseMessage(sms.body, hint);
  if (!txn) return null;
  if (sms.date && !isNaN(sms.date.getTime())) {
    txn.date = sms.date;
  }
  if (sms.subId) txn.lineId = `sub:${sms.subId}`;
  return txn;
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

  for (const block of blocks) {
    const txn = parseMessage(block);
    if (!txn) {
      unparsed.push(block);
      continue;
    }
    transactions.push(txn);
  }

  return { transactions: dedupeTransactions(transactions), unparsed };
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
