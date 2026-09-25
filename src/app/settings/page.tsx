"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Navbar } from "@/components/navbar";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserSettings, saveUserLogo } from "@/lib/queries/user-settings";
import { fileToLogoDataUrl, useBranding } from "@/lib/branding";
import {
  ArrowLeft,
  ImagePlus,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Download,
  Smartphone,
  Palette,
} from "lucide-react";

export default function SettingsPage() {
  const { logo, setLogo } = useBranding();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    getUserSettings()
      .then((s) => setLogo(s?.logo_data ?? null))
      .catch(() => {});
  }, [setLogo]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__pwaInstallPrompt) setInstallAvailable(true);
    const onAvailable = () => setInstallAvailable(true);
    window.addEventListener("pwa-install-available", onAvailable);
    const mq = window.matchMedia("(display-mode: standalone)");
    setInstalled(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setInstalled(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("pwa-install-available", onAvailable);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setMessage(null);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      await saveUserLogo(dataUrl);
      setLogo(dataUrl);
      // Refresh dynamic favicon immediately
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) {
        link.type = "image/png";
        link.href = dataUrl;
      }
      setMessage({ ok: true, text: "Logo guardado." });
    } catch {
      setMessage({ ok: false, text: "No se pudo procesar la imagen." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveUserLogo(null);
      setLogo(null);
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) {
        link.type = "image/svg+xml";
        link.href = "/icons/icon.svg";
      }
      setMessage({ ok: true, text: "Logo restaurado al predeterminado." });
    } catch {
      setMessage({ ok: false, text: "No se pudo guardar." });
    } finally {
      setSaving(false);
    }
  };

  const handleInstall = async () => {
    const prompt = window.__pwaInstallPrompt as (Event & { prompt?: () => void }) | null | undefined;
    if (!prompt) return;
    if (prompt.prompt) prompt.prompt();
    window.__pwaInstallPrompt = null;
    setInstallAvailable(false);
  };

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-6">Personaliza tu experiencia con ZiCards.</p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Logo y favicon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-background overflow-hidden">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Custom logo" className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/icons/icon-192.png" alt="Default logo" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{logo ? "Logo personalizado" : "Logo predeterminado"}</p>
                <p>Se muestra en la barra de navegación y como favicon de la pestaña.</p>
              </div>
            </div>

            <Input type="file" accept="image/*" onChange={handleFile} disabled={saving} />

            {message && (
              <p className={`text-sm flex items-center gap-1 ${message.ok ? "text-green-600" : "text-destructive"}`}>
                {message.ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {message.text}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={saving || !logo} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Restaurar predeterminado
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Nota: los iconos de instalación de la PWA usan el logo predeterminado, ya que se
              definen al instalar la app.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Instalar app
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {installed ? (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                ZiCards ya está instalada como app.
              </p>
            ) : installAvailable ? (
              <Button onClick={handleInstall} className="gap-2">
                <Download className="h-4 w-4" />
                Instalar ZiCards
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="flex items-center gap-1">
                  <ImagePlus className="h-4 w-4" />
                  Usa tu navegador para instalarla:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Chrome / Edge (PC y Android): menú ⋯ → “Instalar” o “Agregar a pantalla principal”.</li>
                  <li>iPhone (Safari): Compartir → “Agregar a pantalla de inicio”.</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </AuthGuard>
  );
}
