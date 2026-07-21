import { useState } from "react";
import type { CounterpartyTotal } from "../lib/analytics";
import type { Transaction } from "../lib/parser/types";
import { kes } from "../lib/format";
import { TxnRow } from "./TxnRow";

const PREVIEW = 5;

/**
 * People/businesses the user sends the most money to. Tapping a recipient drops
 * down the top {@link PREVIEW} payments that make up their total, with a
 * "See all" link to the full filtered list — so a big "KES 1M to Daniel" can be
 * broken back down into the individual transactions.
 */
export function TopRecipients({
  data,
  transactions,
  onOpenTxn,
  onSeeAll,
}: {
  data: CounterpartyTotal[];
  transactions: Transaction[];
  onOpenTxn?: (t: Transaction) => void;
  onSeeAll?: (name: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (data.length === 0) {
    return <p className="tx-empty">No outgoing payments yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.total));
  const interactive = !!onOpenTxn;

  return (
    <div className="barlist">
      {data.map((row) => {
        const isOpen = open === row.name;
        const items = interactive
          ? transactions
              .filter((t) => t.direction === "expense" && t.counterparty === row.name)
              .sort((a, b) => b.date.getTime() - a.date.getTime())
          : [];
        return (
          <div className="drill" key={row.name}>
            <button
              type="button"
              className={`barrow drill-head ${interactive ? "clickable" : ""}`}
              onClick={interactive ? () => setOpen(isOpen ? null : row.name) : undefined}
              aria-expanded={isOpen}
            >
              <div className="barlabel">
                <span className="name">{row.name}</span>
              </div>
              <div className="barvalue">
                {kes(row.total)}
                {interactive && <span className={`chev ${isOpen ? "up" : ""}`}>⌄</span>}
              </div>
              <div className="bartrack">
                <div
                  className="barfill"
                  style={{
                    width: `${Math.max(2, (row.total / max) * 100)}%`,
                    background: "var(--series-1)",
                  }}
                />
              </div>
              <div className="barsub">
                {row.count} {row.count === 1 ? "payment" : "payments"}
              </div>
            </button>

            {isOpen && (
              <div className="drill-body">
                {items.slice(0, PREVIEW).map((t) => (
                  <TxnRow key={t.ref || t.raw} txn={t} onClick={onOpenTxn} />
                ))}
                {items.length > PREVIEW && (
                  <button className="see-all" onClick={() => onSeeAll?.(row.name)}>
                    See all {items.length} payments to {row.name} →
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
