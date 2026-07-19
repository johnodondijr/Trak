/**
 * A small, dependency-free delimited-text (CSV / TSV / semicolon) parser.
 *
 * It handles quoted fields, escaped quotes (`""`), and embedded newlines —
 * enough for M-Pesa statement exports and SMS-backup CSVs, without pulling in a
 * CSV library. The delimiter is auto-detected from the header line.
 */

export interface DelimitedTable {
  header: string[];
  rows: string[][];
}

/** Guess the delimiter by counting candidates in the first line. */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const candidates = [",", "\t", ";", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/**
 * Parse delimited text into a header + rows table. Returns `null` when the text
 * has no usable rows. Leading blank/preamble lines (common in statement
 * exports) are skipped up to the first line that looks like a header.
 */
export function parseDelimited(text: string, delimiter?: string): DelimitedTable | null {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return null;
  const delim = delimiter ?? detectDelimiter(normalized);

  const records = tokenize(normalized, delim).filter((r) => r.some((c) => c.trim() !== ""));
  if (records.length < 2) return null;

  return { header: records[0].map((c) => c.trim()), rows: records.slice(1) };
}

/** Split delimited text into records (arrays of fields), honoring quotes. */
function tokenize(text: string, delim: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      record.push(field);
      field = "";
    } else if (ch === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // Flush the trailing field/record.
  record.push(field);
  if (record.length > 1 || record[0].trim() !== "") {
    records.push(record);
  }
  return records;
}
