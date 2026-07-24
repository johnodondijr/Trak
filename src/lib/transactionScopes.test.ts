import { describe, expect, it } from "vitest";
import type { Transaction } from "./parser/types";
import {
  bankOnlyTransactions,
  transactionsForLine,
  walletLineOptions,
  walletTransactions,
} from "./transactionScopes";

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

  it("builds line options and filters wallet transactions by line id", () => {
    const lineOne = txn({ ref: "A", lineId: "sub:1" });
    const lineSeven = txn({ ref: "B", lineId: "sub:7" });
    const bankToMpesa = txn({
      ref: "C",
      provider: "bank",
      raw: "Bank to M-PESA transfer of KES 1,100.00 successfully processed. M-PESA Ref ID: C",
    });

    expect(walletLineOptions([lineSeven, bankToMpesa, lineOne])).toEqual([
      { id: "sub:1", label: "Line 1", count: 1 },
      { id: "sub:7", label: "Line 2", count: 1 },
    ]);
    expect(transactionsForLine([lineOne, lineSeven, bankToMpesa], "sub:7")).toEqual([lineSeven]);
  });

  it("caps detected lines to the declared count, folding strays into the busiest line", () => {
    // Two real lines plus a small stray group (e.g. a re-seated SIM's new sub-id).
    const primary = Array.from({ length: 12 }, (_, i) => txn({ ref: `p${i}`, lineId: "sub:1" }));
    const second = Array.from({ length: 9 }, (_, i) => txn({ ref: `s${i}`, lineId: "sub:2" }));
    const stray = Array.from({ length: 2 }, (_, i) => txn({ ref: `x${i}`, lineId: "sub:5" }));
    const all = [...primary, ...second, ...stray];

    // Declaring two lines shows exactly two — the stray folds into the busiest.
    const lines = walletLineOptions(all, 2);
    expect(lines).toEqual([
      { id: "sub:1", label: "Line 1", count: 14 }, // 12 + 2 stray
      { id: "sub:2", label: "Line 2", count: 9 },
    ]);
    // The folded stray is reachable via its canonical (busiest) line.
    expect(transactionsForLine(all, "sub:1", 2)).toHaveLength(14);
    expect(transactionsForLine(all, "sub:2", 2)).toHaveLength(9);
  });

  it("shows no switcher when the user declares a single line", () => {
    const a = txn({ ref: "a", lineId: "sub:1" });
    const b = txn({ ref: "b", lineId: "sub:2" });
    expect(walletLineOptions([a, b], 1)).toEqual([]);
    // A single declared line still returns every wallet transaction under "all".
    expect(transactionsForLine([a, b], "all", 1)).toHaveLength(2);
  });

  it("drops an obvious phantom line in auto mode", () => {
    const primary = Array.from({ length: 30 }, (_, i) => txn({ ref: `p${i}`, lineId: "sub:1" }));
    const phantom = [txn({ ref: "ph", lineId: "sub:9" })]; // 1 of 31 → below 10%
    expect(walletLineOptions([...primary, ...phantom])).toEqual([]);
  });
});
