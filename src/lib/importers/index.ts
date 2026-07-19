/**
 * Unified file/text import entry point.
 *
 * {@link importContent} auto-detects what a pasted or uploaded blob is —
 * an SMS-backup XML export, a delimited M-Pesa statement, a delimited SMS
 * export, or plain pasted messages — routes it to the right parser, and returns
 * a normalized {@link ImportResult}. The dashboard never has to know which
 * format the data came in.
 */
import type { Transaction } from "../parser/types";
import { parseMessages, parseSms } from "../parser/index";
import { isSmsBackupXml, parseSmsBackup } from "./smsBackup";
import { parseDelimited, type DelimitedTable } from "./delimited";
import { isStatementTable, parseStatement } from "./statement";

export type ImportSource = "sms-backup" | "statement" | "sms-csv" | "text";

export interface ImportResult {
  transactions: Transaction[];
  /** How the content was interpreted. */
  source: ImportSource;
  /** Total candidate records seen (SMS entries / rows / message blocks). */
  seen: number;
  /** Records that did not yield a transaction. */
  skipped: number;
}

/**
 * Detect and parse arbitrary imported content.
 *
 * @param content  Raw file text or pasted text.
 * @param filename Optional file name — its extension is used as a tiebreaker.
 */
export function importContent(content: string, filename = ""): ImportResult {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  // 1) SMS Backup & Restore XML.
  if (ext === "xml" || isSmsBackupXml(content)) {
    return importSmsBackup(content);
  }

  // 2) Delimited data (CSV/TSV) — statement or SMS export.
  const looksDelimited =
    ext === "csv" || ext === "tsv" || isProbablyDelimited(content);
  if (looksDelimited) {
    const table = parseDelimited(content);
    if (table) {
      return importTable(table);
    }
  }

  // 3) Plain text / pasted messages.
  const { transactions, unparsed } = parseMessages(content);
  return dedupe({
    transactions,
    source: "text",
    seen: transactions.length + unparsed.length,
    skipped: unparsed.length,
  });
}

/**
 * Only messages from the official M-Pesa / Airtel Money senders are considered.
 * This drops promos from other short-codes, bank/utility adverts and personal
 * contacts up front. A missing address (e.g. a plain-text paste) passes through
 * to the structural gate in the parser, which does the real precision filtering.
 */
function isMoneySender(address: string | null | undefined): boolean {
  if (!address || address.trim() === "") return true;
  return /m-?pesa|airtel/i.test(address);
}

function importSmsBackup(content: string): ImportResult {
  const messages = parseSmsBackup(content);
  const transactions: Transaction[] = [];
  let skipped = 0;
  for (const sms of messages) {
    if (!isMoneySender(sms.address)) {
      skipped++;
      continue;
    }
    const txn = parseSms(sms);
    if (txn) transactions.push(txn);
    else skipped++;
  }
  return dedupe({ transactions, source: "sms-backup", seen: messages.length, skipped });
}

function importTable(table: DelimitedTable): ImportResult {
  if (isStatementTable(table)) {
    const { transactions, skipped } = parseStatement(table);
    return dedupe({
      transactions,
      source: "statement",
      seen: table.rows.length,
      skipped,
    });
  }

  // Otherwise treat it as an SMS export: find a body/message column.
  const bodyIdx = table.header.findIndex((h) =>
    /body|message|text|sms|content/i.test(h),
  );
  const addrIdx = table.header.findIndex((h) => /address|sender|from/i.test(h));
  const dateIdx = table.header.findIndex((h) => /date|time/i.test(h));

  const transactions: Transaction[] = [];
  let skipped = 0;
  for (const row of table.rows) {
    const body = bodyIdx >= 0 ? row[bodyIdx] : row.join(" ");
    if (!body || !body.trim()) {
      skipped++;
      continue;
    }
    const address = addrIdx >= 0 ? row[addrIdx] : null;
    if (!isMoneySender(address)) {
      skipped++;
      continue;
    }
    const rawDate = dateIdx >= 0 ? row[dateIdx] : "";
    const txn = parseSms({ body, address, date: parseFlexibleDate(rawDate) });
    if (txn) transactions.push(txn);
    else skipped++;
  }
  return dedupe({ transactions, source: "sms-csv", seen: table.rows.length, skipped });
}

/** Parse an epoch-millis or date string from a CSV cell; null when unusable. */
function parseFlexibleDate(value: string | undefined): Date | null {
  if (!value) return null;
  const s = value.trim();
  if (/^\d{12,}$/.test(s)) {
    const d = new Date(Number(s));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Heuristic: does the text look like rows of delimited data (not prose)? */
function isProbablyDelimited(content: string): boolean {
  const lines = content.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return false;
  const commas = lines.slice(0, 5).map((l) => (l.match(/,|\t|;/g) ?? []).length);
  // Every one of the first few lines has multiple delimiters → tabular.
  return commas.every((c) => c >= 2);
}

/** Collapse duplicate transactions by ref (then by raw text) within an import. */
function dedupe(result: ImportResult): ImportResult {
  const seenKeys = new Set<string>();
  const unique: Transaction[] = [];
  for (const t of result.transactions) {
    const key = t.ref ? `ref:${t.ref}` : `raw:${t.raw}|${t.date.getTime()}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    unique.push(t);
  }
  unique.sort((a, b) => b.date.getTime() - a.date.getTime());
  return { ...result, transactions: unique };
}
