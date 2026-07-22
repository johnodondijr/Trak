import { useState } from "react";
import type { MonthlyPoint } from "../lib/analytics";
import { kes } from "../lib/format";

/**
 * Income-vs-spending over months as a smooth area/line chart: spending is a
 * gradient-filled curve, income a second line, both on one shared value axis.
 * Hovering a month raises a crosshair, dots and a tooltip. A single labeled
 * legend carries the two series so meaning never rests on color alone.
 */
export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="tx-empty">No monthly data yet.</p>;
  }

  const W = 640;
  const H = 232;
  const pad = { t: 16, r: 16, b: 30, l: 16 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const n = data.length;

  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const niceMax = niceCeil(max);
  const x = (i: number) => (n === 1 ? pad.l + plotW / 2 : pad.l + (i / (n - 1)) * plotW);
  const y = (v: number) => pad.t + plotH - (v / niceMax) * plotH;

  const spendPts = data.map((d, i) => ({ x: x(i), y: y(d.expense) }));
  const incomePts = data.map((d, i) => ({ x: x(i), y: y(d.income) }));
  const spendLine = smoothPath(spendPts);
  const incomeLine = smoothPath(incomePts);
  const baseY = pad.t + plotH;
  const area = `${spendLine} L ${x(n - 1)} ${baseY} L ${x(0)} ${baseY} Z`;

  const ticks = 3;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => (niceMax / ticks) * i);

  return (
    <div className="trend">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Monthly income versus spending">
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--expense)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--expense)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridVals.map((v) => (
          <line
            key={v}
            x1={pad.l}
            x2={W - pad.r}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--grid)"
            strokeWidth={1}
          />
        ))}

        {n > 1 && <path d={area} fill="url(#spendFill)" />}
        {n > 1 && <path d={incomeLine} fill="none" stroke="var(--income)" strokeWidth={2.4} strokeLinecap="round" />}
        {n > 1 && <path d={spendLine} fill="none" stroke="var(--expense)" strokeWidth={2.4} strokeLinecap="round" />}

        {/* single-point fallback */}
        {n === 1 && (
          <>
            <circle cx={x(0)} cy={y(data[0].income)} r={4} fill="var(--income)" />
            <circle cx={x(0)} cy={y(data[0].expense)} r={4} fill="var(--expense)" />
          </>
        )}

        {/* crosshair + dots on hover */}
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={baseY} stroke="var(--baseline)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].income)} r={4.5} fill="var(--income)" stroke="var(--surface-1)" strokeWidth={2} />
            <circle cx={x(hover)} cy={y(data[hover].expense)} r={4.5} fill="var(--expense)" stroke="var(--surface-1)" strokeWidth={2} />
          </>
        )}

        {/* x labels */}
        {data.map((d, i) => (
          <text key={d.label} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--muted)">
            {d.label.replace(/ \d{4}$/, "")}
          </text>
        ))}

        {/* hover hit areas */}
        {data.map((_, i) => (
          <rect
            key={i}
            x={n === 1 ? pad.l : x(i) - plotW / (n - 1) / 2}
            y={pad.t}
            width={n === 1 ? plotW : plotW / (n - 1)}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover !== null && (
        <div className="trend-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <div className="trend-tip-title">{data[hover].label}</div>
          <div className="trend-tip-row">
            <span><i className="dot" style={{ background: "var(--income)" }} /> In</span>
            <strong>{kes(data[hover].income)}</strong>
          </div>
          <div className="trend-tip-row">
            <span><i className="dot" style={{ background: "var(--expense)" }} /> Spent</span>
            <strong>{kes(data[hover].expense)}</strong>
          </div>
        </div>
      )}

      <div className="legend" style={{ marginTop: 8 }}>
        <span><i className="dot" style={{ background: "var(--income)" }} /> Income</span>
        <span><i className="dot" style={{ background: "var(--expense)" }} /> Spent</span>
      </div>
    </div>
  );
}

/** Catmull-Rom → cubic Bézier smoothing for a pleasant curve. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}
