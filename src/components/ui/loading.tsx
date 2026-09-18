"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} />;
}

export function LoadingPage() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-xl border bg-card p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
      <div className="h-4 bg-muted rounded w-1/2 mb-2" />
      <div className="h-4 bg-muted rounded w-2/3" />
    </div>
  );
}
