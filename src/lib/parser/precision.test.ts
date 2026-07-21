import { describe, it, expect } from "vitest";
import { parseMessage } from "./index";
import { isMpesaTransaction } from "./mpesa";
import { isAirtelTransaction } from "./airtel";
import { importContent } from "../importers/index";

/**
 * These lock in that Trak only recognizes *official* M-Pesa / Airtel Money
 * transaction messages — not promos, reminders, adverts or spam. Several of
 * these were false positives before the structural gate was added.
 */
const NON_TRANSACTIONS = [
  // Promo / advert
  "Dear customer, enjoy 5GB for Ksh300. Dial *544# to buy. Terms apply.",
  "Get a KCB M-PESA loan of up to Ksh50,000 instantly. Dial *522#.",
  // Reminder that mentions a balance (old parser treated this as a balance txn)
  "REMINDER: Your M-PESA balance is Ksh1,250.00. Dial *334# for your statement.",
  // Fuliza limit reminder (not an actual Fuliza draw)
  "Your Fuliza M-PESA limit has been reviewed to Ksh500. Dial *234# for more.",
  // Spam using transaction-like wording (old parser matched "sent to ... on")
  "Congratulations! Ksh50,000 sent to your account instantly on loan approval. Reply YES.",
  // Airtel promo
  "Get 1GB for Ksh99 valid for 24hrs. Dial *544# now! Airtel.",
  // Personal message
  "Hi, please send me Ksh500 for lunch when you get a chance.",
];

describe("rejects non-transaction messages", () => {
  it.each(NON_TRANSACTIONS)("does not parse: %s", (msg) => {
    expect(parseMessage(msg)).toBeNull();
  });
});

describe("structural gates", () => {
  it("M-Pesa requires a leading transaction code + Confirmed/Failed", () => {
    expect(isMpesaTransaction("TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to X 0712345678 on 3/7/26 at 8:32 AM.")).toBe(true);
    expect(isMpesaTransaction("TFZ0000000 Failed. Ksh100.00 could not be sent.")).toBe(true);
    expect(isMpesaTransaction("Your M-PESA balance is Ksh1,250.00. Dial *334#.")).toBe(false);
    expect(isMpesaTransaction("Confirmed you are registered. Welcome to M-PESA.")).toBe(false);
  });

  it("Airtel requires a money verb + reference or brand", () => {
    expect(
      isAirtelTransaction("You have sent Ksh500.00 to X 0730111222. Transaction ID: PP7788AA. Airtel Money."),
    ).toBe(true);
    expect(isAirtelTransaction("Get 1GB for Ksh99. Dial *544#. Airtel.")).toBe(false);
    expect(isAirtelTransaction("You have Ksh50 airtime remaining.")).toBe(false);
  });
});

describe("still parses genuine transactions", () => {
  it("parses a normal M-Pesa send", () => {
    const t = parseMessage(
      "TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to JOHN KAMAU 0712345678 on 3/7/26 at 8:32 AM. New M-PESA balance is Ksh12,480.00. Transaction cost, Ksh25.00.",
    );
    expect(t?.type).toBe("send");
  });

  it("parses a genuine reversal but not a business named 'Reversal'", () => {
    const reversal = parseMessage(
      "TGX1234567 Confirmed. Reversal of transaction TFA1B2C3D4 has been reversed. Ksh500.00 has been credited to your M-PESA account on 4/7/26 at 9:00 AM.",
    );
    expect(reversal?.type).toBe("reversal");

    // A payment to a shop whose name contains "Reversal" must stay a Till pay.
    const shop = parseMessage(
      "TGY7654321 Confirmed. Ksh300.00 paid to REVERSAL AUTO SPARES. on 4/7/26 at 10:00 AM. New M-PESA balance is Ksh5,000.00. Transaction cost, Ksh0.00.",
    );
    expect(shop?.type).toBe("till");
  });
});

describe("non-transaction rejection on import", () => {
  it("skips loan-advert style messages, keeping only genuine transactions", () => {
    const xml = `<?xml version="1.0"?><smses count="2">
      <sms address="QuickLoan" date="1751525520000" type="1" body="Ksh5,000.00 sent to your account on approval. Repay in 30 days." />
      <sms address="MPESA" date="1751525520000" type="1" body="TFA1B2C3D4 Confirmed. Ksh1,500.00 sent to JOHN KAMAU 0712345678 on 3/7/26 at 8:32 AM. New M-PESA balance is Ksh12,480.00. Transaction cost, Ksh25.00." />
    </smses>`;
    const res = importContent(xml, "backup.xml");
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0].ref).toBe("TFA1B2C3D4");
    expect(res.skipped).toBe(1);
  });
});
