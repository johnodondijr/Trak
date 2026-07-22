import { useEffect, useState } from "react";
import { IconUpload } from "./icons";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __trakInstallPrompt?: BIPEvent | null;
  }
}

/**
 * "Install Trak" button. Shows only when the browser has offered an install
 * prompt (captured early in index.html into window.__trakInstallPrompt) and the
 * app isn't already installed. Clicking triggers the native install dialog.
 */
export function InstallButton({ variant = "landing" }: { variant?: "landing" | "header" }) {
  const [available, setAvailable] = useState(Boolean(window.__trakInstallPrompt));
  const [installed, setInstalled] = useState(
    typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches,
  );

  useEffect(() => {
    const onReady = () => setAvailable(Boolean(window.__trakInstallPrompt));
    const onInstalled = () => {
      setInstalled(true);
      setAvailable(false);
      window.__trakInstallPrompt = null;
    };
    // Fires if the prompt arrives after mount; index.html catches earlier ones.
    const onBip = (e: Event) => {
      (e as BIPEvent).preventDefault?.();
      window.__trakInstallPrompt = e as BIPEvent;
      setAvailable(true);
    };
    window.addEventListener("trak-install-ready", onReady);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("trak-install-ready", onReady);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const evt = window.__trakInstallPrompt;
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => undefined);
    window.__trakInstallPrompt = null;
    setAvailable(false);
  }

  if (installed || !available) return null;

  if (variant === "header") {
    return (
      <button className="icon-btn" onClick={install} aria-label="Install Trak app" title="Install Trak app">
        <IconUpload size={19} />
      </button>
    );
  }
  return (
    <button className="install-cta" onClick={install}>
      <IconUpload size={17} />
      Install Trak app
    </button>
  );
}
