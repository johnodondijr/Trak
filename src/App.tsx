import { useEffect, useMemo, useState } from "react";
import type { Transaction } from "./lib/parser/types";
import { parseMessages } from "./lib/parser/index";
import {
  byCategory,
  insights,
  monthlyTrend,
  summarize,
  topCounterparties,
  totals,
} from "./lib/analytics";
import {
  clearTransactions,
  loadTransactions,
  mergeTransactions,
  saveTransactions,
} from "./lib/storage";
import { SAMPLE_MESSAGES } from "./data/sampleMessages";
import { SummaryCards } from "./components/SummaryCards";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { TopRecipients } from "./components/TopRecipients";
import { MonthlyTrendChart } from "./components/MonthlyTrendChart";
import { InsightsPanel } from "./components/InsightsPanel";
import { TransactionList } from "./components/TransactionList";
import { ImportModal } from "./components/ImportModal";

type Range = "today" | "week" | "month" | "all";
const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  all: "All time",
};

type Theme = "light" | "dark";

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [range, setRange] = useState<Range>("month");
  const [importing, setImporting] = useState(false);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("trak.theme") as Theme) || "light",
  );

  // Persist transactions and theme whenever they change.
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("trak.theme", theme);
  }, [theme]);

  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => summarize(transactions, now), [transactions, now]);

  // Transactions constrained to the selected reporting window.
  const inRange = useMemo(() => filterByRange(transactions, range, now), [transactions, range, now]);

  const rangeTotals = useMemo(() => {
    if (range === "all") return summary.all;
    return totals(inRange);
  }, [range, summary, inRange]);

  const categories = useMemo(() => byCategory(inRange), [inRange]);
  const recipients = useMemo(() => topCounterparties(inRange, 6), [inRange]);
  const trend = useMemo(() => monthlyTrend(transactions), [transactions]);
  const tips = useMemo(() => insights(transactions, now), [transactions, now]);

  function handleImport(incoming: Transaction[]) {
    setTransactions((prev) => mergeTransactions(prev, incoming));
  }

  function loadSample() {
    const { transactions: sample } = parseMessages(SAMPLE_MESSAGES);
    setTransactions((prev) => mergeTransactions(prev, sample));
  }

  function handleClear() {
    if (confirm("Remove all imported transactions? This can't be undone.")) {
      clearTransactions();
      setTransactions([]);
    }
  }

  const hasData = transactions.length > 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <h1>Trak</h1>
            <p>Mobile money spending tracker · M-Pesa &amp; Airtel Money</p>
          </div>
        </div>
        <div className="topbar-actions">
          {hasData && (
            <button className="btn btn-primary" onClick={() => setImporting(true)}>
              Import messages
            </button>
          )}
          <button
            className="btn btn-icon"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {!hasData ? (
        <EmptyState onImport={() => setImporting(true)} onSample={loadSample} />
      ) : (
        <>
          <div className="topbar" style={{ marginBottom: 16 }}>
            <div className="range-tabs" role="group" aria-label="Reporting period">
              {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                <button
                  key={r}
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
            <span className="sub" style={{ color: "var(--muted)", fontSize: 12.5 }}>
              {transactions.length} transactions tracked
            </span>
          </div>

          <SummaryCards totals={rangeTotals} rangeLabel={RANGE_LABELS[range]} />

          <div className="grid panels">
            <div className="card">
              <div className="card-head">
                <h2>Spending by category</h2>
                <span className="sub">{RANGE_LABELS[range]}</span>
              </div>
              <CategoryBreakdown data={categories} />
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Insights</h2>
                <span className="sub">all time</span>
              </div>
              <InsightsPanel insights={tips} />
            </div>
          </div>

          <div className="grid panels" style={{ marginTop: 16 }}>
            <div className="card">
              <div className="card-head">
                <h2>Monthly trend</h2>
                <span className="sub">income vs spending</span>
              </div>
              <MonthlyTrendChart data={trend} />
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Top recipients</h2>
                <span className="sub">{RANGE_LABELS[range]}</span>
              </div>
              <TopRecipients data={recipients} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <TransactionList transactions={transactions} />
          </div>

          <div className="footer">
            <button className="btn btn-ghost" onClick={handleClear}>
              Clear all data
            </button>
            <p style={{ marginTop: 12 }}>
              Trak reads your mobile money messages locally in your browser. Nothing is uploaded.
            </p>
          </div>
        </>
      )}

      {importing && (
        <ImportModal onClose={() => setImporting(false)} onImport={handleImport} />
      )}
    </div>
  );
}

function EmptyState({ onImport, onSample }: { onImport: () => void; onSample: () => void }) {
  return (
    <div className="empty-state">
      <div className="big">📊</div>
      <h2>Turn your M-Pesa &amp; Airtel messages into insights</h2>
      <p>
        Paste your mobile money SMS messages and Trak automatically organizes them into spending
        reports, income summaries, and financial insights — so you know exactly where your money
        goes.
      </p>
      <div className="empty-actions">
        <button className="btn btn-primary" onClick={onImport}>
          Import your messages
        </button>
        <button className="btn" onClick={onSample}>
          Try with sample data
        </button>
      </div>
    </div>
  );
}

/** Slice a transaction list down to the selected reporting window. */
function filterByRange(txns: Transaction[], range: Range, now: Date): Transaction[] {
  if (range === "all") return txns;
  const start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    start.setHours(0, 0, 0, 0);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  const from = start.getTime();
  return txns.filter((t) => t.date.getTime() >= from && t.date.getTime() <= now.getTime());
}
