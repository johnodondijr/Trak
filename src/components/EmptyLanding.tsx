import { useState } from "react";

/**
 * First-run landing + onboarding. A bold hero (floating card collage, headline,
 * "Get Started") leads into a short explainer: why a quick SMS backup is needed
 * today, the three steps to do it, and a heads-up that automatic SMS reading is
 * on the way. Only after that does the user import.
 */
export function EmptyLanding({
  onImport,
  onSample,
}: {
  onImport: () => void;
  onSample: () => void;
}) {
  const [step, setStep] = useState<"landing" | "how">("landing");

  if (step === "how") {
    return (
      <div className="onboard">
        <button className="back" onClick={() => setStep("landing")}>
          ← Back
        </button>
        <h2 className="onboard-title">Bring in your messages</h2>
        <p className="onboard-why">
          Trak turns your M-Pesa &amp; Airtel Money SMS into clear reports. A website can't open
          your phone's inbox directly — browsers block that for privacy — so for now you add your
          messages with a quick, one-time backup. Everything is read locally on your device.
        </p>

        <ol className="steps">
          <li>
            <span className="step-n">1</span>
            <div>
              <strong>Install “SMS Backup &amp; Restore”</strong>
              <p>It's a free, trusted app on the Google Play Store.</p>
            </div>
          </li>
          <li>
            <span className="step-n">2</span>
            <div>
              <strong>Back up your messages as XML</strong>
              <p>Open the app → Back up → choose Messages → save the .xml file.</p>
            </div>
          </li>
          <li>
            <span className="step-n">3</span>
            <div>
              <strong>Upload the file to Trak</strong>
              <p>Trak keeps only your M-Pesa, Airtel &amp; bank transactions.</p>
            </div>
          </li>
        </ol>

        <div className="soon">
          <span className="soon-tag">Coming soon</span>
          <p>
            We're building <strong>automatic SMS reading</strong>, so a future version of Trak will
            capture new transactions on its own — no backups needed. It's under active development.
          </p>
        </div>

        <div className="onboard-actions">
          <button className="btn btn-primary block" onClick={onImport}>
            Import my messages
          </button>
          <button className="btn btn-ghost block" onClick={onSample}>
            Try with sample data first
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="collage" aria-hidden>
        <div className="c-card c-balance">
          <div className="c-brandline">
            <span className="c-chip-mc" />
            M-PESA
          </div>
          <div className="c-bal-label">Balance</div>
          <div className="c-bal">KES 42,500</div>
        </div>
        <div className="c-card c-income">
          <div className="c-row-ico">⬇️</div>
          <div>
            <div className="c-row-title">Received</div>
            <div className="c-row-amt pos">+KES 8,000</div>
          </div>
        </div>
        <div className="c-pill c-pill-1">🛍️ Shopping</div>
        <div className="c-pill c-pill-2">📈 Trends</div>
        <div className="c-pill c-pill-3">Airtel Money</div>
      </div>

      <div className="landing-copy">
        <h1 className="landing-h1">
          Know where
          <br />
          your money goes.
        </h1>
        <p className="landing-sub">
          Trak turns your M-Pesa &amp; Airtel Money messages into clear spending reports, income
          summaries and insights — automatically.
        </p>
        <button className="btn btn-primary block big" onClick={() => setStep("how")}>
          Get started
        </button>
        <button className="btn btn-ghost block" onClick={onSample}>
          Explore with sample data
        </button>
      </div>
    </div>
  );
}
