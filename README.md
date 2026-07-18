# Trak — Mobile Money Spending Tracker

A smart personal-finance app for people who use **M-Pesa** and **Airtel Money**
as their main way of sending, receiving, and spending money.

Trak turns ordinary mobile-money SMS messages into a clear financial record —
organized spending reports, income summaries, and financial insights — so you
know exactly where your money goes without manually checking hundreds of
messages.

> **Core value:** Know exactly where your mobile money goes without manually
> checking your messages or recording every transaction.

---

## What it does

Paste your M-Pesa / Airtel Money SMS messages and Trak automatically:

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
│   ├── categorize.ts       # Transaction → spending Category
│   ├── analytics.ts        # totals, period summaries, trends, insights
│   ├── analytics.test.ts
│   ├── storage.ts          # localStorage persistence + merge/de-dup
│   └── format.ts           # currency/date formatting, category colors & icons
├── data/sampleMessages.ts  # realistic sample inbox (fictional data)
├── components/             # React UI (dashboard, charts, import, ledger)
├── App.tsx                 # state, range filtering, layout
└── main.tsx
```

### How parsing works

Each provider has a set of loosely-matched templates tried most-specific first
(e.g. a Paybill `"...for account..."` clause is matched before a plain send).
The matchers tolerate extra clauses and small wording changes between provider
releases, and any line that can't be parsed is collected and reported rather
than silently dropped. Batch imports de-duplicate by transaction code, so
re-importing the same inbox is idempotent.

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

## Tech

- **React 18 + TypeScript** (strict), built with **Vite**
- **Vitest** for unit tests (parser, categorization, analytics)
- Zero runtime dependencies beyond React — charts are hand-built SVG

## Privacy

Trak never uploads your messages. Parsing and all analytics run in your browser,
and your transactions are stored locally on your device.
