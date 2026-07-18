/**
 * Airtel Money SMS parser.
 *
 * Airtel Money messages are worded differently from M-Pesa ("You have sent
 * ... to ...", "Transaction ID: ...", "Your new balance is ...") and don't
 * lead with a transaction code, so this parser is kept separate. The overall
 * shape mirrors {@link parseMpesa}: try a set of templates, return the first
 * match as a partial {@link Transaction}.
 */
import type { Transaction, TransactionType, Direction } from "./types";
import { parseAmount, cleanName, parseDate } from "./helpers";

/** A message is Airtel Money if it names Airtel or carries an Airtel ref. */
export function isAirtel(raw: string): boolean {
  return /Airtel\s*Money|Airtel/i.test(raw) || /Transaction ID:\s*[A-Z]{2}\d/i.test(raw);
}

/** Airtel embeds "Transaction ID: PP123456" or "Ref: PP123456". */
function extractRef(raw: string): string {
  const m = raw.match(/(?:Transaction ID|Trans(?:action)? Ref|Ref)[:\s]+([A-Z0-9.]{6,20})/i);
  return m ? m[1].replace(/\.$/, "") : "";
}

/** Airtel: "Charge Ksh0.00" / "Fee: KES 5.00". */
function extractCost(raw: string): number {
  const m = raw.match(/(?:Charge|Fee)[:\s]+Ksh?(?:s)?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return 0;
  const cost = parseAmount(m[1]);
  return isNaN(cost) ? 0 : cost;
}

/** Airtel: "Your new balance is Ksh1,000.00" / "New balance: KES 1,000". */
function extractBalance(raw: string): number | null {
  const m = raw.match(/(?:new balance|balance)(?:\s+is)?[:\s]+Ksh?(?:s)?\s*([\d,]+(?:\.\d+)?)/i);
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

function matchSend(raw: string): PartialTxn | null {
  const m = raw.match(
    /You have sent\s+Ksh?(?:s)?\s*([\d,]+(?:\.\d+)?)\s+to\s+(.+?)(?:\s+(\+?\d[\d\s]{6,14}\d))?(?:\.|\s+Your\b|\s+on\b)/i,
  );
  if (!m) return null;
  return {
    type: "send",
    direction: "expense",
    amount: parseAmount(m[1]),
    counterparty: cleanName(m[2]),
    account: m[3] ? m[3].replace(/\s/g, "") : null,
  };
}

function matchReceive(raw: string): PartialTxn | null {
  const m = raw.match(
    /You have received\s+Ksh?(?:s)?\s*([\d,]+(?:\.\d+)?)\s+from\s+(.+?)(?:\s+(\+?\d[\d\s]{6,14}\d))?(?:\.|\s+Your\b|\s+on\b)/i,
  );
  if (!m) return null;
  return {
    type: "receive",
    direction: "income",
    amount: parseAmount(m[1]),
    counterparty: cleanName(m[2]),
    account: m[3] ? m[3].replace(/\s/g, "") : null,
  };
}

function matchPay(raw: string): PartialTxn | null {
  // "You have paid Ksh500.00 to NAIVAS" / "... to paybill 12345 (KPLC)".
  const m = raw.match(
    /You have paid\s+Ksh?(?:s)?\s*([\d,]+(?:\.\d+)?)\s+to\s+(.+?)(?:\.|\s+Your\b|\s+on\b|\s+for\b)/i,
  );
  if (!m) return null;
  const isBill = /paybill|account/i.test(raw);
  return {
    type: isBill ? "paybill" : "till",
    direction: "expense",
    amount: parseAmount(m[1]),
    counterparty: cleanName(m[2]),
    account: null,
  };
}

function matchAirtime(raw: string): PartialTxn | null {
  const m = raw.match(
    /(?:bought|purchased|top(?:ped)?\s*up)\s+(?:.*?)?Ksh?(?:s)?\s*([\d,]+(?:\.\d+)?)\s+(?:of\s+)?(?:airtime|data|bundle)/i,
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

function matchWithdraw(raw: string): PartialTxn | null {
  const m = raw.match(
    /(?:withdrawn?|withdrawal of)\s+Ksh?(?:s)?\s*([\d,]+(?:\.\d+)?)(?:\s+from\s+(.+?))?(?:\.|\s+Your\b|\s+on\b)/i,
  );
  if (!m) return null;
  return {
    type: "withdraw",
    direction: "expense",
    amount: parseAmount(m[1]),
    counterparty: cleanName(m[2]) ?? "Agent withdrawal",
    account: null,
  };
}

function matchDeposit(raw: string): PartialTxn | null {
  const m = raw.match(
    /(?:deposited?|deposit of)\s+Ksh?(?:s)?\s*([\d,]+(?:\.\d+)?)/i,
  );
  if (!m) return null;
  return {
    type: "deposit",
    direction: "income",
    amount: parseAmount(m[1]),
    counterparty: "Agent deposit",
    account: null,
  };
}

const MATCHERS: Array<(raw: string) => PartialTxn | null> = [
  matchAirtime,
  matchWithdraw,
  matchDeposit,
  matchPay,
  matchReceive,
  matchSend,
];

export function parseAirtel(raw: string): Omit<Transaction, "category"> | null {
  const text = raw.trim();
  if (/failed|could not|unable to complete|did not go through|unsuccessful/i.test(text)) {
    const amt = text.match(/Ksh?(?:s)?\s*([\d,]+(?:\.\d+)?)/i);
    return {
      ref: extractRef(text),
      provider: "airtel",
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
        provider: "airtel",
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
