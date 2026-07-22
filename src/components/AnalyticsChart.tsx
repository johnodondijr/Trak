import { useState } from "react";
import { kes } from "../lib/format";

export interface AnalyticsPoint {
  label: string;
  value: number;
}

/**
 * Single-series area/line chart for the Stats screen — a yellow curve with a
 * gradient fill on a dark card, month labels, and a hover tooltip. Mirrors the
 * FastPay "Transaction Analytics" chart.
 */
export function AnalyticsChart({ data }: { data: AnalyticsPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="tx-empty">No data to chart yet.</p>;
  }

  const W = 640;
  const H = 210;
  const pad = { t: 18, r: 14, b: 28, l: 14 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const n = data.length;

  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = niceCeil(max);
  const x = (i: number) => (n === 1 ? pad.l + plotW / 2 : pad.l + (i / (n - 1)) * plotW);
  const y = (v: number) => pad.t + plotH - (v / niceMax) * plotH;
  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const line = smoothPath(pts);
  const baseY = pad.t + plotH;
  const area = `${line} L ${x(n - 1)} ${baseY} L ${x(0)} ${baseY} Z`;

  return (
    <div className="analytics">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Transaction analytics">
        <defs>
          <linearGradient id="anFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d211" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#f5d211" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1={pad.l}
            x2={W - pad.r}
            y1={pad.t + plotH * (1 - f)}
            y2={pad.t + plotH * (1 - f)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        ))}

        {n > 1 && <path d={area} fill="url(#anFill)" />}
        {n > 1 && <path d={line} fill="none" stroke="#f5d211" strokeWidth={2.6} strokeLinecap="round" />}
        {n === 1 && <circle cx={x(0)} cy={y(data[0].value)} r={5} fill="#f5d211" />}

        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.t}
              y2={baseY}
              stroke="rgba(245,210,17,0.5)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill="#f5d211" stroke="#1a1a1e" strokeWidth={2.5} />
          </>
        )}

        {data.map((d, i) => (
          <text key={d.label} x={x(i)} y={H - 9} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.45)">
            {d.label}
          </text>
        ))}

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
        <div className="analytics-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <div className="analytics-tip-label">{data[hover].label}</div>
          <div className="analytics-tip-val">{kes(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}

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
