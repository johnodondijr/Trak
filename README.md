# Trak — Mobile Money Spending Tracker

A smart personal-finance app for people who use **M-Pesa** and **Airtel Money**
as their main way of sending, receiving, and spending money.

Trak turns ordinary mobile-money SMS messages into a clear financial record —
organized spending reports, income summaries, and financial insights — so you
know exactly where your money goes without manually checking hundreds of
messages.

> **Core value:** Know exactly where your mobile money goes without manually
> checking your messages or recording every transaction.

**🔗 Live app:** https://johnodondijr.github.io/Trak/

---

## What it does

Import your M-Pesa / Airtel Money history and Trak automatically:

- **Reads and parses** each message into a structured transaction
  (send, receive, Paybill, Till/Buy Goods, airtime, withdrawal, deposit,
  charges, Fuliza, reversals, failed transactions).
- **Categorizes** spending into buckets: food, transport, shopping, bills,
  airtime, entertainment, business, transfers, and more.
- **Summarizes** how much you've spent and received **today / this week /
  this month / all-time**, plus total transaction charges and net flow.
- **Ranks** your biggest spending categories and the people & businesses you
  send money to most.
- **Charts** monthly income-vs-spending trends.
- **Surfaces insights** in plain language — biggest category, month-on-month
  changes, and a heads-up when charges or spending climb.

Everything runs **locally in your browser**. No message ever leaves your device;
transactions are stored only in `localStorage`.

---

## Getting your real data in

Trak is a website, so — like any website — it can't silently read your phone's
SMS inbox (browsers forbid that; only a native Android app could). Instead you
bring your data in through the **Import** dialog, which auto-detects the format:

| Source | How to get it | What Trak does |
|--------|---------------|----------------|
| **Full SMS history** *(recommended)* | Install the free **SMS Backup & Restore** app, back up **Messages** as **XML**, upload the `.xml` | Reads every SMS, keeps only M-Pesa/Airtel ones, uses each message's real timestamp |
| **M-Pesa statement** | Request it in the M-PESA app or via `*334#` → Statements; export to `.csv` | Maps the Receipt / Completion Time / Details / Paid In / Withdrawn columns straight to transactions |
| **Other SMS export** | Any CSV with a message/body column | Parses each row as an SMS |
| **Paste** | Copy a few messages from your Messages app | Parses the pasted text |

You can upload multiple files at once, and re-importing is idempotent
(duplicates are collapsed by transaction code).

> **Want truly automatic reading of new messages as they arrive?** That requires
> a native Android app with SMS permission (iOS blocks SMS access entirely).
> It's a planned follow-up — the parsing/analytics engine here is UI-agnostic and
> would be reused as-is.

---

## Architecture

The product's core value is the parsing + analytics engine, which is kept
completely separate from (and independently unit-tested without) the UI.

```
src/
├── lib/
│   ├── parser/
│   │   ├── types.ts        # Transaction domain model
│   │   ├── helpers.ts      # amount / date / name parsing helpers
│   │   ├── mpesa.ts        # M-Pesa SMS templates → Transaction
│   │   ├── airtel.ts       # Airtel Money SMS templates → Transaction
│   │   ├── index.ts        # public parse API + batch import + de-dup
│   │   └── parser.test.ts
│   ├── importers/
│   │   ├── smsBackup.ts    # SMS Backup & Restore XML → RawSms[]
│   │   ├── delimited.ts    # CSV/TSV tokenizer (quotes, delimiter detection)
│   │   ├── statement.ts    # M-Pesa statement rows → Transaction
│   │   ├── index.ts        # format auto-detection + dispatch
│   │   └── importers.test.ts
│   ├── categorize.ts       # Transaction → spending Category
│   ├── analytics.ts        # totals, period summaries, trends, insights
│   ├── analytics.test.ts
│   ├── storage.ts          # localStorage persistence + merge/de-dup
│   └── format.ts           # currency/date formatting, category colors & icons
├── data/sampleMessages.ts  # realistic sample inbox (fictional data)
├── components/             # React UI (hero, avatar rows, charts, import, ledger)
├── App.tsx                 # state, range filtering, layout
└── main.tsx
```

### How parsing works

Alongside M-Pesa and Airtel Money, Trak also parses **bank-sourced** messages
(`src/lib/parser/bank.ts`): card-purchase alerts (e.g. I&M), bank→M-Pesa credits
(e.g. Equity), and sends from bank apps that settle on M-Pesa (e.g. Co-op /
MCoopCash). Each carries its originating **institution** for display, and money
that moves over the M-Pesa rail keeps `provider: "mpesa"`.

Each provider has a set of loosely-matched templates tried most-specific first
(e.g. a Paybill `"...for account..."` clause is matched before a plain send).
The matchers tolerate extra clauses and small wording changes between provider
releases, and any line that can't be parsed is collected and reported rather
than silently dropped. Batch imports de-duplicate by transaction code, so
re-importing the same inbox is idempotent.

**Only official transactions are recognized** — promos, reminders, adverts and
spam are rejected by **strict structural parsing**, which runs on every import
path (file or paste). A genuine M-Pesa SMS must begin with a transaction code +
`Confirmed`/`Failed`; a genuine Airtel Money SMS must state a money verb in
shillings *and* carry a `Transaction ID` or the `Airtel Money` tag; a bank
message must match one of the specific bank templates (card purchase, bank→M-Pesa
credit, bank-app send with an M-Pesa reference). "Buy 5GB for Ksh300", "Your
balance is Ksh1,250", "Get a loan of KES 50,000" and the like match none of
these shapes and are skipped. Precision comes from the parsers themselves, so no
sender allowlist is needed — which means bank SMS (from many different senders)
are never pre-filtered out.

### Interface

Trak is styled as a mobile-first neobank app: a phone-width app column on a
sage backdrop, a signature hero card showing your **latest M-Pesa / Airtel Money
balance** (parsed from "New balance is …") with a net-flow delta, avatar-led
transaction rows grouped by day (Today / Yesterday / date), and a floating
bottom nav with **Home · Activity · Trends** plus a center Import action. It
reads full-screen on a phone and as a centered device-style column on desktop,
with light and dark themes.

First-run shows a **landing screen** (floating-card hero + "Get started") that
leads into a short onboarding explainer — why a one-time SMS backup is needed
today, the three steps to do it, and a "coming soon: automatic SMS reading"
note — before the user imports.

Interactions:

- **Tap any transaction** for a detail sheet with every field (amount, fee,
  running balance, counterparty, account, source/institution, code, date) and
  the original SMS.
- **Summaries drill down**: tapping a spending category or a top recipient
  expands the top transactions behind that total, with a **See all** link that
  opens the full list pre-filtered — so "KES 1,000,000 to Daniel" breaks back
  down into the individual payments.

### Data-visualization

Charts follow a validated, colorblind-safe categorical palette and are explicitly
stepped for both light and dark mode. Category colors are **fixed per category**
(never cycled by rank), magnitude comparisons use horizontal bar lists, and the
monthly trend uses a single shared value axis with a labeled legend — so meaning
never rests on color alone.

---

## Getting started

```bash
npm install       # install dependencies
npm run dev       # start the dev server (Vite)
npm test          # run the parser & analytics unit tests
npm run build     # type-check + production build
```

Open the app, click **Try with sample data** to explore instantly, or
**Import your messages** to paste your own.

## Deployment (GitHub Pages)

The app is a static SPA and deploys to GitHub Pages via GitHub Actions
(`.github/workflows/deploy.yml`). On every push to the default branch the
workflow runs the tests, builds the app, and publishes `dist/` to Pages.

**One-time setup (required):** in the repository, open **Settings → Pages →
Build and deployment** and set **Source** to **GitHub Actions**. (This can't be
automated — the Actions token isn't permitted to enable Pages.) After that, the
workflow deploys on every push and the site is live at
https://johnodondijr.github.io/Trak/.

## Tech

- **React 18 + TypeScript** (strict), built with **Vite**
- **Vitest** for unit tests (parser, categorization, analytics)
- Zero runtime dependencies beyond React — charts are hand-built SVG

## Privacy

Trak never uploads your messages. Parsing and all analytics run in your browser,
and your transactions are stored locally on your device.
