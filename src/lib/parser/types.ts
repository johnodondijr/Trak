/**
 * Core domain types for parsed mobile-money transactions.
 *
 * A raw SMS from M-Pesa or Airtel Money is parsed into a normalized
 * {@link Transaction}. Everything downstream (categorization, analytics,
 * the dashboard) speaks in terms of this shape, so the parsers are the only
 * place that has to know about the messy provider-specific text formats.
 */

/** Which mobile-money network the message came from. */
export type Provider = "mpesa" | "airtel";

/**
 * The kind of transaction, derived from the message wording.
 * These are the raw money movements — {@link Category} is the higher-level
 * spending bucket assigned on top of these.
 */
export type TransactionType =
  | "send" // money sent to a person
  | "receive" // money received from a person
  | "paybill" // Paybill payment (utilities, rent, subscriptions...)
  | "till" // Buy Goods / Till payment (shops, restaurants...)
  | "airtime" // airtime or data bundle purchase
  | "withdraw" // cash withdrawal at an agent / ATM
  | "deposit" // cash deposit at an agent
  | "charge" // a standalone transaction fee
  | "fuliza" // Fuliza / overdraft borrowing or repayment
  | "reversal" // a reversed transaction (money returned)
  | "failed" // a failed transaction
  | "balance" // balance enquiry (no money movement)
  | "unknown";

/**
 * Whether a transaction increases or decreases the user's available money.
 * `income` = money in, `expense` = money out, `neutral` = no net movement
 * (balance checks, informational messages).
 */
export type Direction = "income" | "expense" | "neutral";

/** High-level spending buckets used for reporting. */
export type Category =
  | "food"
  | "transport"
  | "shopping"
  | "bills"
  | "airtime"
  | "entertainment"
  | "business"
  | "transfers"
  | "withdrawal"
  | "deposit"
  | "charges"
  | "income"
  | "fuliza"
  | "other";

export interface Transaction {
  /** Provider transaction code, e.g. M-Pesa "QGH7XXXX8Y" or Airtel ref. */
  ref: string;
  provider: Provider;
  type: TransactionType;
  direction: Direction;
  /** Principal amount moved, always a positive number in KES. */
  amount: number;
  /** Transaction cost / fee charged, in KES. 0 when none or unknown. */
  cost: number;
  /** Account balance after the transaction, if the message reported one. */
  balance: number | null;
  /** The other party — person name, business, till/paybill name, agent. */
  counterparty: string | null;
  /** Phone number or till/paybill/account number, when present. */
  account: string | null;
  /** When the transaction happened (parsed from the message). */
  date: Date;
  /** Spending category assigned by the categorizer. */
  category: Category;
  /** The original SMS text, kept for auditing and re-parsing. */
  raw: string;
}
