import { useEffect, useMemo, useState } from "react";
import type { Transaction, Category } from "../lib/parser/types";
import { categoryLabel, dateGroupLabel, typeLabel } from "../lib/format";
import { TxnRow } from "./TxnRow";

const RECENT_DAYS = 7;
const PAGE_SIZE = 80;

/**
 * The transaction ledger, styled as avatar-led rows grouped by day
 * (Today / Yesterday / date). In full mode it adds a search box and category
 * filter (which can be seeded from a drill-down via {@link presetQuery} /
 * {@link presetCategory}); in {@link compact} mode it's a bare preview.
 * Each row opens the transaction's detail via {@link onOpenTxn}.
 */
export function TransactionList({
  transactions,
  now = new Date(),
  compact = false,
  onOpenTxn,
  presetQuery,
  presetCategory,
}: {
  transactions: Transaction[];
  now?: Date;
  compact?: boolean;
  onOpenTxn?: (t: Transaction) => void;
  presetQuery?: string;
  presetCategory?: Category | "all";
}) {
  const [query, setQuery] = useState(presetQuery ?? "");
  const [category, setCategory] = useState<Category | "all">(presetCategory ?? "all");
  const [period, setPeriod] = useState("recent");
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  // Re-seed the filter when a drill-down "See all" hands one in.
  useEffect(() => {
    if (presetQuery !== undefined) setQuery(presetQuery);
    if (presetCategory !== undefined) setCategory(presetCategory);
    setPeriod("recent");
  }, [presetQuery, presetCategory]);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [query, category, period]);

  const categories = useMemo(() => {
    const set = new Set<Category>();
    transactions.forEach((t) => set.add(t.category));
    return [...set].sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        (t.counterparty ?? "").toLowerCase().includes(q) ||
        t.ref.toLowerCase().includes(q) ||
        typeLabel(t.type).toLowerCase().includes(q) ||
        categoryLabel(t.category).toLowerCase().includes(q)
      );
    });
  }, [transactions, query, category]);

  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of filtered) {
      const key = monthKey(t.date);
      if (!seen.has(key)) {
        seen.set(key, t.date.toLocaleString("en-KE", { month: "long", year: "numeric" }));
      }
    }
    return [...seen.entries()].map(([key, label]) => ({ key, label }));
  }, [filtered]);

  const visible = useMemo(() => {
    if (period !== "recent") return filtered.filter((t) => monthKey(t.date) === period);
    const latest = filtered.reduce<Date | null>(
      (max, t) => (!max || t.date.getTime() > max.getTime() ? t.date : max),
      null,
    );
    if (!latest) return [];
    const from = new Date(latest);
    from.setDate(from.getDate() - (RECENT_DAYS - 1));
    from.setHours(0, 0, 0, 0);
    return filtered.filter((t) => t.date.getTime() >= from.getTime());
  }, [filtered, period]);

  const rendered = useMemo(() => visible.slice(0, visibleLimit), [visible, visibleLimit]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of rendered) {
      const key = dateGroupLabel(t.date, now);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [rendered, now]);

  if (compact) {
    return (
      <div>
        {transactions.length === 0 ? (
          <div className="tx-empty">No transactions yet.</div>
        ) : (
          transactions.map((t) => <TxnRow key={t.ref || t.raw} txn={t} onClick={onOpenTxn} />)
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="tx-toolbar">
        <input
          type="search"
          placeholder="Search name, code, type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search transactions"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "all")}
          aria-label="Filter by category"
        >
          <option value="all">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </div>

      <div className="tx-period-note">
        {period === "recent" ? `Showing last ${RECENT_DAYS} days` : monthOptions.find((m) => m.key === period)?.label}
      </div>

      {filtered.length === 0 ? (
        <div className="tx-empty">No transactions match your filters.</div>
      ) : visible.length === 0 ? (
        <div className="tx-empty">No transactions in this period.</div>
      ) : (
        groups.map(([label, items]) => (
          <div className="day-group" key={label}>
            <div className="day-label">{label}</div>
            <div className="flat-panel">
              {items.map((t) => (
                <TxnRow key={t.ref || t.raw} txn={t} onClick={onOpenTxn} />
              ))}
            </div>
          </div>
        ))
      )}

      {visible.length > rendered.length && (
        <button className="tx-show-more" type="button" onClick={() => setVisibleLimit((n) => n + PAGE_SIZE)}>
          Show more transactions
        </button>
      )}

      {monthOptions.length > 0 && (
        <div className="tx-months">
          <div className="tx-months-title">View by month</div>
          <div className="tx-month-grid">
            <button type="button" aria-pressed={period === "recent"} onClick={() => setPeriod("recent")}>
              Last {RECENT_DAYS} days
            </button>
            {monthOptions.map((month) => (
              <button
                key={month.key}
                type="button"
                aria-pressed={period === month.key}
                onClick={() => setPeriod(month.key)}
              >
                {month.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
