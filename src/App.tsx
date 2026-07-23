import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Transaction, Category } from "./lib/parser/types";
import { parseMessages } from "./lib/parser/index";
import {
  byCategory,
  insights,
  latestBalance,
  monthlyTrend,
  monthOverMonth,
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
import { hasSample, stripSample } from "./lib/sample";
import { kes, greeting } from "./lib/format";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { TopRecipients } from "./components/TopRecipients";
import { CategoryDonut } from "./components/CategoryDonut";
import { StatsScreen } from "./components/StatsScreen";
import { TrakMark } from "./components/TrakLogo";
import { InstallButton } from "./components/InstallButton";
import { InsightsPanel } from "./components/InsightsPanel";
import { TransactionList } from "./components/TransactionList";
import { TransactionDetail } from "./components/TransactionDetail";
import { EmptyLanding } from "./components/EmptyLanding";
import { ImportModal } from "./components/ImportModal";
import {
  IconHome,
  IconActivity,
  IconTrends,
  IconPlus,
  IconSun,
  IconMoon,
  IconEye,
  IconEyeOff,
  IconArrowUp,
  IconArrowDown,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBulb,
  IconBell,
  IconUser,
  IconShield,
  IconTrash,
  IconChevronRight,
  IconTransfer,
} from "./components/icons";

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

type Tab = "overview" | "activity" | "trends" | "more";
type Theme = "light" | "dark";

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [range, setRange] = useState<Range>("month");
  const [tab, setTab] = useState<Tab>("overview");
  const [importing, setImporting] = useState(false);
  const [detailTxn, setDetailTxn] = useState<Transaction | null>(null);
  const [activityPreset, setActivityPreset] = useState<{
    query?: string;
    category?: Category | "all";
  }>({});
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("trak.theme") as Theme) || "light",
  );
  const [hideBalance, setHideBalance] = useState(false);

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
  const mom = useMemo(() => monthOverMonth(transactions, now), [transactions, now]);
  const tips = useMemo(() => insights(transactions, now), [transactions, now]);
  const balance = useMemo(() => latestBalance(transactions), [transactions]);
  // Memoized so switching to the Trends tab doesn't recompute on every render.
  const allCategories = useMemo(() => byCategory(transactions), [transactions]);
  const allRecipients = useMemo(() => topCounterparties(transactions, 6), [transactions]);

  function revealImported(merged: Transaction[]) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (!merged.some((t) => t.date.getTime() >= monthStart)) setRange("all");
  }
  function handleImport(incoming: Transaction[]) {
    // Importing real data removes the demo so the two never mix.
    const merged = mergeTransactions(stripSample(transactions), incoming);
    setTransactions(merged);
    revealImported(merged);
  }
  function loadSample() {
    const { transactions: sample } = parseMessages(SAMPLE_MESSAGES);
    const merged = mergeTransactions(transactions, sample);
    setTransactions(merged);
    revealImported(merged);
  }
  function clearSample() {
    setTransactions((prev) => stripSample(prev));
  }
  /** Jump to the Activity tab pre-filtered from a summary drill-down. */
  function seeAllInActivity(preset: { query?: string; category?: Category | "all" }) {
    setActivityPreset({ query: preset.query ?? "", category: preset.category ?? "all" });
    setTab("activity");
  }
  function handleClear() {
    if (confirm("Remove all imported transactions? This can't be undone.")) {
      clearTransactions();
      setTransactions([]);
      setTab("overview");
    }
  }

  const hasData = transactions.length > 0;
  const showingSample = useMemo(() => hasSample(transactions), [transactions]);
  const spent = rangeTotals.expense + rangeTotals.charges;

  return (
    <div className="device">
      {!hasData ? (
        <EmptyLanding onImport={() => setImporting(true)} onSample={loadSample} />
      ) : (
        <div className="screen">
        <header className="app-header">
          <div className="hi">
            <div className="hi-logo">
              <TrakMark size={26} />
            </div>
            <div>
              <small>{greeting(now)} 👋</small>
              <h1>{tab === "more" ? "Account" : tab === "trends" ? "Statistics" : tab === "activity" ? "Transactions" : "Your money"}</h1>
            </div>
          </div>
          <div className="header-actions">
            <InstallButton variant="header" />
            <button className="icon-btn" onClick={() => setTab("more")} aria-label="Account">
              <IconBell size={19} />
            </button>
          </div>
        </header>

        {showingSample && (
          <div className="sample-banner">
            <span>
              <strong>Sample data</strong> — these aren't your messages.
            </span>
            <div className="sample-banner-actions">
              <button onClick={() => setImporting(true)}>Import mine</button>
              <button className="ghost" onClick={clearSample}>
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="tab-view" key={tab}>
            {tab === "overview" && (
              <>
                <HeroCard
                  balance={balance}
                  rangeNet={rangeTotals.net}
                  rangePhrase={RANGE_PHRASE[range]}
                  hidden={hideBalance}
                  onToggleHidden={() => setHideBalance((h) => !h)}
                />

                <button className="add-cta" onClick={() => setImporting(true)}>
                  <IconPlus size={18} /> Import messages
                </button>

                <div className="quick">
                  <button onClick={() => setTab("activity")}>
                    <span className="q-circle">
                      <IconActivity size={21} />
                    </span>
                    Transactions
                  </button>
                  <button onClick={() => setTab("trends")}>
                    <span className="q-circle">
                      <IconTrends size={21} />
                    </span>
                    Stats
                  </button>
                  <button onClick={() => setTab("trends")}>
                    <span className="q-circle">
                      <IconBulb size={21} />
                    </span>
                    Insights
                  </button>
                  <button onClick={() => setTab("more")}>
                    <span className="q-circle">
                      <IconUser size={21} />
                    </span>
                    Account
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
                    <Mini
                      label="Money in"
                      value={kes(rangeTotals.income)}
                      cls="pos"
                      color="var(--income)"
                      icon={<IconArrowDownLeft size={17} />}
                    />
                    <Mini
                      label="Money out"
                      value={kes(spent)}
                      cls="neg"
                      color="var(--expense)"
                      icon={<IconArrowUpRight size={17} />}
                    />
                    <Mini
                      label="Charges"
                      value={kes(rangeTotals.charges)}
                      color="var(--muted)"
                      icon={<IconArrowUp size={15} />}
                    />
                  </div>
                </div>

                <section className="section">
                  <div className="section-head">
                    <h2>Spending by category</h2>
                    <span className="sub">{RANGE_PHRASE[range]}</span>
                  </div>
                  <div className="card">
                    <CategoryBreakdown
                      data={categories}
                      transactions={inRange}
                      onOpenTxn={setDetailTxn}
                      onSeeAll={(c) => seeAllInActivity({ category: c })}
                    />
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

                <RecentPreview
                  transactions={transactions}
                  onSeeAll={() => seeAllInActivity({})}
                  onOpenTxn={setDetailTxn}
                />
              </>
            )}

            {tab === "activity" && (
              <section className="section" style={{ marginTop: 4 }}>
                <div className="section-head">
                  <h2>Transactions</h2>
                  <span className="sub">{transactions.length} total</span>
                </div>
                <TransactionList
                  transactions={transactions}
                  now={now}
                  onOpenTxn={setDetailTxn}
                  presetQuery={activityPreset.query}
                  presetCategory={activityPreset.category}
                />
              </section>
            )}

            {tab === "trends" && (
              <>
                <div className="section-head" style={{ marginTop: 2 }}>
                  <h2>Statistics</h2>
                </div>
                <StatsScreen
                  transactions={transactions}
                  trend={trend}
                  mom={mom}
                  onOpenTxn={setDetailTxn}
                />
                <section className="section">
                  <div className="section-head">
                    <h2>Where your money goes</h2>
                    <span className="sub">all time</span>
                  </div>
                  <div className="card">
                    <CategoryDonut data={allCategories} />
                  </div>
                </section>
                <section className="section">
                  <div className="section-head">
                    <h2>Top recipients</h2>
                    <span className="sub">all time</span>
                  </div>
                  <div className="card">
                    <TopRecipients
                      data={allRecipients}
                      transactions={transactions}
                      onOpenTxn={setDetailTxn}
                      onSeeAll={(name) => seeAllInActivity({ query: name })}
                    />
                  </div>
                </section>
                <section className="section">
                  <div className="section-head">
                    <h2>All-time categories</h2>
                  </div>
                  <div className="card">
                    <CategoryBreakdown
                      data={allCategories}
                      transactions={transactions}
                      onOpenTxn={setDetailTxn}
                      onSeeAll={(c) => seeAllInActivity({ category: c })}
                    />
                  </div>
                </section>
              </>
            )}

            {tab === "more" && (
              <MoreScreen
                count={transactions.length}
                theme={theme}
                onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                onImport={() => setImporting(true)}
                onSample={loadSample}
                onClear={handleClear}
              />
            )}
          </div>
        </div>
      )}

      {hasData && (
        <nav className="tabbar">
          <button aria-current={tab === "overview"} onClick={() => setTab("overview")}>
            <span className="tico">
              <IconHome size={22} />
            </span>
            Home
          </button>
          <button aria-current={tab === "activity"} onClick={() => setTab("activity")}>
            <span className="tico">
              <IconTransfer size={22} />
            </span>
            Transactions
          </button>
          <button className="primary" onClick={() => setImporting(true)} aria-label="Import">
            <span className="tico">
              <IconPlus size={26} />
            </span>
          </button>
          <button aria-current={tab === "trends"} onClick={() => setTab("trends")}>
            <span className="tico">
              <IconTrends size={22} />
            </span>
            Stats
          </button>
          <button aria-current={tab === "more"} onClick={() => setTab("more")}>
            <span className="tico">
              <IconUser size={22} />
            </span>
            Account
          </button>
        </nav>
      )}

      {importing && <ImportModal onClose={() => setImporting(false)} onImport={handleImport} />}
      {detailTxn && <TransactionDetail txn={detailTxn} onClose={() => setDetailTxn(null)} />}
    </div>
  );
}

function HeroCard({
  balance,
  rangeNet,
  rangePhrase,
  hidden,
  onToggleHidden,
}: {
  balance: ReturnType<typeof latestBalance>;
  rangeNet: number;
  rangePhrase: string;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  const hasBalance = balance != null;
  const bigValue = hasBalance ? balance!.amount : Math.abs(rangeNet);
  const providerLabel =
    balance?.provider === "airtel" ? "Airtel Money" : balance?.provider === "mpesa" ? "M-PESA" : "Wallet";
  const up = rangeNet >= 0;
  return (
    <>
      <section className="hero">
        <div className="hero-top">
          <span className="hero-label">{hasBalance ? "Total balance" : `Net ${rangePhrase}`}</span>
          <span className="hero-brand">{providerLabel}</span>
        </div>
        <div className="hero-amount">
          <span className="cur">KES</span>
          {hidden ? "••••••" : Math.round(bigValue).toLocaleString("en-KE")}
          <button
            className="hero-eye"
            onClick={onToggleHidden}
            aria-label={hidden ? "Show balance" : "Hide balance"}
          >
            {hidden ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        </div>
        <div className="hero-foot">
          <span className="hero-dots">•••• •••• •••• ••••</span>
          <span className="hero-delta-inline">
            {up ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />}
            {kes(Math.abs(rangeNet))} net {rangePhrase}
          </span>
        </div>
      </section>
      <div className="hero-dots-row">
        <span className="active" />
        <span />
        <span />
      </div>
    </>
  );
}

function MoreScreen({
  count,
  theme,
  onToggleTheme,
  onImport,
  onSample,
  onClear,
}: {
  count: number;
  theme: Theme;
  onToggleTheme: () => void;
  onImport: () => void;
  onSample: () => void;
  onClear: () => void;
}) {
  return (
    <div className="more">
      <div className="more-profile">
        <div className="more-avatar">
          <TrakMark size={30} />
        </div>
        <div>
          <div className="more-name">Your money on Trak</div>
          <div className="more-sub">{count} transactions · stored on this device</div>
        </div>
      </div>

      <div className="more-group">
        <button className="more-row" onClick={onToggleTheme}>
          <span className="more-ico">{theme === "dark" ? <IconSun size={19} /> : <IconMoon size={19} />}</span>
          <span className="more-label">Dark mode</span>
          <span className={`more-switch ${theme === "dark" ? "on" : ""}`}>
            <span />
          </span>
        </button>
        <InstallButton variant="row" />
        <button className="more-row" onClick={onImport}>
          <span className="more-ico">
            <IconPlus size={19} />
          </span>
          <span className="more-label">Import messages</span>
          <IconChevronRight size={18} />
        </button>
        <button className="more-row" onClick={onSample}>
          <span className="more-ico">
            <IconBulb size={19} />
          </span>
          <span className="more-label">Load sample data</span>
          <IconChevronRight size={18} />
        </button>
      </div>

      <div className="more-group">
        <div className="more-row static">
          <span className="more-ico">
            <IconShield size={19} />
          </span>
          <span className="more-label">
            Privacy
            <small>Read locally in your browser — nothing is uploaded.</small>
          </span>
        </div>
        <button className="more-row danger" onClick={onClear}>
          <span className="more-ico">
            <IconTrash size={19} />
          </span>
          <span className="more-label">Clear all data</span>
          <IconChevronRight size={18} />
        </button>
      </div>

      <p className="more-foot">Trak · Mobile money spending tracker</p>
    </div>
  );
}

function Mini({
  label,
  value,
  color,
  icon,
  cls,
}: {
  label: string;
  value: string;
  color: string;
  icon: ReactNode;
  cls?: string;
}) {
  return (
    <div className="mini">
      <span
        className="mini-chip"
        style={{ color, background: `color-mix(in srgb, ${color} 15%, var(--surface-1))` }}
      >
        {icon}
      </span>
      <div className="lbl">{label}</div>
      <div className={`val ${cls ?? ""}`}>{value}</div>
    </div>
  );
}

/** A short "latest transactions" preview shown on the overview tab. */
function RecentPreview({
  transactions,
  onSeeAll,
  onOpenTxn,
}: {
  transactions: Transaction[];
  onSeeAll: () => void;
  onOpenTxn: (t: Transaction) => void;
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
        <TransactionList transactions={recent} compact onOpenTxn={onOpenTxn} />
      </div>
    </section>
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
