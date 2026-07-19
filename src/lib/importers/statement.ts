/**
 * Importer for the official M-Pesa statement (and similar structured exports).
 *
 * Safaricom's full statement — the PDF/Excel you can request from the app or by
 * dialing *334# — is a table with columns like:
 *
 *   Receipt No. | Completion Time | Details | Transaction Status | Paid In | Withdrawn | Balance
 *
 * When a user converts that to CSV, this module maps each row straight into a
 * {@link Transaction}, using the structured Paid In / Withdrawn columns for the
 * amount and direction and classifying the free-text "Details" for the type,
 * counterparty and account.
 */
import type { Transaction, TransactionType, Direction } from "../parser/types";
import { categorize } from "../categorize";
import { parseAmount, cleanName } from "../parser/helpers";
import type { DelimitedTable } from "./delimited";

/** Find the index of the first header matching any of the given patterns. */
function findCol(header: string[], patterns: RegExp[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = header[i].toLowerCase().trim();
    if (patterns.some((p) => p.test(h))) return i;
  }
  return -1;
}

interface StatementCols {
  ref: number;
  date: number;
  details: number;
  status: number;
  paidIn: number;
  withdrawn: number;
  balance: number;
  amount: number;
}

function locateColumns(header: string[]): StatementCols {
  return {
    ref: findCol(header, [/receipt/, /reference/, /transaction\s*id/, /txn/]),
    date: findCol(header, [/completion\s*time/, /date|time/]),
    details: findCol(header, [/details/, /description/, /narration/, /particulars/]),
    status: findCol(header, [/status/]),
    paidIn: findCol(header, [/paid\s*in/, /money\s*in/, /credit/, /received/]),
    withdrawn: findCol(header, [/withdrawn/, /paid\s*out/, /money\s*out/, /debit/]),
    balance: findCol(header, [/balance/]),
    amount: findCol(header, [/^amount$/, /\bamount\b/]),
  };
}

/**
 * True when a delimited table looks like an M-Pesa statement — it needs a
 * details column plus either a paid-in/withdrawn pair or a single amount.
 */
export function isStatementTable(table: DelimitedTable): boolean {
  const c = locateColumns(table.header);
  const hasMoney = c.paidIn >= 0 || c.withdrawn >= 0 || c.amount >= 0;
  const hasContext = c.details >= 0 || c.ref >= 0;
  return hasMoney && hasContext;
}

/** Parse a statement date such as "2026-07-03 08:32:15" or "03/07/2026 08:32". */
function parseStatementDate(raw: string): Date {
  const s = raw.trim();
  // ISO-ish "YYYY-MM-DD HH:MM:SS"
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (iso) {
    const [, y, mo, d, h, mi, se] = iso;
    return new Date(+y, +mo - 1, +d, +h, +mi, se ? +se : 0);
  }
  // "DD/MM/YYYY HH:MM[:SS]" or "DD.MM.YYYY"
  const dmy = s.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (dmy) {
    const [, d, mo, y, h, mi] = dmy;
    const year = y.length === 2 ? 2000 + +y : +y;
    return new Date(year, +mo - 1, +d, h ? +h : 0, mi ? +mi : 0);
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

/** Classify the free-text "Details" column into type + counterparty + account. */
export function classifyDetails(
  details: string,
  direction: Direction,
): { type: TransactionType; counterparty: string | null; account: string | null } {
  const d = details.toLowerCase();

  if (/charge/.test(d)) return { type: "charge", counterparty: "Transaction charge", account: null };
  if (/fuliza|overdra|od loan/.test(d)) return { type: "fuliza", counterparty: "Fuliza", account: null };
  if (/airtime|bundles?|data/.test(d)) return { type: "airtime", counterparty: "Airtime", account: null };

  const { name, account } = extractParty(details);

  if (/pay\s*bill|paybill/.test(d)) return { type: "paybill", counterparty: name, account };
  if (/merchant payment|buy goods|till|pochi/.test(d)) return { type: "till", counterparty: name, account };
  if (/withdraw/.test(d)) return { type: "withdraw", counterparty: name ?? "Agent withdrawal", account };
  if (/deposit/.test(d)) return { type: "deposit", counterparty: name ?? "Agent deposit", account };
  if (/received|funds received|business payment from|salary|reversal/.test(d)) {
    return { type: /reversal/.test(d) ? "reversal" : "receive", counterparty: name, account };
  }
  if (/transfer|sent to|send money/.test(d)) return { type: "send", counterparty: name, account };

  // Unknown wording: fall back to the money direction.
  return { type: direction === "income" ? "receive" : "send", counterparty: name, account };
}

/**
 * Pull a human name and account/phone out of a details string such as
 * "Pay Bill to 888880 - KPLC PREPAID - Acc. 12345" or
 * "Customer Transfer to 2547XXXXXXXX - JOHN KAMAU".
 */
function extractParty(details: string): { name: string | null; account: string | null } {
  const parts = details.split(/\s+-\s+/).map((p) => p.trim());
  let name: string | null = null;
  let account: string | null = null;

  for (const part of parts) {
    const accMatch = part.match(/acc(?:ount)?\.?\s*[:.]?\s*(\S+)/i);
    if (accMatch) {
      account = accMatch[1];
      continue;
    }
    // A part that is mostly letters is the counterparty name.
    if (/[a-z]{3,}/i.test(part) && !/^(pay bill|paybill|merchant payment|customer transfer|buy goods|funds received|business payment|withdrawal|deposit)/i.test(part)) {
      const cleaned = cleanName(part.replace(/^to\s+|^from\s+/i, ""));
      if (cleaned && !/^\d[\d\s]*$/.test(cleaned)) name = cleaned;
    }
  }

  // Account fallback: a long digit run (phone / shortcode) anywhere in details.
  if (!account) {
    const digits = details.match(/\b(\d{5,15})\b/);
    if (digits) account = digits[1];
  }
  return { name, account };
}

export interface StatementResult {
  transactions: Transaction[];
  skipped: number;
}

/** Convert a detected statement table into categorized transactions. */
export function parseStatement(table: DelimitedTable): StatementResult {
  const c = locateColumns(table.header);
  const transactions: Transaction[] = [];
  let skipped = 0;

  for (const row of table.rows) {
    const cell = (i: number) => (i >= 0 && i < row.length ? row[i].trim() : "");

    const paidIn = c.paidIn >= 0 ? parseAmount(cell(c.paidIn)) : NaN;
    const withdrawn = c.withdrawn >= 0 ? parseAmount(cell(c.withdrawn)) : NaN;
    const single = c.amount >= 0 ? cell(c.amount) : "";

    let amount = 0;
    let direction: Direction = "neutral";
    if (!isNaN(paidIn) && paidIn > 0) {
      amount = paidIn;
      direction = "income";
    } else if (!isNaN(withdrawn) && withdrawn > 0) {
      amount = withdrawn;
      direction = "expense";
    } else if (single !== "") {
      const val = parseAmount(single);
      if (!isNaN(val) && val !== 0) {
        amount = Math.abs(val);
        direction = /^-|\(/.test(single.trim()) ? "expense" : "income";
      }
    }

    if (amount <= 0) {
      skipped++;
      continue;
    }

    const details = cell(c.details) || "Transaction";
    const status = cell(c.status).toLowerCase();
    const { type, counterparty, account } =
      status.includes("fail") || status.includes("cancel")
        ? { type: "failed" as TransactionType, counterparty: null, account: null }
        : classifyDetails(details, direction);

    const base: Omit<Transaction, "category"> = {
      ref: cell(c.ref),
      provider: "mpesa",
      type,
      direction: type === "failed" ? "neutral" : direction,
      amount,
      cost: 0,
      balance: c.balance >= 0 ? (isNaN(parseAmount(cell(c.balance))) ? null : parseAmount(cell(c.balance))) : null,
      counterparty,
      account,
      date: c.date >= 0 ? parseStatementDate(cell(c.date)) : new Date(),
      raw: details,
    };
    transactions.push({ ...base, category: categorize(base) });
  }

  return { transactions, skipped };
}
