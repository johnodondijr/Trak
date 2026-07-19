/**
 * Presentation helpers for the UI layer: currency/date formatting and the
 * fixed mapping from spending {@link Category} to a color + icon.
 *
 * Colors come from the validated categorical palette (see the data-viz
 * reference). Each category is assigned a FIXED slot so a category's color
 * never changes between renders or when the set of visible categories changes.
 */
import type { Category, TransactionType } from "./parser/types";

const kesFormatter = new Intl.NumberFormat("en-KE", {
  maximumFractionDigits: 0,
});

/** "KES 1,234" — whole shillings, grouped. */
export function kes(n: number): string {
  return `KES ${kesFormatter.format(Math.round(n))}`;
}

/** "KES 1,234.50" — with cents, for detail rows. */
export function kesPrecise(n: number): string {
  return `KES ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-KE", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(d: Date): string {
  return dateFormatter.format(d);
}
export function formatTime(d: Date): string {
  return timeFormatter.format(d);
}
export function formatDateTime(d: Date): string {
  return `${dateFormatter.format(d)} · ${timeFormatter.format(d)}`;
}

const groupFormatter = new Intl.DateTimeFormat("en-KE", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const groupFormatterWithYear = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Day-level heading for a transaction group: "Today", "Yesterday" or a date. */
export function dateGroupLabel(d: Date, now: Date = new Date()): string {
  const startOfDay = (x: Date) => {
    const y = new Date(x);
    y.setHours(0, 0, 0, 0);
    return y.getTime();
  };
  const today = startOfDay(now);
  const that = startOfDay(d);
  const dayMs = 86_400_000;
  if (that === today) return "Today";
  if (that === today - dayMs) return "Yesterday";
  if (d.getFullYear() === now.getFullYear()) return groupFormatter.format(d);
  return groupFormatterWithYear.format(d);
}

/** Initials for an avatar chip, e.g. "JOHN KAMAU" → "JK", "Naivas" → "NA". */
export function initials(name: string | null | undefined): string {
  if (!name) return "•";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Time-of-day greeting for the header. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food & Dining",
  transport: "Transport",
  shopping: "Shopping",
  bills: "Bills & Utilities",
  airtime: "Airtime & Data",
  entertainment: "Entertainment",
  business: "Business",
  transfers: "Transfers",
  withdrawal: "Cash Withdrawals",
  deposit: "Deposits",
  charges: "Charges",
  income: "Income",
  fuliza: "Fuliza",
  other: "Other",
};

export function categoryLabel(c: Category): string {
  return CATEGORY_LABELS[c] ?? c;
}

/**
 * Fixed category → categorical-palette slot. The first eight discretionary
 * spend categories take the eight validated slots in order; the remaining
 * money-flow categories use neutral/muted tones so they never impersonate a
 * spend series.
 */
const CATEGORY_COLORS: Record<Category, string> = {
  transfers: "var(--series-1)", // blue
  food: "var(--series-2)", // green
  shopping: "var(--series-3)", // magenta
  transport: "var(--series-4)", // yellow
  bills: "var(--series-5)", // aqua
  airtime: "var(--series-6)", // orange
  entertainment: "var(--series-7)", // violet
  business: "var(--series-8)", // red
  withdrawal: "var(--muted)",
  fuliza: "var(--status-warning)",
  deposit: "var(--status-good)",
  income: "var(--status-good)",
  charges: "var(--muted)",
  other: "var(--muted)",
};

export function categoryColor(c: Category): string {
  return CATEGORY_COLORS[c] ?? "var(--muted)";
}

const CATEGORY_ICONS: Record<Category, string> = {
  food: "🍽️",
  transport: "🚗",
  shopping: "🛍️",
  bills: "🧾",
  airtime: "📱",
  entertainment: "🎬",
  business: "💼",
  transfers: "↗️",
  withdrawal: "🏧",
  deposit: "🏦",
  charges: "💰",
  income: "⬇️",
  fuliza: "💳",
  other: "•",
};

export function categoryIcon(c: Category): string {
  return CATEGORY_ICONS[c] ?? "•";
}

const TYPE_LABELS: Record<TransactionType, string> = {
  send: "Sent",
  receive: "Received",
  paybill: "Paybill",
  till: "Buy Goods",
  airtime: "Airtime",
  withdraw: "Withdraw",
  deposit: "Deposit",
  charge: "Charge",
  fuliza: "Fuliza",
  reversal: "Reversal",
  failed: "Failed",
  balance: "Balance",
  unknown: "Other",
};

export function typeLabel(t: TransactionType): string {
  return TYPE_LABELS[t] ?? t;
}
