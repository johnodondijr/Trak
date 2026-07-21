/**
 * Spending categorization.
 *
 * Maps a parsed transaction to a high-level {@link Category} using two signals:
 *  1. the transaction {@link TransactionType} (a withdrawal is always
 *     "withdrawal", airtime is always "airtime", income is "income", ...); and
 *  2. keyword matching on the counterparty name for the discretionary types
 *     (send / till / paybill), so "NAIVAS" → shopping, "SHELL" → transport.
 *
 * The keyword lists are intentionally editable and data-driven so the mapping
 * can grow without touching control flow.
 */
import type { Transaction, Category } from "./parser/types";

/** Ordered keyword → category rules. First match wins. */
const KEYWORD_RULES: Array<{ category: Category; keywords: string[] }> = [
  {
    category: "food",
    keywords: [
      "restaurant",
      "cafe",
      "coffee",
      "kfc",
      "java",
      "pizza",
      "chicken",
      "hotel",
      "eatery",
      "kitchen",
      "food",
      "bakers",
      "butchery",
      "grocer",
      "mama",
    ],
  },
  {
    category: "transport",
    keywords: [
      "shell",
      "total",
      "petrol",
      "fuel",
      "energy",
      "rubis",
      "uber",
      "bolt",
      "little",
      "matatu",
      "sacco",
      "fare",
      "parking",
      "ke bus",
      "transport",
      "oil libya",
      "gulf energy",
    ],
  },
  {
    category: "bills",
    keywords: [
      "kplc",
      "kenya power",
      "water",
      "nairobi water",
      "dstv",
      "gotv",
      "zuku",
      "safaricom home",
      "faiba",
      "rent",
      "nhif",
      "sha",
      "insurance",
      "school",
      "college",
      "university",
      "hospital",
      "clinic",
      "kra",
      "county",
      "electricity",
      "token",
    ],
  },
  {
    category: "entertainment",
    keywords: [
      "netflix",
      "showmax",
      "spotify",
      "youtube",
      "prime video",
      "dazn",
      "bet",
      "sportpesa",
      "betika",
      "cinema",
      "imax",
      "club",
      "lounge",
      "game",
      "playstation",
      "steam",
    ],
  },
  {
    category: "shopping",
    keywords: [
      "naivas",
      "carrefour",
      "quickmart",
      "supermarket",
      "shop",
      "store",
      "mall",
      "boutique",
      "clothes",
      "electronics",
      "chandarana",
      "tuskys",
      "jumia",
      "pharmacy",
      "chemist",
      "hardware",
    ],
  },
  {
    category: "business",
    keywords: [
      "ltd",
      "limited",
      "enterprises",
      "wholesalers",
      "distributors",
      "suppliers",
      "traders",
      "co-op",
      "agencies",
    ],
  },
];

/**
 * Assign a spending category to a parsed transaction. Pure and deterministic:
 * the same transaction always yields the same category.
 */
export function categorize(txn: Omit<Transaction, "category">): Category {
  switch (txn.type) {
    case "receive":
    case "deposit":
    case "reversal":
      return txn.type === "deposit" ? "deposit" : "income";
    case "withdraw":
      return "withdrawal";
    case "airtime":
      return "airtime";
    case "charge":
      return "charges";
    case "fuliza":
      return "fuliza";
    case "balance":
    case "failed":
    case "unknown":
      return "other";
    default:
      break;
  }

  // Discretionary spend (send / till / paybill): match on counterparty.
  const name = (txn.counterparty ?? "").toLowerCase();
  if (name) {
    for (const rule of KEYWORD_RULES) {
      if (rule.keywords.some((kw) => name.includes(kw))) {
        return rule.category;
      }
    }
  }

  // Fallbacks by type when no keyword matched.
  if (txn.type === "send") return "transfers";
  if (txn.type === "paybill") return "bills";
  if (txn.type === "till") return "shopping";
  return "other";
}
