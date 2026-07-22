/**
 * A small hand-built line-icon set (Lucide-ish: 24px grid, 2px round strokes,
 * currentColor). Replacing emoji with these is the single biggest step from
 * "AI slop" to a premium, consistent look.
 */
import type { ReactNode } from "react";
import type { Category } from "../lib/parser/types";

function Svg({
  children,
  size = 24,
  sw = 2,
  fill = "none",
}: {
  children: ReactNode;
  size?: number;
  sw?: number;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number };

/* ---- UI / nav icons ---- */
export const IconHome = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 10v10h14V10" />
    <path d="M9.5 20v-5.5h5V20" />
  </Svg>
);
export const IconActivity = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </Svg>
);
export const IconTrends = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="m3 16 5-5 4 4 9-9" />
    <path d="M16 6h5v5" />
  </Svg>
);
export const IconPlus = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMoon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
  </Svg>
);
export const IconSun = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);
export const IconBell = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
);
export const IconEye = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const IconEyeOff = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3 3.6M6.6 6.6A13.2 13.2 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4-.8" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </Svg>
);
export const IconUpload = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    <path d="M12 15V3M7 8l5-5 5 5" />
  </Svg>
);
export const IconSpinner = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Svg>
);
export const IconChevron = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const IconCheck = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </Svg>
);
export const IconAlert = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
);
export const IconBulb = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
  </Svg>
);
export const IconArrowUpRight = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Svg>
);
export const IconArrowDownLeft = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M17 7 7 17M16 17H7V8" />
  </Svg>
);
export const IconArrowUp = ({ size = 16 }: IconProps) => (
  <Svg size={size} sw={2.4}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
);
export const IconArrowDown = ({ size = 16 }: IconProps) => (
  <Svg size={size} sw={2.4}>
    <path d="M12 5v14M18 13l-6 6-6-6" />
  </Svg>
);

/* ---- Category glyphs ---- */
const IconFood = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M4 3v6a2 2 0 0 0 4 0V3M6 11v10" />
    <path d="M18 3c-1.7 0-3 2-3 5s1 4 3 4v9" />
  </Svg>
);
const IconTransport = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M5 12.5 6.4 8a2 2 0 0 1 1.9-1.4h7.4A2 2 0 0 1 17.6 8L19 12.5" />
    <path d="M4 12.5h16V17H4z" />
    <path d="M7.5 20v-3M16.5 20v-3" />
  </Svg>
);
const IconShopping = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M6 2 3.5 6.5V20a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V6.5L18 2Z" />
    <path d="M3.5 6.5h17" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </Svg>
);
const IconBills = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M6 2h8l4 4v16H6z" />
    <path d="M14 2v4h4" />
    <path d="M9 13h6M9 17h4" />
  </Svg>
);
const IconAirtime = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="7" y="2" width="10" height="20" rx="2.5" />
    <path d="M11 18h2" />
  </Svg>
);
const IconEntertainment = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="m10 8.5 5.5 3.5L10 15.5Z" fill="currentColor" stroke="none" />
  </Svg>
);
const IconBusiness = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5.5A2 2 0 0 1 10 3.5h4a2 2 0 0 1 2 2V7" />
    <path d="M3 12.5h18" />
  </Svg>
);
const IconWithdrawal = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </Svg>
);
const IconBank = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M3 10 12 4l9 6" />
    <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
    <path d="M3 20.5h18" />
  </Svg>
);
const IconCharges = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M19 5 5 19" />
    <circle cx="7.5" cy="7.5" r="2.2" />
    <circle cx="16.5" cy="16.5" r="2.2" />
  </Svg>
);
const IconCard = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <path d="M2 10h20" />
  </Svg>
);
const IconOther = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
);

const CATEGORY_GLYPHS: Record<Category, (p: IconProps) => JSX.Element> = {
  food: IconFood,
  transport: IconTransport,
  shopping: IconShopping,
  bills: IconBills,
  airtime: IconAirtime,
  entertainment: IconEntertainment,
  business: IconBusiness,
  transfers: IconArrowUpRight,
  withdrawal: IconWithdrawal,
  deposit: IconBank,
  charges: IconCharges,
  income: IconArrowDownLeft,
  fuliza: IconCard,
  other: IconOther,
};

/** Render a category's line icon. */
export function CategoryGlyph({ category, size = 20 }: { category: Category; size?: number }) {
  const Glyph = CATEGORY_GLYPHS[category] ?? IconOther;
  return <Glyph size={size} />;
}
