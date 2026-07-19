import { describe, it, expect } from "vitest";
import { importContent } from "./index";
import { parseSmsBackup } from "./smsBackup";
import { parseDelimited } from "./delimited";
import { classifyDetails, parseStatement, isStatementTable } from "./statement";

describe("SMS Backup & Restore XML import", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<smses count="4">
  <sms protocol="0" address="MPESA" date="1751525520000" type="1" body="TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to JOHN KAMAU 0712345678 on 3/7/26 at 8:32 AM. New M-PESA balance is Ksh12,480.00. Transaction cost, Ksh25.00." read="1" />
  <sms protocol="0" address="MPESA" date="1751525000000" type="1" body="TFA2C3D4E5 Confirmed. You have received Ksh8,000.00 from MARY WANJIKU 0723456789 on 1/7/26 at 9:15 AM. New M-PESA balance is Ksh14,005.00." read="1" />
  <sms protocol="0" address="AirtelMoney" date="1751520000000" type="1" body="You have sent Ksh500.00 to SAMUEL KIPROTICH 0730111222. Your new balance is Ksh2,200.00. Transaction ID: PP7788AA. Charge Ksh0.00. Airtel Money." read="1" />
  <sms protocol="0" address="Safaricom" date="1751519000000" type="1" body="Dear customer, enjoy 5GB for Ksh300. Dial *544#." read="1" />
</smses>`;

  it("extracts sms records with address and epoch date", () => {
    const records = parseSmsBackup(xml);
    expect(records).toHaveLength(4);
    expect(records[0].address).toBe("MPESA");
    expect(records[0].date?.getTime()).toBe(1751525520000);
  });

  it("imports only recognized mobile-money transactions and skips promos", () => {
    const res = importContent(xml, "sms-20260703.xml");
    expect(res.source).toBe("sms-backup");
    expect(res.transactions).toHaveLength(3); // promo skipped
    expect(res.skipped).toBe(1);
    // The authoritative SMS epoch date overrides the in-text date.
    const send = res.transactions.find((t) => t.ref === "TFA1B2C3D4")!;
    expect(send.date.getTime()).toBe(1751525520000);
    expect(send.type).toBe("send");
  });

  it("uses the sender address to set the provider", () => {
    const res = importContent(xml, "backup.xml");
    const airtel = res.transactions.find((t) => t.ref === "PP7788AA")!;
    expect(airtel.provider).toBe("airtel");
  });
});

describe("delimited parsing", () => {
  it("handles quoted fields containing commas", () => {
    const table = parseDelimited(
      `Receipt,Details,Amount\nABC123,"Pay Bill to 888880 - KPLC, PREPAID",1500`,
    );
    expect(table).not.toBeNull();
    expect(table!.rows[0][1]).toBe("Pay Bill to 888880 - KPLC, PREPAID");
  });
});

describe("M-Pesa statement import", () => {
  const csv = `Receipt No.,Completion Time,Details,Transaction Status,Paid In,Withdrawn,Balance
TFA0000001,2026-07-03 08:32:15,Customer Transfer to 254712345678 - JOHN KAMAU,Completed,,1500.00,12480.00
TFB0000002,2026-07-01 09:15:00,Funds received from 254723456789 - MARY WANJIKU,Completed,8000.00,,14005.00
TFC0000003,2026-07-05 19:45:00,Pay Bill to 888880 - KPLC PREPAID - Acc. 12345678,Completed,,2300.00,9730.00
TFD0000004,2026-07-05 20:00:00,Merchant Payment to 123456 - NAIVAS SUPERMARKET,Completed,,450.00,9280.00
TFE0000005,2026-07-06 12:00:00,Pay Bill Charge,Completed,,23.00,9257.00`;

  it("detects a statement table", () => {
    const table = parseDelimited(csv)!;
    expect(isStatementTable(table)).toBe(true);
  });

  it("maps rows to categorized transactions using Paid In / Withdrawn", () => {
    const res = importContent(csv, "statement.csv");
    expect(res.source).toBe("statement");
    expect(res.transactions).toHaveLength(5);

    const send = res.transactions.find((t) => t.ref === "TFA0000001")!;
    expect(send.direction).toBe("expense");
    expect(send.amount).toBe(1500);
    expect(send.type).toBe("send");
    expect(send.counterparty).toBe("JOHN KAMAU");

    const recv = res.transactions.find((t) => t.ref === "TFB0000002")!;
    expect(recv.direction).toBe("income");
    expect(recv.amount).toBe(8000);
    expect(recv.category).toBe("income");

    const paybill = res.transactions.find((t) => t.ref === "TFC0000003")!;
    expect(paybill.type).toBe("paybill");
    expect(paybill.category).toBe("bills");
    expect(paybill.account).toBe("12345678");

    const till = res.transactions.find((t) => t.ref === "TFD0000004")!;
    expect(till.type).toBe("till");
    expect(till.counterparty).toBe("NAIVAS SUPERMARKET");

    const charge = res.transactions.find((t) => t.ref === "TFE0000005")!;
    expect(charge.type).toBe("charge");
    expect(charge.category).toBe("charges");
  });

  it("parses the statement completion time into the transaction date", () => {
    const res = importContent(csv, "statement.csv");
    const send = res.transactions.find((t) => t.ref === "TFA0000001")!;
    expect(send.date.getFullYear()).toBe(2026);
    expect(send.date.getMonth()).toBe(6); // July
    expect(send.date.getDate()).toBe(3);
  });
});

describe("classifyDetails", () => {
  it("classifies common M-Pesa detail strings", () => {
    expect(classifyDetails("Airtime Purchase", "expense").type).toBe("airtime");
    expect(classifyDetails("Customer Withdrawal At Agent 456789", "expense").type).toBe("withdraw");
    expect(classifyDetails("Pay Bill Online to 888880 - KPLC", "expense").type).toBe("paybill");
    expect(classifyDetails("OD Loan Repayment", "expense").type).toBe("fuliza");
    expect(classifyDetails("Reversal of transaction", "income").type).toBe("reversal");
  });
});

describe("plain text fallback", () => {
  it("still parses pasted messages", () => {
    const res = importContent(
      "TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to JOHN KAMAU 0712345678 on 3/7/26 at 8:32 AM. New M-PESA balance is Ksh12,480.00. Transaction cost, Ksh25.00.",
    );
    expect(res.source).toBe("text");
    expect(res.transactions).toHaveLength(1);
  });
});

describe("statement empty-row handling", () => {
  it("skips rows with no money movement", () => {
    const table = parseDelimited(
      `Receipt No.,Completion Time,Details,Paid In,Withdrawn,Balance\nX1,2026-07-03 08:00:00,Balance Enquiry,,,12480.00`,
    )!;
    const { transactions, skipped } = parseStatement(table);
    expect(transactions).toHaveLength(0);
    expect(skipped).toBe(1);
  });
});
