import type { Transaction } from "../lib/parser/types";
import { kes, formatTime, typeLabel } from "../lib/format";
import { Avatar } from "./Avatar";

/**
 * One avatar-led transaction row, shared by the ledger, the summary drill-downs
 * and the detail view. When {@link onClick} is provided the whole row is a
 * button that opens the transaction's detail.
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
  const title =
    txn.counterparty ??
    (txn.type === "airtime"
      ? "Airtime"
      : txn.type === "balance"
        ? "Balance enquiry"
        : "Transaction");

  const inner = (
    <>
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
