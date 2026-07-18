import type { Insight } from "../lib/analytics";

const ICONS: Record<Insight["tone"], string> = {
  good: "✅",
  warn: "⚠️",
  info: "💡",
};

/**
 * Plain-language takeaways derived from the transactions — biggest category,
 * month-on-month change, charges, this-month flow. Status tone drives the icon
 * and left border, so the meaning is carried by icon + text, not color alone.
 */
export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return <p className="tx-empty">Import more messages to unlock insights.</p>;
  }
  return (
    <div className="insights">
      {insights.map((ins, i) => (
        <div className={`insight ${ins.tone}`} key={i}>
          <span className="ico" aria-hidden>
            {ICONS[ins.tone]}
          </span>
          <span>{ins.text}</span>
        </div>
      ))}
    </div>
  );
}
