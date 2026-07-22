import type { Insight } from "../lib/analytics";
import { IconCheck, IconAlert, IconBulb } from "./icons";

const ICON: Record<Insight["tone"], () => JSX.Element> = {
  good: () => <IconCheck size={17} />,
  warn: () => <IconAlert size={17} />,
  info: () => <IconBulb size={17} />,
};
const TONE_COLOR: Record<Insight["tone"], string> = {
  good: "var(--status-good)",
  warn: "var(--status-warning)",
  info: "var(--series-1)",
};

/**
 * Plain-language takeaways derived from the transactions. Tone drives the icon,
 * left border and icon color, so meaning is carried by icon + text — not color
 * alone.
 */
export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return <p className="tx-empty">Import more messages to unlock insights.</p>;
  }
  return (
    <div className="insights">
      {insights.map((ins, i) => {
        const Glyph = ICON[ins.tone];
        const color = TONE_COLOR[ins.tone];
        return (
          <div className="insight" key={i}>
            <span
              className="insight-chip"
              style={{ color, background: `color-mix(in srgb, ${color} 15%, var(--surface-1))` }}
            >
              <Glyph />
            </span>
            <span className="insight-text">{ins.text}</span>
          </div>
        );
      })}
    </div>
  );
}
