/**
 * Small pure helpers shared by the provider-specific parsers.
 * Kept separate so they can be unit-tested in isolation.
 */

/**
 * Parse a KES amount like `"1,234.50"`, `"Ksh1,000"` or `"KES 20.00"` into a
 * number. Returns `NaN` when no number can be found.
 */
export function parseAmount(input: string | null | undefined): number {
  if (!input) return NaN;
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (cleaned === "") return NaN;
  return parseFloat(cleaned);
}

/**
 * Normalize whitespace in a counterparty / name fragment and trim trailing
 * punctuation that the SMS templates leave behind (e.g. "NAIVAS LTD.").
 */
export function cleanName(input: string | null | undefined): string | null {
  if (!input) return null;
  const name = input.replace(/\s+/g, " ").trim().replace(/[.,]+$/, "").trim();
  return name === "" ? null : name;
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Turn a two-digit or four-digit year into a full year.
 * M-Pesa uses two-digit years; we assume 2000+.
 */
function normalizeYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

/**
 * Convert an hour + am/pm marker to 24-hour time.
 */
function to24Hour(hour: number, meridiem: string | undefined): number {
  if (!meridiem) return hour;
  const m = meridiem.toLowerCase();
  if (m.startsWith("p") && hour < 12) return hour + 12;
  if (m.startsWith("a") && hour === 12) return 0;
  return hour;
}

/**
 * Parse the date/time fragment that mobile-money messages embed, e.g.
 *   "on 5/7/23 at 8:30 PM"
 *   "on 12/1/24 at 10:05 AM"
 *   "5th Jan 2024, 3:00 PM"
 *
 * Returns the parsed {@link Date}, falling back to {@link fallback} (default:
 * now) when nothing recognizable is found, so a single odd message never
 * drops the whole transaction.
 */
export function parseDate(rawInput: string, fallback: Date = new Date()): Date {
  // Drop "due on/by <date>" clauses first — that's a future repayment/expiry
  // date (e.g. Fuliza states a due date), never the transaction time. Without
  // this, a message with no timestamp would be mis-dated to its due date.
  const raw = rawInput.replace(/\bdue\s+(?:on|by)\b[^.,]*/gi, " ");

  // Numeric form: d/m/yy or d/m/yyyy, optional time with am/pm.
  const numeric = raw.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+at\s+|\s*,?\s+|\s+)?(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/,
  );
  if (numeric) {
    const [, dd, mm, yy, hh, min, mer] = numeric;
    const d = new Date(
      normalizeYear(parseInt(yy, 10)),
      parseInt(mm, 10) - 1,
      parseInt(dd, 10),
      to24Hour(parseInt(hh, 10), mer),
      parseInt(min, 10),
    );
    if (!isNaN(d.getTime())) return d;
  }

  // Numeric date with no time.
  const dateOnly = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateOnly) {
    const [, dd, mm, yy] = dateOnly;
    const d = new Date(
      normalizeYear(parseInt(yy, 10)),
      parseInt(mm, 10) - 1,
      parseInt(dd, 10),
    );
    if (!isNaN(d.getTime())) return d;
  }

  // Named-month form: "5th Jan 2024, 3:00 PM" / "5 Jan 24".
  const named = raw.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,4})\.?\s+(\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?)?/,
  );
  if (named) {
    const [, dd, monText, yy, hh, min, mer] = named;
    const month = MONTHS[monText.toLowerCase()];
    if (month !== undefined) {
      const d = new Date(
        normalizeYear(parseInt(yy, 10)),
        month,
        parseInt(dd, 10),
        hh ? to24Hour(parseInt(hh, 10), mer) : 0,
        min ? parseInt(min, 10) : 0,
      );
      if (!isNaN(d.getTime())) return d;
    }
  }

  return fallback;
}
