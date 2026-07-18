import type { CounterpartyTotal } from "../lib/analytics";
import { kes } from "../lib/format";

/**
 * The people and businesses the user sends the most money to, ranked by total.
 * A single-series magnitude comparison, so one series color (blue slot 1) with
 * direct value labels — no legend needed.
 */
export function TopRecipients({ data }: { data: CounterpartyTotal[] }) {
  if (data.length === 0) {
    return <p className="tx-empty">No outgoing payments yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.total));
  return (
    <div className="barlist">
      {data.map((row) => (
        <div className="barrow" key={row.name}>
          <div className="barlabel">
            <span className="name">{row.name}</span>
          </div>
          <div className="barvalue">{kes(row.total)}</div>
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
        </div>
      ))}
    </div>
  );
}
