import { useState } from "react";
import type { CategoryTotal } from "../lib/analytics";
import type { Transaction, Category } from "../lib/parser/types";
import { categoryColor, categoryIcon, categoryLabel, kes } from "../lib/format";
import { TxnRow } from "./TxnRow";

const PREVIEW = 5;

/**
 * Spending by category as horizontal bars. Each row is expandable: tapping it
 * drops down the top {@link PREVIEW} transactions in that category, and — when
 * there are more — a "See all" link that opens the full filtered list.
 */
export function CategoryBreakdown({
  data,
  transactions,
  onOpenTxn,
  onSeeAll,
}: {
  data: CategoryTotal[];
  transactions: Transaction[];
  onOpenTxn?: (t: Transaction) => void;
  onSeeAll?: (category: Category) => void;
}) {
  const [open, setOpen] = useState<Category | null>(null);

  if (data.length === 0) {
    return <p className="tx-empty">No spending in this period yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.total));
  const interactive = !!onOpenTxn;

  return (
    <div className="barlist">
      {data.map((row) => {
        const isOpen = open === row.category;
        const items = interactive
          ? transactions
              .filter((t) => t.category === row.category && t.direction === "expense")
              .sort((a, b) => b.date.getTime() - a.date.getTime())
          : [];
        return (
          <div className="drill" key={row.category}>
            <button
              type="button"
              className={`barrow drill-head ${interactive ? "clickable" : ""}`}
              onClick={interactive ? () => setOpen(isOpen ? null : row.category) : undefined}
              aria-expanded={isOpen}
            >
              <div className="barlabel">
                <span aria-hidden>{categoryIcon(row.category)}</span>
                <span className="name">{categoryLabel(row.category)}</span>
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
                    background: categoryColor(row.category),
                  }}
                />
              </div>
              <div className="barsub">
                {Math.round(row.share * 100)}% of spend · {row.count}{" "}
                {row.count === 1 ? "transaction" : "transactions"}
              </div>
            </button>

            {isOpen && (
              <div className="drill-body">
                {items.slice(0, PREVIEW).map((t) => (
                  <TxnRow key={t.ref || t.raw} txn={t} onClick={onOpenTxn} />
                ))}
                {items.length > PREVIEW && (
                  <button className="see-all" onClick={() => onSeeAll?.(row.category)}>
                    See all {items.length} {categoryLabel(row.category)} transactions →
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
