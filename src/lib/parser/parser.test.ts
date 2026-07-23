import { describe, it, expect } from "vitest";
import { parseMessage, parseMessages } from "./index";
import { parseAmount, parseDate, cleanName } from "./helpers";

describe("helpers", () => {
  it("parses KES amounts with separators and prefixes", () => {
    expect(parseAmount("Ksh1,234.50")).toBe(1234.5);
    expect(parseAmount("KES 20.00")).toBe(20);
    expect(parseAmount("1,000")).toBe(1000);
    expect(parseAmount("")).toBeNaN();
    expect(parseAmount(null)).toBeNaN();
  });

  it("cleans trailing punctuation from names", () => {
    expect(cleanName("NAIVAS SUPERMARKET.")).toBe("NAIVAS SUPERMARKET");
    expect(cleanName("  JOHN   DOE ")).toBe("JOHN DOE");
    expect(cleanName("")).toBeNull();
  });

  it("parses numeric dates with am/pm", () => {
    const d = parseDate("on 5/7/26 at 8:30 PM");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July (0-indexed)
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(20);
    expect(d.getMinutes()).toBe(30);
  });

  it("handles 12 AM/PM edge cases", () => {
    expect(parseDate("on 1/1/26 at 12:00 AM").getHours()).toBe(0);
    expect(parseDate("on 1/1/26 at 12:00 PM").getHours()).toBe(12);
  });
});

describe("M-Pesa parsing", () => {
  it("parses a send-money message", () => {
    const t = parseMessage(
      "TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to JOHN KAMAU 0712345678 on 3/7/26 at 8:32 AM. New M-PESA balance is Ksh12,480.00. Transaction cost, Ksh25.00.",
    );
    expect(t).not.toBeNull();
    expect(t!.type).toBe("send");
    expect(t!.direction).toBe("expense");
    expect(t!.amount).toBe(1500);
    expect(t!.cost).toBe(25);
    expect(t!.balance).toBe(12480);
    expect(t!.counterparty).toBe("JOHN KAMAU");
    expect(t!.account).toBe("0712345678");
    expect(t!.ref).toBe("TFA1B2C3D4");
    expect(t!.category).toBe("transfers");
  });

  it("parses a received-money message as income", () => {
    const t = parseMessage(
      "TFA2C3D4E5 Confirmed. You have received Ksh8,000.00 from MARY WANJIKU 0723456789 on 1/7/26 at 9:15 AM. New M-PESA balance is Ksh14,005.00.",
    );
    expect(t!.type).toBe("receive");
    expect(t!.direction).toBe("income");
    expect(t!.amount).toBe(8000);
    expect(t!.counterparty).toBe("MARY WANJIKU");
    expect(t!.category).toBe("income");
  });

  it("parses a till (buy goods) payment", () => {
    const t = parseMessage(
      "TFA3D4E5F6 Confirmed. Ksh450.00 paid to NAIVAS SUPERMARKET. on 4/7/26 at 1:10 PM. New M-PESA balance is Ksh12,030.00. Transaction cost, Ksh0.00.",
    );
    expect(t!.type).toBe("till");
    expect(t!.counterparty).toBe("NAIVAS SUPERMARKET");
    expect(t!.category).toBe("shopping");
    expect(t!.cost).toBe(0);
  });

  it("parses a paybill payment with account", () => {
    const t = parseMessage(
      "TFA4E5F6G7 Confirmed. Ksh2,300.00 sent to KPLC PREPAID for account 12345678 on 5/7/26 at 7:45 PM. New M-PESA balance is Ksh9,730.00. Transaction cost, Ksh0.00.",
    );
    expect(t!.type).toBe("paybill");
    expect(t!.counterparty).toBe("KPLC PREPAID");
    expect(t!.account).toBe("12345678");
    expect(t!.category).toBe("bills");
  });

  it("parses airtime purchase", () => {
    const t = parseMessage(
      "TFA5F6G7H8 Confirmed. You bought Ksh100.00 of airtime on 5/7/26 at 8:00 PM. New M-PESA balance is Ksh9,630.00. Transaction cost, Ksh0.00.",
    );
    expect(t!.type).toBe("airtime");
    expect(t!.amount).toBe(100);
    expect(t!.category).toBe("airtime");
  });

  it("treats money sent to Safaricom services as airtime/data spend", () => {
    const t = parseMessage(
      "SK70WGPU5M Confirmed. Ksh35.00 sent to SAFARICOM DATA BUNDLES for account SAFARICOM DATA BUNDLES on 7/11/24 at 12:58 PM. New M-PESA balance is Ksh70.02. Transaction cost, Ksh0.00.",
    );
    expect(t).not.toBeNull();
    expect(t!.type).toBe("airtime");
    expect(t!.amount).toBe(35);
    expect(t!.counterparty).toBe("SAFARICOM DATA BUNDLES");
    expect(t!.category).toBe("airtime");
  });

  it("parses a withdrawal", () => {
    const t = parseMessage(
      "TFA7H8I9J0 Confirmed. On 7/7/26 at 6:00 PM Withdraw Ksh3,000.00 from 456789 - QUICKCASH AGENCY. New M-PESA balance is Ksh5,430.00. Transaction cost, Ksh28.00.",
    );
    expect(t!.type).toBe("withdraw");
    expect(t!.amount).toBe(3000);
    expect(t!.cost).toBe(28);
    expect(t!.category).toBe("withdrawal");
    expect(t!.counterparty).toContain("QUICKCASH");
  });

  it("parses Fuliza borrowing", () => {
    const t = parseMessage(
      "TFB1K2L3M4 Confirmed. Fuliza M-PESA amount is Ksh500.00. Interest charged Ksh5.00. Total Fuliza M-PESA outstanding amount is Ksh505.00 due on 20/7/26.",
    );
    expect(t!.type).toBe("fuliza");
    expect(t!.amount).toBe(500);
    expect(t!.direction).toBe("neutral");
    expect(t!.category).toBe("fuliza");
  });

  it("flags failed transactions", () => {
    const t = parseMessage(
      "TFZ0000000 Failed. Ksh1,000.00 could not be sent to JOHN DOE. Your M-PESA balance is Ksh4,500.00.",
    );
    expect(t!.type).toBe("failed");
    expect(t!.direction).toBe("neutral");
  });

  it("categorizes transport by counterparty keyword", () => {
    const t = parseMessage(
      "TFA8I9J0K1 Confirmed. Ksh900.00 paid to SHELL KILELESHWA. on 8/7/26 at 5:20 PM. New M-PESA balance is Ksh4,530.00. Transaction cost, Ksh0.00.",
    );
    expect(t!.category).toBe("transport");
  });
});

describe("Airtel Money parsing", () => {
  it("parses an Airtel send", () => {
    const t = parseMessage(
      "You have sent Ksh500.00 to SAMUEL KIPROTICH 0730111222. Your new balance is Ksh2,200.00. Transaction ID: PP7788AA. Charge Ksh0.00. Airtel Money.",
    );
    expect(t!.provider).toBe("airtel");
    expect(t!.type).toBe("send");
    expect(t!.amount).toBe(500);
    expect(t!.counterparty).toBe("SAMUEL KIPROTICH");
    expect(t!.ref).toBe("PP7788AA");
  });

  it("parses an Airtel receive", () => {
    const t = parseMessage(
      "You have received Ksh1,200.00 from GRACE ADHIAMBO 0731222333. Your new balance is Ksh3,400.00. Transaction ID: PP7789BB. Airtel Money.",
    );
    expect(t!.provider).toBe("airtel");
    expect(t!.type).toBe("receive");
    expect(t!.direction).toBe("income");
    expect(t!.balance).toBe(3400);
  });

  it("parses an Airtel merchant payment and categorizes it", () => {
    const t = parseMessage(
      "You have paid Ksh650.00 to TOTAL ENERGIES. Your new balance is Ksh2,750.00. Transaction ID: PP7790CC. Charge Ksh0.00. Airtel Money.",
    );
    expect(t!.provider).toBe("airtel");
    expect(t!.type).toBe("till");
    expect(t!.category).toBe("transport");
  });
});

describe("batch parsing", () => {
  it("parses a multi-message paste and de-duplicates by ref", () => {
    const input = `
TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to JOHN KAMAU 0712345678 on 3/7/26 at 8:32 AM. New M-PESA balance is Ksh12,480.00. Transaction cost, Ksh25.00.

TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to JOHN KAMAU 0712345678 on 3/7/26 at 8:32 AM. New M-PESA balance is Ksh12,480.00. Transaction cost, Ksh25.00.

You have received Ksh1,200.00 from GRACE ADHIAMBO 0731222333. Your new balance is Ksh3,400.00. Transaction ID: PP7789BB. Airtel Money.
`;
    const { transactions, unparsed } = parseMessages(input);
    expect(transactions).toHaveLength(2); // duplicate collapsed
    expect(unparsed).toHaveLength(0);
  });

  it("keeps the official M-Pesa SMS when a bank confirmation shares the same ref", () => {
    const input = `
BRIAN ODIWUOR OLINGO has sent KShs. 7500.0 to your MPESA. The MPESA receipt number is  SL15V2IAC7 and transaction reference is  EQA9DAFD0E63D56.

SL15V2IAC7 Confirmed.You have received Ksh7,500.00 from Equity Bulk Account 300600 on 1/12/24 at 10:32 PM New M-PESA balance is Ksh7,578.38.
`;
    const { transactions } = parseMessages(input);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].ref).toBe("SL15V2IAC7");
    expect(transactions[0].balance).toBe(7578.38);
    expect(transactions[0].counterparty).toBe("Equity Bulk Account");
  });

  it("collects unparsed lines instead of dropping them silently", () => {
    const { transactions, unparsed } = parseMessages(
      "This is just a normal text message from a friend.",
    );
    expect(transactions).toHaveLength(0);
    expect(unparsed).toHaveLength(1);
  });

  it("returns transactions sorted newest first", () => {
    const input = `
TFA0000001 Confirmed. Ksh100.00 sent to A B 0700000000 on 1/1/26 at 8:00 AM. New M-PESA balance is Ksh100.00. Transaction cost, Ksh0.00.

TFA0000002 Confirmed. Ksh100.00 sent to C D 0700000000 on 5/1/26 at 8:00 AM. New M-PESA balance is Ksh100.00. Transaction cost, Ksh0.00.
`;
    const { transactions } = parseMessages(input);
    expect(transactions[0].ref).toBe("TFA0000002");
    expect(transactions[1].ref).toBe("TFA0000001");
  });
});
