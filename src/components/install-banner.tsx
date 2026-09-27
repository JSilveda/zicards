"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

const DISMISSED_KEY = "pwa-banner-dismissed";

/** Proactive install banner: native prompt when available, iOS instructions otherwise. */
export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(ios);
    if (window.__pwaInstallPrompt) {
      setCanPrompt(true);
      setVisible(true);
    } else if (ios) {
      setVisible(true);
    }

    const onAvailable = () => {
      if (localStorage.getItem(DISMISSED_KEY)) return;
      setCanPrompt(true);
      setVisible(true);
    };
    window.addEventListener("pwa-install-available", onAvailable);
    return () => window.removeEventListener("pwa-install-available", onAvailable);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    const prompt = window.__pwaInstallPrompt as (Event & { prompt?: () => void }) | null | undefined;
    if (prompt?.prompt) prompt.prompt();
    window.__pwaInstallPrompt = null;
    dismiss();
  };

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        {canPrompt ? <Download className="h-5 w-5 text-primary" /> : <Share className="h-5 w-5 text-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm">Instala ZiCards en tu teléfono</p>
        <p className="text-xs text-muted-foreground">
          {canPrompt
            ? "Acceso rápido desde tu pantalla principal, funciona sin conexión."
            : "En Safari toca Compartir → “Agregar a pantalla de inicio”."}
        </p>
      </div>
      {canPrompt && (
        <Button size="sm" onClick={handleInstall} className="shrink-0">
          Instalar
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={dismiss} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
