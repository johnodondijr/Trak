/**
 * Bank-sourced transaction messages.
 *
 * Beyond the pure M-Pesa / Airtel confirmations, users receive money-movement
 * SMS from bank apps that ride on M-Pesa or from card networks. These are
 * worded very differently (no leading "CODE Confirmed"), so they get their own
 * parser. Each matcher targets one real template and is specific enough that
 * promos/adverts from the same banks don't match.
 *
 * Templates currently handled (from real samples):
 *  - Card purchase:      "Dear NAME, You made a purchase of KES X on <ISO> at
 *                         MERCHANT using I&M <card> …"                → provider "bank"
 *  - Bank → M-Pesa in:   "NAME has sent KShs. X to your MPESA. The MPESA
 *                         receipt number is REF …"                    → provider "mpesa"
 *  - Bank app → send:    "Dear NAME, you have sent Ksh. X to NAME2 <acct> on
 *                         DD/MM/YYYY at HH:MM:SS. MPESA Ref. REF …"    → provider "mpesa"
 */
import type { Transaction } from "./types";
import { parseAmount, cleanName, parseDate, CURRENCY } from "./helpers";

/** Detect a bank name mentioned in a card message ("using I&M …"). */
function institutionFromCard(token: string): string {
  const t = token.toUpperCase();
  if (t === "I&M" || t.startsWith("I&M")) return "I&M";
  if (t.includes("EQUITY")) return "Equity";
  if (t.includes("KCB")) return "KCB";
  if (t.includes("ABSA")) return "Absa";
  if (t.includes("NCBA")) return "NCBA";
  if (t.includes("STANBIC")) return "Stanbic";
  if (t.includes("DTB")) return "DTB";
  if (t.includes("COOP") || t.includes("CO-OP")) return "Co-op Bank";
  return token;
}

/** Card purchase alert (I&M and similar). */
function matchCardPurchase(text: string): Omit<Transaction, "category"> | null {
  const m = text.match(
    new RegExp(
      `You made a purchase of\\s*${CURRENCY}([\\d,]+(?:\\.\\d+)?)\\s+on\\s+` +
        `(\\d{4}-\\d{2}-\\d{2}[ T]\\d{1,2}:\\d{2}(?::\\d{2})?)\\s+at\\s+(.+?)\\s+using\\s+` +
        `([A-Za-z&]+)\\s*([\\dX*]+)?`,
      "i",
    ),
  );
  if (!m) return null;
  const amount = parseAmount(m[1]);
  if (isNaN(amount)) return null;
  return {
    ref: "",
    provider: "bank",
    type: "till",
    direction: "expense",
    amount,
    cost: 0,
    balance: null,
    counterparty: cleanName(m[3]),
    account: m[5] ?? null,
    institution: institutionFromCard(m[4]),
    date: parseDate(m[2]),
    raw: text,
  };
}

/** Money received into M-Pesa via a bank ("NAME has sent KShs X to your MPESA"). */
function matchBankToMpesaReceive(text: string): Omit<Transaction, "category"> | null {
  const m = text.match(
    new RegExp(`^(.+?)\\s+has sent\\s+${CURRENCY}([\\d,]+(?:\\.\\d+)?)\\s+to your\\s+M-?PESA\\b`, "i"),
  );
  if (!m) return null;
  const amount = parseAmount(m[2]);
  if (isNaN(amount)) return null;
  const refM = text.match(/M-?PESA receipt (?:number )?is\s+([A-Z0-9]{8,12})/i);
  const ref2 = text.match(/transaction reference is\s+([A-Z0-9]+)/i);
  const institution = ref2 && /^EQ/i.test(ref2[1]) ? "Equity" : null;
  return {
    ref: refM ? refM[1] : "",
    provider: "mpesa",
    type: "receive",
    direction: "income",
    amount,
    cost: 0,
    balance: null,
    counterparty: cleanName(m[1]),
    account: null,
    institution,
    date: parseDate(text),
    raw: text,
  };
}

/** Send initiated from a bank app that settles on M-Pesa (MCoopCash etc.). */
function matchBankAppSend(text: string): Omit<Transaction, "category"> | null {
  const m = text.match(
    new RegExp(
      `you have sent\\s+${CURRENCY}([\\d,]+(?:\\.\\d+)?)\\s+to\\s+(.+?)\\s+on\\s+` +
        `(\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})\\s+at\\s+([\\d:]+)`,
      "i",
    ),
  );
  if (!m) return null;
  const refM = text.match(/M-?PESA Ref\.?\s*([A-Z0-9]{8,12})/i);
  if (!refM) return null; // require the M-Pesa reference so adverts don't match
  const amount = parseAmount(m[1]);
  if (isNaN(amount)) return null;
  const institution = /mcoop|co-?op/i.test(text) ? "Co-op Bank" : null;
  return {
    ref: refM[1],
    provider: "mpesa",
    type: "send",
    direction: "expense",
    amount,
    cost: 0,
    balance: null,
    counterparty: cleanName(m[2]),
    account: null,
    institution,
    date: parseDate(`${m[3]} at ${m[4]}`),
    raw: text,
  };
}

const MATCHERS = [matchCardPurchase, matchBankToMpesaReceive, matchBankAppSend];

/**
 * Parse a bank-sourced transaction SMS, or `null` when the text matches none of
 * the known bank templates.
 */
export function parseBank(raw: string): Omit<Transaction, "category"> | null {
  const text = raw.trim();
  for (const matcher of MATCHERS) {
    const hit = matcher(text);
    if (hit) return hit;
  }
  return null;
}
