import { describe, it, expect } from "vitest";
import { parseMessages } from "./parser/index";
import {
  totals,
  summarize,
  byCategory,
  topCounterparties,
  monthlyTrend,
  spendingTrend,
  insights,
} from "./analytics";
import type { Transaction } from "./parser/types";
import { SAMPLE_MESSAGES } from "../data/sampleMessages";

const { transactions } = parseMessages(SAMPLE_MESSAGES);

describe("sample data sanity", () => {
  it("parses the whole sample without leaving unparsed messages", () => {
    const { unparsed } = parseMessages(SAMPLE_MESSAGES);
    expect(unparsed).toHaveLength(0);
    expect(transactions.length).toBeGreaterThan(15);
  });
});

describe("totals", () => {
  it("separates income, expense and charges", () => {
    const t = totals(transactions);
    expect(t.income).toBeGreaterThan(0);
    expect(t.expense).toBeGreaterThan(0);
    expect(t.charges).toBeGreaterThan(0);
    // net = income - expense - charges
    expect(t.net).toBeCloseTo(t.income - t.expense - t.charges, 2);
  });

  it("counts a known receive into income", () => {
    const only = transactions.filter((x) => x.ref === "TFB2L3M4N5");
    expect(totals(only).income).toBe(15000);
  });
});

describe("byCategory", () => {
  it("ranks categories by spend, largest first, with shares summing to ~1", () => {
    const cats = byCategory(transactions);
    expect(cats.length).toBeGreaterThan(0);
    for (let i = 1; i < cats.length; i++) {
      expect(cats[i - 1].total).toBeGreaterThanOrEqual(cats[i].total);
    }
    const shareSum = cats.reduce((s, c) => s + c.share, 0);
    expect(shareSum).toBeCloseTo(1, 5);
  });

  it("excludes income from category spend", () => {
    const cats = byCategory(transactions);
    expect(cats.find((c) => c.category === "income")).toBeUndefined();
  });
});

describe("topCounterparties", () => {
  it("ranks outgoing recipients and ignores airtime/withdrawals", () => {
    const top = topCounterparties(transactions, 5);
    expect(top.length).toBeGreaterThan(0);
    expect(top.some((c) => c.name === "Airtime")).toBe(false);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].total).toBeGreaterThanOrEqual(top[i].total);
    }
  });
});

describe("monthlyTrend", () => {
  it("produces contiguous months oldest-first", () => {
    const trend = monthlyTrend(transactions);
    expect(trend.length).toBeGreaterThanOrEqual(2); // sample spans June & July
    for (let i = 1; i < trend.length; i++) {
      expect(trend[i].month.getTime()).toBeGreaterThan(trend[i - 1].month.getTime());
    }
  });
});

describe("spendingTrend", () => {
  const mkTxn = (date: Date, expense: number): Transaction => ({
    ref: `r${date.getTime()}-${expense}`,
    provider: "mpesa",
    type: "send",
    direction: "expense",
    amount: expense,
    cost: 0,
    balance: null,
    counterparty: null,
    account: null,
    date,
    category: "other",
    raw: "",
  });

  it("buckets by week (not month) when data spans only a couple of months", () => {
    // ~7 weeks of data across June–July: monthly would give 2 flat points.
    const txns = [
      mkTxn(new Date(2026, 5, 1), 100),
      mkTxn(new Date(2026, 5, 15), 200),
      mkTxn(new Date(2026, 5, 29), 300),
      mkTxn(new Date(2026, 6, 6), 400),
      mkTxn(new Date(2026, 6, 20), 500),
    ];
    const trend = spendingTrend(txns);
    // Far more points than the 2 a monthly bucket would yield → a real curve.
    expect(trend.length).toBeGreaterThan(monthlyTrend(txns).length);
    expect(trend.length).toBeGreaterThanOrEqual(6);
    // No spend is lost across buckets.
    const summed = trend.reduce((a, p) => a + p.expense, 0);
    expect(summed).toBe(1500);
  });

  it("buckets by day for a short span and by month for a long one", () => {
    const short = [mkTxn(new Date(2026, 6, 1), 50), mkTxn(new Date(2026, 6, 8), 70)];
    // 7-day span → daily buckets fill every day between → 8 points.
    expect(spendingTrend(short).length).toBe(8);

    const long = [mkTxn(new Date(2026, 0, 1), 50), mkTxn(new Date(2026, 6, 1), 70)];
    // 6-month span → monthly buckets → 7 points (Jan..Jul inclusive).
    expect(spendingTrend(long).length).toBe(7);
  });

  it("returns nothing for no transactions", () => {
    expect(spendingTrend([])).toEqual([]);
  });
});

describe("summarize", () => {
  it("buckets by day/week/month relative to a fixed now", () => {
    const now = new Date(2026, 6, 18); // 18 Jul 2026
    const s = summarize(transactions, now);
    expect(s.all.count).toBe(transactions.length);
    // Month bucket should be a subset of all-time.
    expect(s.month.count).toBeLessThanOrEqual(s.all.count);
    expect(s.week.count).toBeLessThanOrEqual(s.month.count);
  });
});

describe("insights", () => {
  it("produces at least one human-readable insight", () => {
    const out = insights(transactions, new Date(2026, 6, 18));
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].text.length).toBeGreaterThan(0);
  });
});
