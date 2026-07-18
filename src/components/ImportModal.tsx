import { useState } from "react";
import { parseMessages } from "../lib/parser/index";
import type { Transaction } from "../lib/parser/types";
import { SAMPLE_MESSAGES } from "../data/sampleMessages";

/**
 * Paste-your-messages import dialog. The user pastes raw M-Pesa / Airtel Money
 * SMS text; we parse it, report how many transactions were recognized and how
 * many lines couldn't be read, and hand the parsed transactions back to the app
 * to merge into storage.
 */
export function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (txns: Transaction[]) => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);

  function handleParse() {
    const { transactions, unparsed } = parseMessages(text);
    setResult({ ok: transactions.length, failed: unparsed.length });
    if (transactions.length > 0) {
      onImport(transactions);
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Import messages">
      <div className="modal">
        <h2>Import mobile money messages</h2>
        <p className="hint">
          Paste your M-Pesa or Airtel Money SMS messages below — one per line, or separated by
          blank lines. Nothing leaves your device; parsing happens right here in your browser.
        </p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder={
            "TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to JOHN KAMAU 0712345678 on 3/7/26 at 8:32 AM. New M-PESA balance is Ksh12,480.00. Transaction cost, Ksh25.00.\n\nYou have received Ksh1,200.00 from GRACE ADHIAMBO 0731222333. Your new balance is Ksh3,400.00. Transaction ID: PP7789BB. Airtel Money."
          }
        />

        {result && (
          <div className={`import-note ${result.ok > 0 ? "ok" : "err"}`}>
            {result.ok > 0 ? (
              <>
                Imported <strong>{result.ok}</strong>{" "}
                {result.ok === 1 ? "transaction" : "transactions"}.
              </>
            ) : (
              <>No transactions recognized.</>
            )}
            {result.failed > 0 && (
              <>
                {" "}
                {result.failed} {result.failed === 1 ? "line was" : "lines were"} not recognized as
                mobile-money messages and skipped.
              </>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setText(SAMPLE_MESSAGES.trim())}>
            Paste sample data
          </button>
          <button className="btn" onClick={onClose}>
            {result && result.ok > 0 ? "Done" : "Cancel"}
          </button>
          <button className="btn btn-primary" onClick={handleParse} disabled={!text.trim()}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
