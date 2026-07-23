import type { CategoryTotal } from "../lib/analytics";
import type { Category } from "../lib/parser/types";
import { categoryColor, categoryLabel } from "../lib/format";

const MAX_SLICES = 6;

/**
 * A donut/progress ring of spending by category — the top {@link MAX_SLICES}
 * categories as arc segments (with a small surface gap between them) plus an
 * "Other" remainder, the total spent in the center, and a labeled legend so
 * identity never rests on color alone.
 */
export function CategoryDonut({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return <p className="tx-empty">No spending to chart yet.</p>;
  }

  const total = data.reduce((s, d) => s + d.total, 0);
  const totalAmount = Math.round(total).toLocaleString("en-KE");
  const top = data.slice(0, MAX_SLICES);
  const restTotal = data.slice(MAX_SLICES).reduce((s, d) => s + d.total, 0);
  const slices: { key: string; label: string; color: string; value: number; share: number }[] = top.map(
    (d) => ({
      key: d.category,
      label: categoryLabel(d.category),
      color: categoryColor(d.category),
      value: d.total,
      share: total > 0 ? d.total / total : 0,
    }),
  );
  if (restTotal > 0) {
    slices.push({
      key: "other",
      label: "Other",
      color: categoryColor("other" as Category),
      value: restTotal,
      share: total > 0 ? restTotal / total : 0,
    });
  }

  const r = 66;
  const C = 2 * Math.PI * r;
  const gap = 3;
  let acc = 0;

  return (
    <div className="donut">
      <div className="donut-ring">
        <svg viewBox="0 0 180 180" width="150" height="150">
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="20" />
          {slices.map((s) => {
            const len = s.share * C;
            const dash = Math.max(0.5, len - gap);
            const el = (
              <circle
                key={s.key}
                cx="90"
                cy="90"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="20"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-acc}
                transform="rotate(-90 90 90)"
              />
            );
            acc += len;
            return el;
          })}
          <text x="90" y="79" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--muted)">
            Spent
          </text>
          <text x="90" y="96" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--text-primary)">
            KES
          </text>
          <text
            x="90"
            y="114"
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="var(--text-primary)"
            textLength="74"
            lengthAdjust="spacingAndGlyphs"
          >
            {totalAmount}
          </text>
        </svg>
      </div>
      <div className="donut-legend">
        {slices.map((s) => (
          <div className="donut-legend-row" key={s.key}>
            <span className="donut-legend-name">
              <i className="dot" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="donut-legend-val">{Math.round(s.share * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
