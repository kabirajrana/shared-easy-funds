import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "sajha.install-banner-dismissed";
const SEEN_KEY = "sajha.install-banner-seen";

type InstallAppBannerProps = {
  className?: string;
  forceVisible?: boolean;
};

export function InstallAppBanner({ className, forceVisible = false }: InstallAppBannerProps) {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    const seen = window.localStorage.getItem(SEEN_KEY) === "1";
    setFirstVisit(!seen);

    if (!standalone && !dismissed && (!seen || forceVisible)) {
      setVisible(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!dismissed && !standalone) {
        setVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
      window.localStorage.setItem(DISMISS_KEY, "1");
    };

    if (!seen) {
      window.localStorage.setItem(SEEN_KEY, "1");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [forceVisible]);

  const shouldShowHint = firstVisit && !deferredPrompt;

  if (!visible || installed) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        window.localStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
      }
      setDeferredPrompt(null);
      return;
    }

    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      className={cn(
        "rounded-[20px] border border-[rgba(26,107,90,0.18)] bg-[linear-gradient(135deg,rgba(26,107,90,0.10),rgba(255,255,255,1))] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--saj-green)]">
        Install app
      </p>
      <h2 className="mt-1 text-[15px] font-semibold text-[var(--saj-text)]">
        Add Sajha to your phone
      </h2>
      <p className="mt-1 text-[12px] leading-5 text-[var(--saj-muted)]">
        Install Sajha for a mobile-app style experience with quicker access and a smoother daily flow.
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" onClick={handleInstall} className="flex-1 rounded-full">
          {deferredPrompt ? "Install now" : "Got it"}
        </Button>
        <Button type="button" variant="secondary" onClick={dismiss} className="rounded-full">
          Later
        </Button>
      </div>
      {shouldShowHint ? (
        <p className="mt-2 text-[11px] text-[var(--saj-muted)]">
          First time here? Add Sajha to your home screen for a smoother mobile-app style experience.
        </p>
      ) : !deferredPrompt ? (
        <p className="mt-2 text-[11px] text-[var(--saj-muted)]">
          If your browser does not show a prompt, open the browser menu and choose Add to Home Screen.
        </p>
      ) : null}
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void> | void;
};
