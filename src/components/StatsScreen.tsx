import { useMemo, useState } from "react";
import type { Transaction } from "../lib/parser/types";
import type { MonthlyPoint, MoMStat } from "../lib/analytics";
import { kes } from "../lib/format";
import { IconArrowUp, IconArrowDown } from "./icons";
import { AnalyticsChart, type AnalyticsPoint } from "./AnalyticsChart";
import { TxnRow } from "./TxnRow";

type Mode = "income" | "expenses";

/**
 * FastPay-style Statistics screen: an Income / Expenses toggle, the selected
 * total with a "vs last month" delta, a dark analytics chart (yellow curve),
 * and a recent list for the selected direction.
 */
export function StatsScreen({
  transactions,
  trend,
  mom,
  onOpenTxn,
}: {
  transactions: Transaction[];
  trend: MonthlyPoint[];
  mom: { income: MoMStat; expense: MoMStat };
  onOpenTxn: (t: Transaction) => void;
}) {
  const [mode, setMode] = useState<Mode>("expenses");
  const isIncome = mode === "income";
  const stat = isIncome ? mom.income : mom.expense;

  const points: AnalyticsPoint[] = useMemo(
    () =>
      trend.map((p) => ({
        label: p.label.replace(/ \d{4}$/, ""),
        value: isIncome ? p.income : p.expense,
      })),
    [trend, isIncome],
  );

  const recent = useMemo(
    () =>
      transactions
        .filter((t) => (isIncome ? t.direction === "income" : t.direction === "expense"))
        .slice(0, 6),
    [transactions, isIncome],
  );

  const up = stat.pct >= 0;
  const pctText = `${up ? "+" : "−"}${Math.abs(Math.round(stat.pct))}%`;
  // For spending, an increase is "bad" (red); for income, up is "good" (green).
  const deltaGood = isIncome ? up : !up;

  return (
    <div className="stats">
      <div className="stats-head">
        <div className="stats-label">Total {isIncome ? "income" : "spending"}</div>
        <div className="stats-total-row">
          <div className="stats-total">{kes(stat.current)}</div>
          {stat.previous > 0 && (
            <span className={`stats-delta ${deltaGood ? "pos" : "neg"}`}>
              {up ? <IconArrowUp size={13} /> : <IconArrowDown size={13} />}
              {pctText} <span className="stats-delta-sub">vs last month</span>
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

      <div className="analytics-card">
        <div className="analytics-card-head">
          <div>
            <div className="analytics-card-title">Transaction Analytics</div>
            <div className="analytics-card-sub">Monthly {isIncome ? "income" : "spending"}</div>
          </div>
          <div className="analytics-card-total">{kes(stat.current)}</div>
        </div>
        <AnalyticsChart data={points} />
      </div>

      <div className="section-head" style={{ marginTop: 20 }}>
        <h2>Recent {isIncome ? "income" : "spending"}</h2>
      </div>
      <div className="card" style={{ padding: "4px 12px" }}>
        {recent.length === 0 ? (
          <div className="tx-empty">Nothing here yet.</div>
        ) : (
          recent.map((t) => <TxnRow key={t.ref || t.raw} txn={t} onClick={onOpenTxn} />)
        )}
      </div>
    </div>
  );
}
