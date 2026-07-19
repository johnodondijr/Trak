import { describe, it, expect } from "vitest";
import { parseDate } from "./parser/helpers";
import { parseMessages, parseMessage } from "./parser/index";
import { SAMPLE_MESSAGES } from "../data/sampleMessages";
import { hasSample, stripSample, isSampleTxn } from "./sample";

describe("due-date is not mistaken for the transaction date", () => {
  it("falls back instead of using a 'due on' date when no timestamp exists", () => {
    const fb = new Date(2026, 0, 15, 9, 0);
    const d = parseDate(
      "Fuliza M-PESA amount is Ksh500.00. Total Fuliza outstanding Ksh505.00 due on 20/7/26.",
      fb,
    );
    expect(d.getTime()).toBe(fb.getTime());
  });

  it("still reads the real transaction time when both a time and a due date exist", () => {
    const d = parseDate("Ksh500 borrowed on 3/7/26 at 8:00 AM, due on 20/7/26.");
    expect(d.getDate()).toBe(3);
    expect(d.getMonth()).toBe(6); // July
  });

  it("the sample Fuliza message is no longer dated to its due date", () => {
    const t = parseMessage(
      "TFB1K2L3M4 Confirmed. Fuliza M-PESA amount is Ksh500.00. Interest charged Ksh5.00. Total Fuliza M-PESA outstanding amount is Ksh505.00 due on 20/7/26.",
    );
    expect(t).not.toBeNull();
    // Must not be 20 July 2026 (the due date).
    const isDueDate = t!.date.getFullYear() === 2026 && t!.date.getMonth() === 6 && t!.date.getDate() === 20;
    expect(isDueDate).toBe(false);
  });
});

describe("sample data isolation", () => {
  const sample = parseMessages(SAMPLE_MESSAGES).transactions;
  const real = parseMessages(
    "TZZ9999999 Confirmed. Ksh100.00 sent to REAL PERSON 0700000000 on 3/7/26 at 8:00 AM. New M-PESA balance is Ksh900.00. Transaction cost, Ksh0.00.",
  ).transactions;

  it("flags every sample transaction and no real ones", () => {
    expect(sample.length).toBeGreaterThan(0);
    expect(sample.every(isSampleTxn)).toBe(true);
    expect(hasSample(real)).toBe(false);
  });

  it("stripSample removes demo rows and keeps real ones", () => {
    const mixed = [...sample, ...real];
    const stripped = stripSample(mixed);
    expect(stripped).toHaveLength(real.length);
    expect(hasSample(stripped)).toBe(false);
    expect(stripped[0].ref).toBe("TZZ9999999");
  });
});
