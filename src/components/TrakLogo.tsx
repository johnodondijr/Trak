/**
 * Trak brand mark — a bold geometric "T" with an upward-tilted crossbar that
 * doubles as a rising trend line (fitting a money tracker). Inspired by the
 * FastPay mark's clean, angular, single-color geometry. Uses currentColor so it
 * inverts cleanly on light/dark/yellow surfaces.
 */
export function TrakMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden focusable="false">
      {/* rising crossbar */}
      <rect
        x="6"
        y="8.5"
        width="52"
        height="13.5"
        rx="6.75"
        fill="currentColor"
        transform="rotate(-9 32 15)"
      />
      {/* stem */}
      <rect x="25.25" y="12.5" width="13.5" height="45.5" rx="6.75" fill="currentColor" />
    </svg>
  );
}

/** Full lockup: the mark plus the "Trak" wordmark. */
export function TrakLogo({ size = 26 }: { size?: number }) {
  return (
    <span className="trak-logo">
      <TrakMark size={size} />
      <span className="trak-word" style={{ fontSize: size * 0.86 }}>
        Trak
      </span>
    </span>
  );
}
