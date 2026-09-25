"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __pwaInstallPrompt?: Event | null;
  }
}

/** Global client-side effects: service worker, install prompt capture, dynamic favicon. */
export function AppEffects() {
  useEffect(() => {
    // Service worker (production only, to avoid stale caches in dev).
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Capture the PWA install prompt for the Settings install button.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa-install-available"));
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Dynamic favicon from user branding (falls back to the default icon).
    import("@/lib/queries/user-settings")
      .then(({ getUserSettings }) => getUserSettings())
      .then((settings) => {
        if (!settings?.logo_data) return;
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.type = "image/png";
        link.href = settings.logo_data;
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  return null;
}
