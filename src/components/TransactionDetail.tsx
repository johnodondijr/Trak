import { useState } from "react";
import type { Transaction } from "../lib/parser/types";
import {
  categoryColor,
  categoryIcon,
  categoryLabel,
  formatDateTime,
  kes,
  kesPrecise,
  typeLabel,
} from "../lib/format";

/**
 * Full detail for a single transaction, shown as a bottom sheet. Surfaces every
 * parsed field — amount, fee, running balance, the other party, account,
 * provider/institution, transaction code and date — plus the original SMS.
 */
export function TransactionDetail({
  txn,
  onClose,
}: {
  txn: Transaction;
  onClose: () => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const isIncome = txn.direction === "income";
  const isExpense = txn.direction === "expense";
  const sign = isIncome ? "+" : isExpense ? "−" : "";
  const amountClass = isIncome ? "pos" : isExpense ? "neg" : "";
  const title =
    txn.counterparty ??
    (txn.type === "airtime" ? "Airtime" : txn.type === "balance" ? "Balance enquiry" : "Transaction");

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Transaction detail" onClick={onClose}>
      <div className="modal detail" onClick={(e) => e.stopPropagation()}>
        <div className="detail-head">
          <div
            className="detail-avatar"
            style={{ background: `color-mix(in srgb, ${categoryColor(txn.category)} 18%, var(--surface-1))` }}
            aria-hidden
          >
            {categoryIcon(txn.category)}
          </div>
          <div className={`detail-amount ${amountClass}`}>
            {txn.direction === "neutral" ? "" : sign}
            {kesPrecise(txn.amount)}
          </div>
          <div className="detail-title">{title}</div>
          <div className="detail-sub">
            {typeLabel(txn.type)} · {categoryLabel(txn.category)}
          </div>
        </div>

        <dl className="detail-list">
          <Field label="Date" value={formatDateTime(txn.date)} />
          {txn.counterparty && <Field label="To / From" value={txn.counterparty} />}
          {txn.account && <Field label="Account / Phone" value={txn.account} />}
          <Field label="Source" value={txn.institution ?? txn.provider.toUpperCase()} />
          {txn.cost > 0 && <Field label="Transaction fee" value={kes(txn.cost)} />}
          {txn.balance != null && <Field label="Balance after" value={kesPrecise(txn.balance)} />}
          {txn.ref && <Field label="Code" value={txn.ref} mono />}
        </dl>

        <button className="detail-raw-toggle" onClick={() => setShowRaw((s) => !s)}>
          {showRaw ? "Hide" : "Show"} original message
        </button>
        {showRaw && <p className="detail-raw">{txn.raw}</p>}

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="detail-field">
      <dt>{label}</dt>
      <dd style={mono ? { fontFamily: "ui-monospace, Menlo, monospace" } : undefined}>{value}</dd>
    </div>
  );
}
