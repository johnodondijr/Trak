import { describe, it, expect } from "vitest";
import { parseMessage } from "./index";

/**
 * Built from real user-supplied samples (names/numbers/codes anonymized, wording
 * preserved). Covers messy standard M-Pesa fields plus bank-sourced templates.
 */
describe("standard M-Pesa field cleanup", () => {
  it("strips a masked phone number off the counterparty name", () => {
    const t = parseMessage(
      "UGL1234567 Confirmed.You have received Ksh150.00 from ALEX KIPTOO 0769***211 on 21/7/26 at 2:51 PM  New M-PESA balance is Ksh2,779.65. Download My OneApp on https://saf.cx/xxx",
    );
    expect(t).not.toBeNull();
    expect(t!.type).toBe("receive");
    expect(t!.amount).toBe(150);
    expect(t!.counterparty).toBe("ALEX KIPTOO");
    expect(t!.balance).toBeCloseTo(2779.65, 2);
    expect(t!.provider).toBe("mpesa");
  });

  it("handles 'paid to' with no space before New balance", () => {
    const t = parseMessage(
      "UGL2234567 Confirmed. Ksh345.00 paid to Naivas  Lifestyle. on 21/7/26 at 3:01 PM.New M-PESA balance is Ksh2,434.65. Transaction cost, Ksh0.00.",
    );
    expect(t!.type).toBe("till");
    expect(t!.counterparty).toBe("Naivas Lifestyle");
    expect(t!.category).toBe("shopping");
    expect(t!.balance).toBeCloseTo(2434.65, 2);
  });
});

describe("bank-sourced messages", () => {
  it("parses an I&M card purchase", () => {
    const t = parseMessage(
      "Dear JOHN, You made a purchase ofKES 299.00 on 2026-07-21 10:19:31 at GOOGLE *YouTube using I&M 5477********6714. If you did not effect the transaction, urgently contact us on 0719088000 or Toll Free 0800721088.",
    );
    expect(t).not.toBeNull();
    expect(t!.provider).toBe("bank");
    expect(t!.institution).toBe("I&M");
    expect(t!.type).toBe("till");
    expect(t!.direction).toBe("expense");
    expect(t!.amount).toBe(299);
    expect(t!.counterparty).toBe("GOOGLE *YouTube");
    expect(t!.category).toBe("entertainment");
    expect(t!.account).toBe("5477********6714");
    expect(t!.date.getFullYear()).toBe(2026);
    expect(t!.date.getMonth()).toBe(6); // July
    expect(t!.date.getDate()).toBe(21);
    expect(t!.date.getHours()).toBe(10);
  });

  it("parses a bank-to-M-Pesa credit (Equity)", () => {
    const t = parseMessage(
      "ALEX KIPTOO has sent KShs. 600.0 to your MPESA. The MPESA receipt number is  UGF1234567 and transaction reference is  EQA5BAF0DB23C03.",
    );
    expect(t).not.toBeNull();
    expect(t!.type).toBe("receive");
    expect(t!.direction).toBe("income");
    expect(t!.amount).toBe(600);
    expect(t!.counterparty).toBe("ALEX KIPTOO");
    expect(t!.ref).toBe("UGF1234567");
    expect(t!.institution).toBe("Equity");
    expect(t!.category).toBe("income");
  });

  it("parses an MCoopCash app send (Co-op Bank)", () => {
    const t = parseMessage(
      "Dear JANE DOE, you have sent Ksh. 16080.0 to DANIEL CHUMA 01116******500 \n on 07/11/2026 at 15:19:25. MPESA Ref. UGB1234567. Pay bills on MCoopCash App or Dial *667#.",
    );
    expect(t).not.toBeNull();
    expect(t!.type).toBe("send");
    expect(t!.direction).toBe("expense");
    expect(t!.amount).toBe(16080);
    expect(t!.counterparty).toBe("DANIEL CHUMA");
    expect(t!.ref).toBe("UGB1234567");
    expect(t!.institution).toBe("Co-op Bank");
    expect(t!.date.getMonth()).toBe(10); // November (DD/MM/YYYY)
    expect(t!.date.getDate()).toBe(7);
  });

  it("rejects a bank advert (no real transaction template)", () => {
    expect(
      parseMessage("Dear customer, get a loan of KES 50,000 instantly with I&M. Dial *458#."),
    ).toBeNull();
    expect(
      parseMessage("Equity: Your loan limit is now KES 100,000. Apply on EazzyApp today."),
    ).toBeNull();
  });
});
