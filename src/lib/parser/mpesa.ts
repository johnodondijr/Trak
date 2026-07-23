/**
 * M-Pesa SMS parser.
 *
 * M-Pesa confirmation messages follow a small number of templates. Each
 * `match*` function targets one template, pulls out the fields, and returns a
 * partial {@link Transaction}. {@link parseMpesa} tries them in order and
 * returns the first hit.
 *
 * The templates are matched loosely (case-insensitive, tolerant of extra
 * clauses like "Amount you can transact within the day is ...") so that small
 * wording changes between Safaricom releases don't break parsing.
 */
import type { Transaction, TransactionType, Direction } from "./types";
import { parseAmount, cleanName, parseDate } from "./helpers";

/** A message is M-Pesa if it mentions the M-PESA brand or looks like one. */
export function isMpesa(raw: string): boolean {
  return /M-?PESA|MPESA/i.test(raw);
}

/** Extract the leading transaction code, e.g. "QGH7XXXX8Y Confirmed." */
function extractRef(raw: string): string {
  const m = raw.match(/^\s*([A-Z0-9]{8,12})\b/);
  return m ? m[1] : "";
}

/** Extract "Transaction cost, Ksh13.00." → 13. Defaults to 0. */
function extractCost(raw: string): number {
  const m = raw.match(/Transaction cost[,:]?\s*Ksh?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return 0;
  const cost = parseAmount(m[1]);
  return isNaN(cost) ? 0 : cost;
}

/** Extract "New M-PESA balance is Ksh4,500.00." → 4500. Null when absent. */
function extractBalance(raw: string): number | null {
  const m = raw.match(
    /(?:New\s+M-?PESA\s+balance|M-?PESA\s+balance)\s+is\s+Ksh?\s*([\d,]+(?:\.\d+)?)/i,
  );
  if (!m) return null;
  const bal = parseAmount(m[1]);
  return isNaN(bal) ? null : bal;
}

type PartialTxn = {
  type: TransactionType;
  direction: Direction;
  amount: number;
  counterparty: string | null;
  account: string | null;
};

function isSafaricomAirtimeCounterparty(name: string | null): boolean {
  return !!name && /\bsafaricom\b/i.test(name);
}

/** Money received from a person. */
function matchReceive(raw: string): PartialTxn | null {
  const m = raw.match(
    /You have received\s+Ksh?\s*([\d,]+(?:\.\d+)?)\s+from\s+(.+?)(?:\s+(\d{6,15}|\d{3,6}))?\s+on\b/i,
  );
  if (!m) return null;
  return {
    type: "receive",
    direction: "income",
    amount: parseAmount(m[1]),
    counterparty: cleanName(m[2]),
    account: m[3] ?? null,
  };
}

/** Airtime purchase ("You bought Ksh100.00 of airtime"). */
function matchAirtime(raw: string): PartialTxn | null {
  const m = raw.match(
    /You bought\s+Ksh?\s*([\d,]+(?:\.\d+)?)\s+of\s+airtime/i,
  );
  if (!m) return null;
  return {
    type: "airtime",
    direction: "expense",
    amount: parseAmount(m[1]),
    counterparty: "Airtime",
    account: null,
  };
}

/** Paybill payment: "Ksh1,500.00 sent to KPLC for account 12345". */
function matchPaybill(raw: string): PartialTxn | null {
  const m = raw.match(
    /Ksh?\s*([\d,]+(?:\.\d+)?)\s+sent to\s+(.+?)\s+for account\s+([^\s.]+)/i,
  );
  if (!m) return null;
  const counterparty = cleanName(m[2]);
  if (isSafaricomAirtimeCounterparty(counterparty)) {
    return {
      type: "airtime",
      direction: "expense",
      amount: parseAmount(m[1]),
      counterparty,
      account: m[3] ?? null,
    };
  }
  return {
    type: "paybill",
    direction: "expense",
    amount: parseAmount(m[1]),
    counterparty,
    account: m[3] ?? null,
  };
}

/** Send money to a person: "Ksh1,000.00 sent to JOHN DOE 0712345678 on ...". */
function matchSend(raw: string): PartialTxn | null {
  const m = raw.match(
    /Ksh?\s*([\d,]+(?:\.\d+)?)\s+sent to\s+(.+?)(?:\s+(\+?\d[\d\s]{6,14}\d))?\s+on\b/i,
  );
  if (!m) return null;
  const counterparty = cleanName(m[2]);
  if (isSafaricomAirtimeCounterparty(counterparty)) {
    return {
      type: "airtime",
      direction: "expense",
      amount: parseAmount(m[1]),
      counterparty,
      account: m[3] ? m[3].replace(/\s/g, "") : null,
    };
  }
  return {
    type: "send",
    direction: "expense",
    amount: parseAmount(m[1]),
    counterparty,
    account: m[3] ? m[3].replace(/\s/g, "") : null,
  };
}

/** Buy Goods / Till: "Ksh500.00 paid to NAIVAS SUPERMARKET. on ...". */
function matchTill(raw: string): PartialTxn | null {
  const m = raw.match(
    /Ksh?\s*([\d,]+(?:\.\d+)?)\s+paid to\s+(.+?)(?:\s+for account\s+([^\s.]+))?\.?\s+on\b/i,
  );
  if (!m) return null;
  const isPaybill = !!m[3];
  const counterparty = cleanName(m[2]);
  if (isSafaricomAirtimeCounterparty(counterparty)) {
    return {
      type: "airtime",
      direction: "expense",
      amount: parseAmount(m[1]),
      counterparty,
      account: m[3] ?? null,
    };
  }
  return {
    type: isPaybill ? "paybill" : "till",
    direction: "expense",
    amount: parseAmount(m[1]),
    counterparty,
    account: m[3] ?? null,
  };
}

/** Withdrawal at an agent: "Withdraw Ksh2,000.00 from 12345 - AGENT NAME". */
function matchWithdraw(raw: string): PartialTxn | null {
  const m = raw.match(
    /Withdraw\s+Ksh?\s*([\d,]+(?:\.\d+)?)\s+from\s+(.+?)(?:\.\s|\.$|\s+New\b)/i,
  );
  if (!m) return null;
  return {
    type: "withdraw",
    direction: "expense",
    amount: parseAmount(m[1]),
    counterparty: cleanName(m[2]),
    account: null,
  };
}

/** Cash deposit: "Give Ksh1,000.00 cash to ..." / "deposited Ksh...". */
function matchDeposit(raw: string): PartialTxn | null {
  const give = raw.match(
    /Give\s+Ksh?\s*([\d,]+(?:\.\d+)?)\s+cash to\s+(.+?)(?:\.\s|\.$|\s+New\b)/i,
  );
  if (give) {
    return {
      type: "deposit",
      direction: "income",
      amount: parseAmount(give[1]),
      counterparty: cleanName(give[2]),
      account: null,
    };
  }
  const dep = raw.match(
    /(?:deposited?|Deposit of)\s+Ksh?\s*([\d,]+(?:\.\d+)?)/i,
  );
  if (dep) {
    return {
      type: "deposit",
      direction: "income",
      amount: parseAmount(dep[1]),
      counterparty: "Agent deposit",
      account: null,
    };
  }
  return null;
}

/** Fuliza borrowing: "Fuliza M-PESA amount is Ksh500.00.". */
function matchFuliza(raw: string): PartialTxn | null {
  const m = raw.match(/Fuliza\s+M-?PESA\s+amount is\s+Ksh?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  return {
    type: "fuliza",
    direction: "neutral",
    amount: parseAmount(m[1]),
    counterparty: "Fuliza",
    account: null,
  };
}

/** Reversal: "Reversal of transaction ... has been reversed/credited ... Ksh...". */
function matchReversal(raw: string): PartialTxn | null {
  // Require reversal-specific wording, not just the substring "revers", so a
  // payment to a business with "Reversal" in its name isn't mistaken for one.
  if (!/revers(?:al|ed)\b/i.test(raw)) return null;
  if (!/(has been reversed|been reversed|reversal of|credited to your)/i.test(raw)) return null;
  const m = raw.match(/Ksh?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  return {
    type: "reversal",
    direction: "income",
    amount: parseAmount(m[1]),
    counterparty: "Reversal",
    account: null,
  };
}

/** Balance enquiry: "Your M-PESA balance was Ksh..." (no money moved). */
function matchBalance(raw: string): PartialTxn | null {
  if (!/balance (?:was|is)\b/i.test(raw)) return null;
  // Only treat as a pure balance enquiry when there's no other verb.
  if (/(sent to|paid to|received|Withdraw|bought|deposit)/i.test(raw)) {
    return null;
  }
  const m = raw.match(/balance (?:was|is)\s+Ksh?\s*([\d,]+(?:\.\d+)?)/i);
  return {
    type: "balance",
    direction: "neutral",
    amount: m ? parseAmount(m[1]) : 0,
    counterparty: null,
    account: null,
  };
}

// Ordered most-specific → least-specific. Paybill before Send/Till because
// "sent to X for account Y" and "paid to X for account Y" are Paybills.
const MATCHERS: Array<(raw: string) => PartialTxn | null> = [
  matchReversal,
  matchFuliza,
  matchAirtime,
  matchPaybill,
  matchTill,
  matchWithdraw,
  matchDeposit,
  matchReceive,
  matchSend,
  matchBalance,
];

/**
 * Structural gate: is this an *official* M-Pesa transaction message?
 *
 * Every genuine M-Pesa SMS begins with a transaction code (8–12 uppercase
 * alphanumerics, mixing letters and digits) followed by "Confirmed" (successful
 * transactions of every kind) or "Failed" (a failed one). Promotional messages,
 * balance-limit reminders, loan adverts and spam never match this shape, so
 * this single check rejects them while keeping every real transaction.
 */
export function isMpesaTransaction(raw: string): boolean {
  const m = raw.trim().match(/^([A-Z0-9]{8,12})\s+(Confirmed|Failed)\b/);
  return !!m && /[A-Z]/.test(m[1]) && /[0-9]/.test(m[1]);
}

/**
 * Parse a single M-Pesa SMS into a {@link Transaction} (minus its category,
 * which is assigned later). Returns `null` when the text isn't an official
 * M-Pesa transaction message (promos, reminders and spam are rejected).
 */
export function parseMpesa(raw: string): Omit<Transaction, "category"> | null {
  const text = raw.trim();
  if (!isMpesaTransaction(text)) return null;

  if (/^[A-Z0-9]{8,12}\s+Failed\b/.test(text) || /\bhas failed\b|could not be completed/i.test(text)) {
    // Failed transaction — record it but with no money moved.
    const amt = text.match(/Ksh?\s*([\d,]+(?:\.\d+)?)/i);
    return {
      ref: extractRef(text),
      provider: "mpesa",
      type: "failed",
      direction: "neutral",
      amount: amt ? parseAmount(amt[1]) : 0,
      cost: 0,
      balance: extractBalance(text),
      counterparty: null,
      account: null,
      date: parseDate(text),
      raw: text,
    };
  }

  for (const matcher of MATCHERS) {
    const hit = matcher(text);
    if (hit && !isNaN(hit.amount)) {
      return {
        ref: extractRef(text),
        provider: "mpesa",
        type: hit.type,
        direction: hit.direction,
        amount: hit.amount,
        cost: extractCost(text),
        balance: extractBalance(text),
        counterparty: hit.counterparty,
        account: hit.account,
        date: parseDate(text),
        raw: text,
      };
    }
  }

  return null;
}
