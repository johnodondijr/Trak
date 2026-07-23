import { useMemo, useState } from "react";
import { totals } from "../lib/analytics";
import type { Transaction } from "../lib/parser/types";
import { kes } from "../lib/format";
import { IconArrowUp, IconArrowDown } from "./icons";
import { AnalyticsChart, type AnalyticsPoint } from "./AnalyticsChart";
import { TxnRow } from "./TxnRow";

type Mode = "income" | "expenses";
type Period = "last7" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  last7: "Last 7 days",
  month: "Month",
  year: "Year",
};

export function StatsScreen({
  transactions,
  now = new Date(),
  onOpenTxn,
}: {
  transactions: Transaction[];
  now?: Date;
  onOpenTxn: (t: Transaction) => void;
}) {
  const [mode, setMode] = useState<Mode>("expenses");
  const [period, setPeriod] = useState<Period>("month");
  const isIncome = mode === "income";

  const availableMonths = useMemo(() => monthOptions(transactions), [transactions]);
  const availableYears = useMemo(() => yearOptions(transactions), [transactions]);
  const currentMonth = monthKey(now);
  const currentYear = String(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const activeMonth = availableMonths.some((m) => m.value === selectedMonth)
    ? selectedMonth
    : availableMonths[0]?.value ?? currentMonth;
  const activeYear = availableYears.includes(selectedYear) ? selectedYear : availableYears[0] ?? currentYear;
  const monthChoices = availableMonths.length > 0 ? availableMonths : [{ value: currentMonth, label: labelForMonth(currentMonth) }];
  const yearChoices = availableYears.length > 0 ? availableYears : [currentYear];

  const currentRange = useMemo(
    () => rangeFor(period, activeMonth, activeYear, now),
    [period, activeMonth, activeYear, now],
  );
  const previousRange = useMemo(
    () => previousRangeFor(period, currentRange),
    [period, currentRange],
  );
  const currentTxns = useMemo(
    () => transactions.filter((t) => inRange(t, currentRange)),
    [transactions, currentRange],
  );
  const previousTxns = useMemo(
    () => transactions.filter((t) => inRange(t, previousRange)),
    [transactions, previousRange],
  );
  const currentTotals = useMemo(() => totals(currentTxns), [currentTxns]);
  const previousTotals = useMemo(() => totals(previousTxns), [previousTxns]);
  const currentValue = isIncome ? currentTotals.income : currentTotals.expense + currentTotals.charges;
  const previousValue = isIncome ? previousTotals.income : previousTotals.expense + previousTotals.charges;
  const pct = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

  const points = useMemo(
    () => chartPoints(currentTxns, period, currentRange, isIncome),
    [currentTxns, period, currentRange, isIncome],
  );
  const recent = useMemo(
    () =>
      currentTxns
        .filter((t) => (isIncome ? t.direction === "income" : t.direction === "expense"))
        .slice(0, 6),
    [currentTxns, isIncome],
  );

  const up = pct >= 0;
  const deltaGood = isIncome ? up : !up;
  const rangeLabel = period === "month" ? labelForMonth(activeMonth) : period === "year" ? activeYear : "Last 7 days";

  return (
    <div className="stats">
      <div className="stats-head">
        <div className="stats-label">{rangeLabel} {isIncome ? "income" : "spending"}</div>
        <div className="stats-total-row">
          <div className="stats-total">{kes(currentValue)}</div>
          {previousValue > 0 && (
            <span className={`stats-delta ${deltaGood ? "pos" : "neg"}`}>
              {up ? <IconArrowUp size={13} /> : <IconArrowDown size={13} />}
              {up ? "+" : "-"}{Math.abs(Math.round(pct))}%{" "}
              <span className="stats-delta-sub">vs previous {period === "last7" ? "7 days" : period}</span>
            </span>
          )}
        </div>
      </div>

      <div className="stats-toggle">
        <button aria-pressed={mode === "income"} onClick={() => setMode("income")}>
          Income
        </button>
        <button aria-pressed={mode === "expenses"} onClick={() => setMode("expenses")}>
          Expenses
        </button>
      </div>

      <div className="stats-period">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {period !== "last7" && (
        <div className="stats-select-row">
          {period === "month" && (
            <select value={activeMonth} onChange={(e) => setSelectedMonth(e.target.value)} aria-label="Month">
              {monthChoices.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          {period === "year" && (
            <select value={activeYear} onChange={(e) => setSelectedYear(e.target.value)} aria-label="Year">
              {yearChoices.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="analytics-card">
        <div className="analytics-card-head">
          <div>
            <div className="analytics-card-title">Transaction Analytics</div>
            <div className="analytics-card-sub">{rangeLabel} {isIncome ? "income" : "spending"}</div>
          </div>
          <div className="analytics-card-total">{kes(currentValue)}</div>
        </div>
        <AnalyticsChart data={points} />
      </div>

      <div className="section-head" style={{ marginTop: 20 }}>
        <h2>Recent {isIncome ? "income" : "spending"}</h2>
      </div>
      <div className="flat-panel">
        {recent.length === 0 ? (
          <div className="tx-empty">Nothing here yet.</div>
        ) : (
          recent.map((t) => <TxnRow key={t.ref || t.raw} txn={t} onClick={onOpenTxn} />)
        )}
      </div>
    </div>
  );
}

type TimeRange = { start: Date; end: Date };

function inRange(txn: Transaction, range: TimeRange): boolean {
  const time = txn.date.getTime();
  return time >= range.start.getTime() && time < range.end.getTime();
}

function rangeFor(period: Period, month: string, year: string, now: Date): TimeRange {
  if (period === "last7") {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === "year") {
    const y = Number(year);
    return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

function previousRangeFor(period: Period, current: TimeRange): TimeRange {
  const start = new Date(current.start);
  const end = new Date(current.start);
  if (period === "last7") {
    start.setDate(start.getDate() - 7);
  } else if (period === "year") {
    start.setFullYear(start.getFullYear() - 1);
  } else {
    start.setMonth(start.getMonth() - 1);
  }
  return { start, end };
}

function chartPoints(txns: Transaction[], period: Period, range: TimeRange, isIncome: boolean): AnalyticsPoint[] {
  const buckets = new Map<string, number>();
  const add = (label: string, txn?: Transaction) => {
    if (txn) {
      if (isIncome && txn.direction !== "income") return;
      if (!isIncome && txn.direction !== "expense") return;
    }
    const value = txn ? (isIncome ? txn.amount : txn.amount + txn.cost) : 0;
    buckets.set(label, (buckets.get(label) ?? 0) + value);
  };

  if (period === "year") {
    const fmt = new Intl.DateTimeFormat("en-KE", { month: "short" });
    for (let m = 0; m < 12; m++) add(fmt.format(new Date(range.start.getFullYear(), m, 1)));
    for (const txn of txns) add(fmt.format(txn.date), txn);
  } else {
    const fmt = new Intl.DateTimeFormat("en-KE", { day: "2-digit", month: "short" });
    const cursor = new Date(range.start);
    while (cursor.getTime() < range.end.getTime()) {
      add(fmt.format(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const txn of txns) add(fmt.format(txn.date), txn);
  }

  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}

function monthOptions(txns: Transaction[]): Array<{ value: string; label: string }> {
  const keys = new Set(txns.map((t) => monthKey(t.date)));
  return [...keys]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: labelForMonth(value) }));
}

function yearOptions(txns: Transaction[]): string[] {
  return [...new Set(txns.map((t) => String(t.date.getFullYear())))]
    .sort((a, b) => Number(b) - Number(a));
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function labelForMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}
