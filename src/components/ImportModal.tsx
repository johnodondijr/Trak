import { useRef, useState } from "react";
import { importContent, type ImportResult, type ImportSource } from "../lib/importers/index";
import type { Transaction } from "../lib/parser/types";
import { SAMPLE_MESSAGES } from "../data/sampleMessages";

/**
 * Import dialog. Two ways in:
 *  1. Upload a file — an SMS-backup XML (SMS Backup & Restore), an M-Pesa
 *     statement CSV, or an SMS-export CSV. This is how you bring in your whole
 *     real history at once.
 *  2. Paste message text — quick for a handful of messages.
 *
 * Everything is parsed locally in the browser; nothing is uploaded anywhere.
 */
const SOURCE_LABELS: Record<ImportSource, string> = {
  "sms-backup": "SMS backup file",
  statement: "M-Pesa statement",
  "sms-csv": "SMS export (CSV)",
  text: "pasted messages",
};

export function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (txns: Transaction[]) => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<(ImportResult & { filename?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function apply(res: ImportResult, filename?: string) {
    setResult({ ...res, filename });
    if (res.transactions.length > 0) onImport(res.transactions);
  }

  function handlePaste() {
    apply(importContent(text));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      // Merge across multiple selected files.
      const merged: Transaction[] = [];
      let seen = 0;
      let skipped = 0;
      let source: ImportSource = "text";
      let lastName = "";
      for (const file of Array.from(files)) {
        const content = await file.text();
        const res = importContent(content, file.name);
        merged.push(...res.transactions);
        seen += res.seen;
        skipped += res.skipped;
        source = res.source;
        lastName = file.name;
      }
      apply({ transactions: merged, source, seen, skipped }, files.length > 1 ? `${files.length} files` : lastName);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Import messages">
      <div className="modal">
        <h2>Import your transactions</h2>
        <p className="hint">
          Bring in your real M-Pesa / Airtel Money history. Everything is parsed locally in your
          browser — nothing is uploaded.
        </p>

        {/* ---- File drop zone ---- */}
        <div
          className={`dropzone ${dragOver ? "over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xml,.csv,.tsv,.txt,text/xml,text/csv,text/plain"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="dz-icon" aria-hidden>
            {busy ? "⏳" : "📄"}
          </div>
          <div className="dz-main">
            {busy ? "Reading file…" : "Click to choose a file, or drag it here"}
          </div>
          <div className="dz-sub">
            SMS backup (.xml) · M-Pesa statement (.csv) · SMS export (.csv) · text (.txt)
          </div>
        </div>

        <details className="help">
          <summary>How do I get my messages into a file?</summary>
          <div className="help-body">
            <p>
              <strong>All your SMS at once (recommended):</strong> install the free{" "}
              <em>SMS Backup &amp; Restore</em> app from Google Play, tap <em>Back up</em>, choose{" "}
              <em>Messages</em> and save as XML. Upload that <code>.xml</code> file here — Trak keeps
              only your M-Pesa and Airtel Money messages.
            </p>
            <p>
              <strong>M-Pesa statement:</strong> request your statement in the M-PESA app or by
              dialing <code>*334#</code> → M-PESA Statements. If you have it as a spreadsheet, export
              it to <code>.csv</code> and upload it here.
            </p>
          </div>
        </details>

        <div className="or-divider"><span>or paste messages</span></div>

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
          <div className={`import-note ${result.transactions.length > 0 ? "ok" : "err"}`}>
            {result.transactions.length > 0 ? (
              <>
                Imported <strong>{result.transactions.length}</strong>{" "}
                {result.transactions.length === 1 ? "transaction" : "transactions"} from{" "}
                {result.filename ? <code>{result.filename}</code> : SOURCE_LABELS[result.source]}
                {result.source !== "text" && <> ({SOURCE_LABELS[result.source]})</>}.
              </>
            ) : (
              <>No transactions recognized in that {SOURCE_LABELS[result.source]}.</>
            )}
            {result.skipped > 0 && (
              <>
                {" "}
                {result.skipped} {result.skipped === 1 ? "entry was" : "entries were"} skipped (not
                mobile-money transactions).
              </>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setText(SAMPLE_MESSAGES.trim())}>
            Paste sample data
          </button>
          <button className="btn" onClick={onClose}>
            {result && result.transactions.length > 0 ? "Done" : "Cancel"}
          </button>
          <button className="btn btn-primary" onClick={handlePaste} disabled={!text.trim() || busy}>
            Import pasted text
          </button>
        </div>
      </div>
    </div>
  );
}
