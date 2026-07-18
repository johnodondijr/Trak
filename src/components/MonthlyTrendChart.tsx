import { useState } from "react";
import type { MonthlyPoint } from "../lib/analytics";
import { kes } from "../lib/format";

/**
 * Income-vs-expense per month as grouped vertical bars on a single shared
 * value axis (never a dual axis). Income uses the success green, expense the
 * critical red — both carried by a labeled legend so meaning is never on color
 * alone. Hovering a month reveals a tooltip with the exact figures.
 */
export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="tx-empty">No monthly data yet.</p>;
  }

  const width = 640;
  const height = 240;
  const pad = { top: 16, right: 12, bottom: 34, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  // Round the axis maximum up to a "nice" number.
  const niceMax = niceCeil(max);
  const y = (v: number) => pad.top + plotH - (v / niceMax) * plotH;

  const groupW = plotW / data.length;
  const barW = Math.min(26, (groupW - 10) / 2);
  const gap = 4;

  const ticks = 4;
  const gridValues = Array.from({ length: ticks + 1 }, (_, i) => (niceMax / ticks) * i);

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Monthly income versus expense"
        style={{ display: "block" }}
      >
        {/* gridlines + y labels */}
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            <text
              x={pad.left - 8}
              y={y(v) + 3.5}
              textAnchor="end"
              fontSize={10.5}
              fill="var(--muted)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {compact(v)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const gx = pad.left + i * groupW;
          const cx = gx + groupW / 2;
          const incomeX = cx - barW - gap / 2;
          const expenseX = cx + gap / 2;
          const active = hover === i;
          return (
            <g key={d.label}>
              {/* hover hit area */}
              <rect
                x={gx}
                y={pad.top}
                width={groupW}
                height={plotH}
                fill={active ? "var(--surface-2)" : "transparent"}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              <rect
                x={incomeX}
                y={y(d.income)}
                width={barW}
                height={Math.max(0, pad.top + plotH - y(d.income))}
                rx={4}
                fill="var(--income)"
                pointerEvents="none"
              />
              <rect
                x={expenseX}
                y={y(d.expense)}
                width={barW}
                height={Math.max(0, pad.top + plotH - y(d.expense))}
                rx={4}
                fill="var(--expense)"
                pointerEvents="none"
              />
              <text
                x={cx}
                y={height - 12}
                textAnchor="middle"
                fontSize={11}
                fill="var(--muted)"
                pointerEvents="none"
              >
                {d.label.replace(/ \d{4}$/, "")}
              </text>
            </g>
          );
        })}

        {/* baseline */}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + plotH}
          y2={pad.top + plotH}
          stroke="var(--baseline)"
          strokeWidth={1}
        />
      </svg>

      {hover !== null && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12.5,
              minWidth: 150,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{data[hover].label}</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "var(--income)" }}>Income</span>
              <strong>{kes(data[hover].income)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "var(--expense)" }}>Spent</span>
              <strong>{kes(data[hover].expense)}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="legend" style={{ marginTop: 10, justifyContent: "center" }}>
        <span>
          <i className="dot" style={{ background: "var(--income)" }} /> Income
        </span>
        <span>
          <i className="dot" style={{ background: "var(--expense)" }} /> Spent
        </span>
      </div>
    </div>
  );
}

/** Round up to a visually tidy axis maximum (1, 2, 2.5, 5 × 10ⁿ). */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

/** Compact axis labels: 12,000 → "12k". */
function compact(v: number): string {
  if (v >= 1_000_000) return `${round1(v / 1_000_000)}M`;
  if (v >= 1_000) return `${round1(v / 1_000)}k`;
  return String(Math.round(v));
}
function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
