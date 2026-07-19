import { useEffect, useMemo, useState } from "react";
import type { Transaction } from "./lib/parser/types";
import { parseMessages } from "./lib/parser/index";
import {
  byCategory,
  insights,
  latestBalance,
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
import { kes, greeting } from "./lib/format";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { TopRecipients } from "./components/TopRecipients";
import { MonthlyTrendChart } from "./components/MonthlyTrendChart";
import { InsightsPanel } from "./components/InsightsPanel";
import { TransactionList } from "./components/TransactionList";
import { ImportModal } from "./components/ImportModal";

type Range = "today" | "week" | "month" | "all";
const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
  all: "All",
};
const RANGE_PHRASE: Record<Range, string> = {
  today: "today",
  week: "this week",
  month: "this month",
  all: "all time",
};

type Tab = "overview" | "activity" | "trends";
type Theme = "light" | "dark";

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [range, setRange] = useState<Range>("month");
  const [tab, setTab] = useState<Tab>("overview");
  const [importing, setImporting] = useState(false);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("trak.theme") as Theme) || "light",
  );

  useEffect(() => saveTransactions(transactions), [transactions]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("trak.theme", theme);
  }, [theme]);

  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => summarize(transactions, now), [transactions, now]);
  const inRange = useMemo(() => filterByRange(transactions, range, now), [transactions, range, now]);
  const rangeTotals = useMemo(
    () => (range === "all" ? summary.all : totals(inRange)),
    [range, summary, inRange],
  );
  const categories = useMemo(() => byCategory(inRange), [inRange]);
  const trend = useMemo(() => monthlyTrend(transactions), [transactions]);
  const tips = useMemo(() => insights(transactions, now), [transactions, now]);
  const balance = useMemo(() => latestBalance(transactions), [transactions]);

  function revealImported(merged: Transaction[]) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (!merged.some((t) => t.date.getTime() >= monthStart)) setRange("all");
  }
  function handleImport(incoming: Transaction[]) {
    const merged = mergeTransactions(transactions, incoming);
    setTransactions(merged);
    revealImported(merged);
  }
  function loadSample() {
    const { transactions: sample } = parseMessages(SAMPLE_MESSAGES);
    const merged = mergeTransactions(transactions, sample);
    setTransactions(merged);
    revealImported(merged);
  }
  function handleClear() {
    if (confirm("Remove all imported transactions? This can't be undone.")) {
      clearTransactions();
      setTransactions([]);
      setTab("overview");
    }
  }

  const hasData = transactions.length > 0;
  const spent = rangeTotals.expense + rangeTotals.charges;

  return (
    <div className="device">
      <div className="screen">
        <header className="app-header">
          <div className="hi">
            <div className="hi-logo">T</div>
            <div>
              <small>{greeting(now)}</small>
              <h1>Your money on Trak</h1>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button className="icon-btn" onClick={() => setImporting(true)} aria-label="Import">
              ＋
            </button>
          </div>
        </header>

        {!hasData ? (
          <EmptyState onImport={() => setImporting(true)} onSample={loadSample} />
        ) : (
          <>
            {tab === "overview" && (
              <>
                <HeroCard
                  balance={balance}
                  rangeNet={rangeTotals.net}
                  rangePhrase={RANGE_PHRASE[range]}
                />

                <div className="quick">
                  <button onClick={() => setImporting(true)}>
                    <span className="q-circle">＋</span>
                    Import
                  </button>
                  <button onClick={() => setTab("activity")}>
                    <span className="q-circle">📥</span>
                    Activity
                  </button>
                  <button onClick={() => setTab("trends")}>
                    <span className="q-circle">📈</span>
                    Trends
                  </button>
                </div>

                <div className="section" style={{ marginTop: 16 }}>
                  <div className="segmented" role="group" aria-label="Period">
                    {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                      <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>
                        {RANGE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                  <div className="mini-stats">
                    <Mini label="In" dot="var(--income)" value={kes(rangeTotals.income)} cls="pos" />
                    <Mini label="Out" dot="var(--expense)" value={kes(spent)} cls="neg" />
                    <Mini label="Charges" dot="var(--muted)" value={kes(rangeTotals.charges)} />
                  </div>
                </div>

                <section className="section">
                  <div className="section-head">
                    <h2>Spending by category</h2>
                    <span className="sub">{RANGE_PHRASE[range]}</span>
                  </div>
                  <div className="card">
                    <CategoryBreakdown data={categories} />
                  </div>
                </section>

                <section className="section">
                  <div className="section-head">
                    <h2>Insights</h2>
                    <button className="link" onClick={() => setTab("trends")}>
                      See trends
                    </button>
                  </div>
                  <InsightsPanel insights={tips} />
                </section>

                <RecentPreview transactions={transactions} onSeeAll={() => setTab("activity")} />
              </>
            )}

            {tab === "activity" && (
              <section className="section" style={{ marginTop: 4 }}>
                <div className="section-head">
                  <h2>Activity</h2>
                  <span className="sub">{transactions.length} transactions</span>
                </div>
                <TransactionList transactions={transactions} now={now} />
              </section>
            )}

            {tab === "trends" && (
              <>
                <section className="section" style={{ marginTop: 4 }}>
                  <div className="section-head">
                    <h2>Monthly trend</h2>
                    <span className="sub">income vs spending</span>
                  </div>
                  <div className="card">
                    <MonthlyTrendChart data={trend} />
                  </div>
                </section>
                <section className="section">
                  <div className="section-head">
                    <h2>Top recipients</h2>
                    <span className="sub">all time</span>
                  </div>
                  <div className="card">
                    <TopRecipients data={topCounterparties(transactions, 6)} />
                  </div>
                </section>
                <section className="section">
                  <div className="section-head">
                    <h2>All-time categories</h2>
                  </div>
                  <div className="card">
                    <CategoryBreakdown data={byCategory(transactions)} />
                  </div>
                </section>
                <div className="footer">
                  <button className="btn btn-ghost" onClick={handleClear}>
                    Clear all data
                  </button>
                  <p>Trak reads your messages locally in your browser. Nothing is uploaded.</p>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {hasData && (
        <nav className="tabbar">
          <button aria-current={tab === "overview"} onClick={() => setTab("overview")}>
            <span className="tico">🏠</span>
            Home
          </button>
          <button aria-current={tab === "activity"} onClick={() => setTab("activity")}>
            <span className="tico">📥</span>
            Activity
          </button>
          <button className="primary" onClick={() => setImporting(true)} aria-label="Import">
            <span className="tico">＋</span>
          </button>
          <button aria-current={tab === "trends"} onClick={() => setTab("trends")}>
            <span className="tico">📈</span>
            Trends
          </button>
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
          >
            <span className="tico">{theme === "dark" ? "☀️" : "🌙"}</span>
            Theme
          </button>
        </nav>
      )}

      {importing && <ImportModal onClose={() => setImporting(false)} onImport={handleImport} />}
    </div>
  );
}

function HeroCard({
  balance,
  rangeNet,
  rangePhrase,
}: {
  balance: ReturnType<typeof latestBalance>;
  rangeNet: number;
  rangePhrase: string;
}) {
  const hasBalance = balance != null;
  const bigValue = hasBalance ? balance!.amount : Math.abs(rangeNet);
  const providerLabel =
    balance?.provider === "airtel" ? "Airtel Money" : balance?.provider === "mpesa" ? "M-PESA" : "Wallet";
  const up = rangeNet >= 0;
  return (
    <section className="hero">
      <div className="hero-top">
        <span className="hero-label">{hasBalance ? "Balance" : `Net ${rangePhrase}`}</span>
        <span className="hero-chip">
          <span className="brandmark" />
          {providerLabel}
        </span>
      </div>
      <div className="hero-amount">
        <span className="cur">KES</span>
        {Math.round(bigValue).toLocaleString("en-KE")}
      </div>
      <div className="hero-delta">
        <span className="pill">
          {up ? "▲" : "▼"} {kes(Math.abs(rangeNet))}
        </span>
        net {rangePhrase}
      </div>
    </section>
  );
}

function Mini({
  label,
  value,
  dot,
  cls,
}: {
  label: string;
  value: string;
  dot: string;
  cls?: string;
}) {
  return (
    <div className="mini">
      <div className="lbl">
        <i className="dot" style={{ background: dot }} />
        {label}
      </div>
      <div className={`val ${cls ?? ""}`}>{value}</div>
    </div>
  );
}

/** A short "latest transactions" preview shown on the overview tab. */
function RecentPreview({
  transactions,
  onSeeAll,
}: {
  transactions: Transaction[];
  onSeeAll: () => void;
}) {
  const recent = transactions.slice(0, 4);
  return (
    <section className="section">
      <div className="section-head">
        <h2>Latest transactions</h2>
        <button className="link" onClick={onSeeAll}>
          See all
        </button>
      </div>
      <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <TransactionList transactions={recent} compact />
      </div>
    </section>
  );
}

function EmptyState({ onImport, onSample }: { onImport: () => void; onSample: () => void }) {
  return (
    <div className="empty-state">
      <div className="big">📊</div>
      <h2>Turn your M-Pesa &amp; Airtel messages into insights</h2>
      <p>
        Import your mobile money messages and Trak organizes them into spending reports, income
        summaries and insights — so you know exactly where your money goes.
      </p>
      <div className="empty-actions">
        <button className="btn btn-primary" onClick={onImport}>
          Import your messages
        </button>
        <button className="btn" onClick={onSample}>
          Try sample data
        </button>
      </div>
    </div>
  );
}

function filterByRange(txns: Transaction[], range: Range, now: Date): Transaction[] {
  if (range === "all") return txns;
  const start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  const from = start.getTime();
  return txns.filter((t) => t.date.getTime() >= from && t.date.getTime() <= now.getTime());
}
