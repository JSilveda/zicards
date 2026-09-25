"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WifiOff, RotateCcw, LayoutDashboard } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-md text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="ZiCards" className="h-20 w-20 mx-auto mb-6 rounded-3xl" />
      <div className="flex justify-center mb-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4" />
          Sin conexión
        </span>
      </div>
      <h1 className="text-2xl font-bold mb-2">You&apos;re offline</h1>
      <p className="text-muted-foreground mb-6">
        Revisa tu conexión e inténtalo de nuevo. Tus datos están a salvo.
      </p>
      <div className="flex gap-2 justify-center">
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reintentar
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </div>
    </main>
  );
}
