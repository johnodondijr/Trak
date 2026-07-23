import { describe, expect, it } from "vitest";
import type { Transaction } from "./parser/types";
import { dedupeTransactions } from "./transactionDedupe";

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    ref: "ABC1234567",
    provider: "mpesa",
    type: "send",
    direction: "expense",
    amount: 70,
    cost: 0,
    balance: null,
    counterparty: "Someone",
    account: null,
    date: new Date("2026-07-23T12:34:00+03:00"),
    category: "transfers",
    raw: "ABC1234567 Confirmed. Ksh70.00 sent to Someone on 23/7/26 at 12:34 PM.",
    ...overrides,
  };
}

describe("transaction dedupe", () => {
  it("keeps Fuliza companions separate per M-Pesa line", () => {
    const lineOne = txn({
      type: "fuliza",
      category: "fuliza",
      lineId: "sub:1",
      raw: "ABC1234567 Confirmed. Fuliza M-PESA amount is Ksh 70.00.",
    });
    const lineTwo = txn({
      type: "fuliza",
      category: "fuliza",
      lineId: "sub:7",
      raw: "ABC1234567 Confirmed. Fuliza M-PESA amount is Ksh 70.00.",
    });

    expect(dedupeTransactions([lineOne, lineTwo])).toHaveLength(2);
  });

  it("still collapses bank and official M-Pesa movement confirmations by reference", () => {
    const bank = txn({
      provider: "bank",
      lineId: "sub:1",
      raw: "Bank to M-PESA transfer processed. M-PESA Ref ID: ABC1234567",
    });
    const mpesa = txn({
      lineId: "sub:7",
      balance: 432.66,
      raw: "ABC1234567 Confirmed. Ksh70.00 sent to Someone on 23/7/26 at 12:34 PM. New M-PESA balance is Ksh432.66.",
    });

    expect(dedupeTransactions([bank, mpesa])).toEqual([mpesa]);
  });
});
