import { useEffect, useMemo, useState } from "react";
import type { Transaction, Category } from "../lib/parser/types";
import { categoryLabel, dateGroupLabel, typeLabel } from "../lib/format";
import { TxnRow } from "./TxnRow";

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

  // Re-seed the filter when a drill-down "See all" hands one in.
  useEffect(() => {
    if (presetQuery !== undefined) setQuery(presetQuery);
    if (presetCategory !== undefined) setCategory(presetCategory);
  }, [presetQuery, presetCategory]);

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

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = dateGroupLabel(t.date, now);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [filtered, now]);

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

      {filtered.length === 0 ? (
        <div className="tx-empty">No transactions match your filters.</div>
      ) : (
        groups.map(([label, items]) => (
          <div className="day-group" key={label}>
            <div className="day-label">{label}</div>
            <div className="card" style={{ padding: "4px 12px" }}>
              {items.map((t) => (
                <TxnRow key={t.ref || t.raw} txn={t} onClick={onOpenTxn} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
