import { describe, expect, it } from "vitest";
import type { Transaction } from "./parser/types";
import { bankOnlyTransactions, walletTransactions } from "./transactionScopes";

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    ref: "",
    provider: "mpesa",
    type: "send",
    direction: "expense",
    amount: 100,
    cost: 0,
    balance: null,
    counterparty: "Someone",
    account: null,
    date: new Date("2026-07-23T10:00:00+03:00"),
    category: "transfers",
    raw: "UGNPI00000 Confirmed. Ksh100.00 sent to Someone on 23/7/26 at 10:00 AM.",
    ...overrides,
  };
}

describe("transaction scopes", () => {
  it("keeps M-Pesa and bank-to-M-Pesa messages in the wallet dashboard", () => {
    const mpesa = txn({ provider: "mpesa" });
    const bankToMpesa = txn({
      provider: "bank",
      raw: "Bank to M-PESA transfer of KES 1,100.00 successfully processed. M-PESA Ref ID: UG7PIABFCF",
    });
    const bankCard = txn({
      provider: "bank",
      raw: "Dear customer, You made a purchase of KES 900.00 at A STORE using I&M card.",
    });

    expect(walletTransactions([mpesa, bankToMpesa, bankCard])).toEqual([mpesa, bankToMpesa]);
    expect(bankOnlyTransactions([mpesa, bankToMpesa, bankCard])).toEqual([bankCard]);
  });
});
