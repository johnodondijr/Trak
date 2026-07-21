import { useMemo, useState } from "react";
import type { Transaction, Category } from "../lib/parser/types";
import {
  categoryLabel,
  dateGroupLabel,
  formatTime,
  kes,
  typeLabel,
} from "../lib/format";
import { Avatar } from "./Avatar";

/**
 * The transaction ledger, styled as avatar-led rows grouped by day
 * (Today / Yesterday / date). In full mode it adds a search box and category
 * filter; in {@link compact} mode it's a bare recent-activity preview.
 */
export function TransactionList({
  transactions,
  now = new Date(),
  compact = false,
}: {
  transactions: Transaction[];
  now?: Date;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

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

  // Group by day label, preserving the newest-first order.
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
          transactions.map((t) => <Row key={t.ref || t.raw} txn={t} />)
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
                <Row key={t.ref || t.raw} txn={t} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Row({ txn }: { txn: Transaction }) {
  const isIncome = txn.direction === "income";
  const isExpense = txn.direction === "expense";
  const sign = isIncome ? "+" : isExpense ? "−" : "";
  const amountClass = isIncome ? "pos" : isExpense ? "neg" : "";
  const title =
    txn.counterparty ??
    (txn.type === "airtime"
      ? "Airtime"
      : txn.type === "balance"
        ? "Balance enquiry"
        : "Transaction");

  return (
    <div className="tx">
      <Avatar category={txn.category} />
      <div className="tx-main">
        <div className="tx-title">{title}</div>
        <div className="tx-meta">
          <span>{typeLabel(txn.type)}</span>
          <span>·</span>
          <span>{formatTime(txn.date)}</span>
          <span>·</span>
          <span style={{ textTransform: txn.institution ? "none" : "uppercase" }}>
            {txn.institution ?? txn.provider}
          </span>
        </div>
      </div>
      <div>
        <div className={`tx-amount ${amountClass}`}>
          {txn.direction === "neutral" ? "" : sign}
          {kes(txn.amount)}
        </div>
        {txn.cost > 0 && <div className="tx-cost">fee {kes(txn.cost)}</div>}
      </div>
    </div>
  );
}
