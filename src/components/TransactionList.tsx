import { useMemo, useState } from "react";
import type { Transaction, Category } from "../lib/parser/types";
import {
  categoryColor,
  categoryIcon,
  categoryLabel,
  formatDateTime,
  kes,
  typeLabel,
} from "../lib/format";

/**
 * The full transaction ledger with a free-text search and a category filter.
 * Each row shows the counterparty, type, date, category chip and the signed
 * amount (green in / red out), plus any charge.
 */
export function TransactionList({ transactions }: { transactions: Transaction[] }) {
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

  return (
    <div className="card">
      <div className="card-head">
        <h2>Transactions</h2>
        <span className="sub">
          {filtered.length} of {transactions.length}
        </span>
      </div>

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
          <option value="all">All categories</option>
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
        <div className="tx-list">
          {filtered.map((t) => (
            <Row key={t.ref || t.raw} txn={t} />
          ))}
        </div>
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
    (txn.type === "airtime" ? "Airtime" : txn.type === "balance" ? "Balance enquiry" : "Transaction");

  return (
    <div className="tx">
      <div className="tx-ico" aria-hidden>
        {categoryIcon(txn.category)}
      </div>
      <div className="tx-main">
        <div className="tx-title">{title}</div>
        <div className="tx-meta">
          <span className="tx-chip">
            <i className="dot" style={{ background: categoryColor(txn.category) }} />
            {categoryLabel(txn.category)}
          </span>
          <span>{typeLabel(txn.type)}</span>
          <span>{formatDateTime(txn.date)}</span>
          <span style={{ textTransform: "uppercase" }}>{txn.provider}</span>
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
