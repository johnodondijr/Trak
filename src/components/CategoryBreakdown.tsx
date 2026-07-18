import type { CategoryTotal } from "../lib/analytics";
import { categoryColor, categoryIcon, categoryLabel, kes } from "../lib/format";

/**
 * Spending by category as a horizontal bar list — the right form for comparing
 * magnitudes across a named set. Each bar carries its category color plus a
 * direct label and value (secondary encoding), so identity never rests on
 * color alone.
 */
export function CategoryBreakdown({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return <p className="tx-empty">No spending in this period yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.total));
  return (
    <div className="barlist">
      {data.map((row) => (
        <div className="barrow" key={row.category}>
          <div className="barlabel">
            <span aria-hidden>{categoryIcon(row.category)}</span>
            <span className="name">{categoryLabel(row.category)}</span>
          </div>
          <div className="barvalue">{kes(row.total)}</div>
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
        </div>
      ))}
    </div>
  );
}
