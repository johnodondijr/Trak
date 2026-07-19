/**
 * Importer for the "SMS Backup & Restore" Android app (and compatible tools).
 *
 * That app exports the whole SMS inbox as an XML file that looks like:
 *
 *   <?xml version="1.0" encoding="UTF-8"?>
 *   <smses count="1234">
 *     <sms address="MPESA" date="1688368320000" type="1"
 *          body="TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to ..." ... />
 *     ...
 *   </smses>
 *
 * We pull the `address`, `date` (epoch millis) and `body` off each `<sms>`
 * element. Parsing/categorization is left to the shared parser — this module
 * only turns a file into a list of {@link RawSms}.
 */
import type { RawSms } from "../parser/index";

/** True when the text looks like an SMS Backup & Restore export. */
export function isSmsBackupXml(content: string): boolean {
  const head = content.slice(0, 2000);
  return /<smses\b/i.test(head) || (/<\?xml/i.test(head) && /<sms\b/i.test(head));
}

/**
 * Parse an SMS-backup XML string into {@link RawSms} records. Uses the DOM
 * parser available in browsers (and jsdom under tests). Malformed files yield
 * an empty list rather than throwing.
 */
export function parseSmsBackup(content: string): RawSms[] {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(content, "application/xml");
  } catch {
    return [];
  }
  // A parse error shows up as a <parsererror> element.
  if (doc.getElementsByTagName("parsererror").length > 0) {
    // Fall back to a lenient regex scan (handles minor malformations).
    return scanSmsElements(content);
  }

  const nodes = doc.getElementsByTagName("sms");
  const out: RawSms[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const body = el.getAttribute("body");
    if (!body) continue;
    out.push({
      body: decodeEntities(body),
      address: el.getAttribute("address"),
      date: epochToDate(el.getAttribute("date")),
    });
  }
  return out;
}

/** Regex fallback for slightly-malformed XML that DOMParser rejects. */
function scanSmsElements(content: string): RawSms[] {
  const out: RawSms[] = [];
  const re = /<sms\b[^>]*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const tag = m[0];
    const body = attr(tag, "body");
    if (!body) continue;
    out.push({
      body: decodeEntities(body),
      address: attr(tag, "address"),
      date: epochToDate(attr(tag, "date")),
    });
  }
  return out;
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

function epochToDate(value: string | null): Date | null {
  if (!value) return null;
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

/** Decode the handful of XML entities that appear in SMS bodies. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "\r")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
