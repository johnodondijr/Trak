/**
 * Analytics over a set of parsed transactions.
 *
 * Everything here is pure: given a `Transaction[]` (and optionally a reference
 * "now"), it returns plain data the dashboard renders. Keeping it framework-
 * free makes it trivial to unit-test the money math.
 */
import type { Transaction, Category } from "./parser/types";

export interface Totals {
  income: number;
  expense: number;
  charges: number;
  net: number;
  count: number;
}

export interface PeriodSummary {
  today: Totals;
  week: Totals;
  month: Totals;
  all: Totals;
}

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
  /** Share of total expense, 0–1. */
  share: number;
}

export interface CounterpartyTotal {
  name: string;
  total: number;
  count: number;
}

export interface MonthlyPoint {
  /** First day of the month, for sorting/formatting. */
  month: Date;
  /** "Jul 2026" style label. */
  label: string;
  income: number;
  expense: number;
  net: number;
}

/** Transaction types that represent real spending (money leaving the wallet). */
const SPEND_TYPES = new Set(["send", "till", "paybill", "airtime", "withdraw"]);

export interface BalanceSnapshot {
  amount: number;
  date: Date;
  provider: Transaction["provider"];
}

/**
 * The most recent wallet balance Trak knows about — taken from the newest
 * transaction that reported a "New balance is …" figure. Powers the hero card.
 */
export function latestBalance(txns: Transaction[]): BalanceSnapshot | null {
  let best: BalanceSnapshot | null = null;
  for (const t of txns) {
    if (t.balance == null) continue;
    if (!best || t.date.getTime() > best.date.getTime()) {
      best = { amount: t.balance, date: t.date, provider: t.provider };
    }
  }
  return best;
}

/** Sum the money-movement figures for a slice of transactions. */
export function totals(txns: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  let charges = 0;
  for (const t of txns) {
    charges += t.cost;
    if (t.direction === "income") income += t.amount;
    else if (t.direction === "expense") expense += t.amount;
  }
  // Charges are money out too, so they count against the net balance.
  return {
    income,
    expense,
    charges,
    net: income - expense - charges,
    count: txns.length,
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Monday-based start of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Bucket transactions into today / this-week / this-month / all-time totals,
 * relative to `now` (defaults to the real current time).
 */
export function summarize(txns: Transaction[], now: Date = new Date()): PeriodSummary {
  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  const inRange = (from: number) =>
    txns.filter((t) => t.date.getTime() >= from && t.date.getTime() <= now.getTime());

  return {
    today: totals(inRange(dayStart)),
    week: totals(inRange(weekStart)),
    month: totals(inRange(monthStart)),
    all: totals(txns),
  };
}

/**
 * Break expense down by spending category, largest first. Income, deposits and
 * balance/failed rows are excluded so this reflects money actually spent.
 */
export function byCategory(txns: Transaction[]): CategoryTotal[] {
  const map = new Map<Category, { total: number; count: number }>();
  let grand = 0;
  for (const t of txns) {
    if (t.direction !== "expense") continue;
    const entry = map.get(t.category) ?? { total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    map.set(t.category, entry);
    grand += t.amount;
  }
  const result: CategoryTotal[] = [];
  for (const [category, { total, count }] of map) {
    result.push({ category, total, count, share: grand > 0 ? total / grand : 0 });
  }
  result.sort((a, b) => b.total - a.total);
  return result;
}

/**
 * Rank the people/businesses the user sends the most money to. Only outgoing
 * person/till/paybill transfers are considered (not agents or airtime).
 */
export function topCounterparties(txns: Transaction[], limit = 5): CounterpartyTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of txns) {
    if (t.direction !== "expense") continue;
    if (!SPEND_TYPES.has(t.type)) continue;
    if (t.type === "airtime" || t.type === "withdraw") continue;
    const name = t.counterparty?.trim();
    if (!name) continue;
    const entry = map.get(name) ?? { total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    map.set(name, entry);
  }
  return [...map.entries()]
    .map(([name, { total, count }]) => ({ name, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/**
 * Income vs expense per calendar month, oldest first, ready for a trend chart.
 * Includes empty months between the first and last transaction so the line
 * doesn't skip gaps.
 */
export function monthlyTrend(txns: Transaction[]): MonthlyPoint[] {
  if (txns.length === 0) return [];
  const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());
  const first = startOfMonth(sorted[0].date);
  const last = startOfMonth(sorted[sorted.length - 1].date);

  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const buckets = new Map<string, { income: number; expense: number }>();
  for (const t of sorted) {
    const k = key(t.date);
    const entry = buckets.get(k) ?? { income: 0, expense: 0 };
    if (t.direction === "income") entry.income += t.amount;
    else if (t.direction === "expense") entry.expense += t.amount + t.cost;
    buckets.set(k, entry);
  }

  const points: MonthlyPoint[] = [];
  const cursor = new Date(first);
  const fmt = new Intl.DateTimeFormat("en-KE", { month: "short", year: "numeric" });
  while (cursor.getTime() <= last.getTime()) {
    const k = key(cursor);
    const entry = buckets.get(k) ?? { income: 0, expense: 0 };
    points.push({
      month: new Date(cursor),
      label: fmt.format(cursor),
      income: entry.income,
      expense: entry.expense,
      net: entry.income - entry.expense,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points;
}

/**
 * A plain-language spending insight, e.g. biggest category, month-on-month
 * change, or a heads-up about charges. Returns a short list the UI can show.
 */
export interface Insight {
  tone: "info" | "warn" | "good";
  text: string;
}

export function insights(txns: Transaction[], now: Date = new Date()): Insight[] {
  const out: Insight[] = [];
  if (txns.length === 0) return out;

  const cats = byCategory(txns);
  if (cats.length > 0 && cats[0].share > 0) {
    out.push({
      tone: "info",
      text: `Your biggest spending category is ${labelForCategory(cats[0].category)} at ${Math.round(
        cats[0].share * 100,
      )}% of total spend.`,
    });
  }

  const trend = monthlyTrend(txns);
  if (trend.length >= 2) {
    const prev = trend[trend.length - 2];
    const curr = trend[trend.length - 1];
    if (prev.expense > 0) {
      const change = (curr.expense - prev.expense) / prev.expense;
      const pct = Math.round(Math.abs(change) * 100);
      if (change > 0.05) {
        out.push({
          tone: "warn",
          text: `Spending is up ${pct}% vs ${prev.label} — watch out for overspending.`,
        });
      } else if (change < -0.05) {
        out.push({
          tone: "good",
          text: `Spending is down ${pct}% vs ${prev.label}. Nice work.`,
        });
      }
    }
  }

  const all = totals(txns);
  if (all.charges > 0) {
    const pctOfSpend = all.expense > 0 ? Math.round((all.charges / all.expense) * 100) : 0;
    out.push({
      tone: pctOfSpend >= 3 ? "warn" : "info",
      text: `You've paid ${formatKes(all.charges)} in transaction charges${
        pctOfSpend > 0 ? ` (${pctOfSpend}% of what you spent)` : ""
      }.`,
    });
  }

  const summary = summarize(txns, now);
  if (summary.month.income > 0 || summary.month.expense > 0) {
    out.push({
      tone: summary.month.net >= 0 ? "good" : "warn",
      text: `This month: ${formatKes(summary.month.income)} in, ${formatKes(
        summary.month.expense + summary.month.charges,
      )} out.`,
    });
  }

  return out;
}

// --- tiny local formatters (kept here so analytics has no UI dependency) ---

const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food & Dining",
  transport: "Transport",
  shopping: "Shopping",
  bills: "Bills & Utilities",
  airtime: "Airtime & Data",
  entertainment: "Entertainment",
  business: "Business",
  transfers: "Transfers",
  withdrawal: "Cash Withdrawals",
  deposit: "Deposits",
  charges: "Charges",
  income: "Income",
  fuliza: "Fuliza",
  other: "Other",
};

export function labelForCategory(c: Category): string {
  return CATEGORY_LABELS[c] ?? c;
}

export function formatKes(n: number): string {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}
