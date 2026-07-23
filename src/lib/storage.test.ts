import { describe, it, expect, beforeEach } from "vitest";
import { loadTransactions } from "./storage";

const STORAGE_KEY = "trak.transactions.v1";

describe("transaction storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("re-parses stored raw SMS so parser improvements apply after reload", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          ref: "SK70WGPU5M",
          provider: "mpesa",
          type: "paybill",
          direction: "expense",
          amount: 35,
          cost: 0,
          balance: 70.02,
          counterparty: "SAFARICOM DATA BUNDLES",
          account: "SAFARICOM",
          institution: null,
          category: "bills",
          date: "2024-11-07T09:58:12.237Z",
          raw: "SK70WGPU5M Confirmed. Ksh35.00 sent to SAFARICOM DATA BUNDLES for account SAFARICOM DATA BUNDLES on 7/11/24 at 12:58 PM. New M-PESA balance is Ksh70.02. Transaction cost, Ksh0.00.",
        },
      ]),
    );

    const [txn] = loadTransactions();
    expect(txn.type).toBe("airtime");
    expect(txn.category).toBe("airtime");
    expect(txn.date.toISOString()).toBe("2024-11-07T09:58:12.237Z");
  });
});
