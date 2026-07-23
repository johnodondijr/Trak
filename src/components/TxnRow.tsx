import type { Transaction } from "../lib/parser/types";
import { kes, formatDate, typeLabel } from "../lib/format";
import { IconArrowDownLeft, IconArrowUpRight, CategoryGlyph } from "./icons";

/**
 * One transaction row, FastPay-style: a directional arrow in a tinted disc
 * (money in ↙ green, money out ↗ red), the counterparty, a date/meta line, and
 * the signed amount. Shared by the ledger, drill-downs and previews. When
 * {@link onClick} is provided the whole row opens the transaction detail.
 */
export function TxnRow({
  txn,
  onClick,
}: {
  txn: Transaction;
  onClick?: (t: Transaction) => void;
}) {
  const isIncome = txn.direction === "income";
  const isExpense = txn.direction === "expense";
  const sign = isIncome ? "+" : isExpense ? "−" : "";
  const amountClass = isIncome ? "pos" : isExpense ? "neg" : "";
  const color = isIncome ? "var(--income)" : isExpense ? "var(--expense)" : "var(--muted)";
  const title =
    txn.counterparty ??
    (txn.type === "airtime"
      ? "Airtime"
      : txn.type === "balance"
        ? "Balance enquiry"
        : "Transaction");

  const inner = (
    <>
      <span
        className="tx-arrow"
        style={{ color, background: `color-mix(in srgb, ${color} 13%, var(--screen))` }}
        aria-hidden
      >
        {isIncome ? (
          <IconArrowDownLeft size={19} />
        ) : isExpense ? (
          <IconArrowUpRight size={19} />
        ) : (
          <CategoryGlyph category={txn.category} size={18} />
        )}
      </span>
      <div className="tx-main">
        <div className="tx-title">{title}</div>
        <div className="tx-meta">
          <span>{typeLabel(txn.type)}</span>
          <span>·</span>
          <span>{formatDate(txn.date)}</span>
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
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="tx tx-btn" onClick={() => onClick(txn)}>
        {inner}
      </button>
    );
  }
  return <div className="tx">{inner}</div>;
}
