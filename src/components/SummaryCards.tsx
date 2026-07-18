import type { Totals } from "../lib/analytics";
import { kes } from "../lib/format";

/**
 * Four headline stat tiles for the selected period: money in, money out,
 * transaction charges, and net flow. These are hero numbers, not charts —
 * magnitude the user reads at a glance.
 */
export function SummaryCards({ totals, rangeLabel }: { totals: Totals; rangeLabel: string }) {
  const spent = totals.expense + totals.charges;
  return (
    <div className="grid cards">
      <Tile
        label="Money in"
        dot="var(--income)"
        value={kes(totals.income)}
        meta={`${rangeLabel} · ${totals.count} transactions`}
        valueClass="pos"
      />
      <Tile
        label="Money out"
        dot="var(--expense)"
        value={kes(spent)}
        meta={`incl. ${kes(totals.charges)} charges`}
        valueClass="neg"
      />
      <Tile
        label="Transaction charges"
        dot="var(--muted)"
        value={kes(totals.charges)}
        meta="fees paid to the network"
      />
      <Tile
        label="Net flow"
        dot={totals.net >= 0 ? "var(--income)" : "var(--expense)"}
        value={`${totals.net < 0 ? "−" : ""}${kes(Math.abs(totals.net))}`}
        meta={totals.net >= 0 ? "you saved money" : "you spent more than you received"}
        valueClass={totals.net >= 0 ? "pos" : "neg"}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  meta,
  dot,
  valueClass,
}: {
  label: string;
  value: string;
  meta: string;
  dot: string;
  valueClass?: string;
}) {
  return (
    <div className="card stat">
      <div className="stat-label">
        <i className="dot" style={{ background: dot }} />
        {label}
      </div>
      <div className={`stat-value ${valueClass ?? ""}`}>{value}</div>
      <div className="stat-meta">{meta}</div>
    </div>
  );
}
