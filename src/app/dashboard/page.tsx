"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { DashboardStats } from "@/components/dashboard-stats";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Track your learning progress</p>
          </div>
          <Link href="/decks/new">
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              New Deck
            </Button>
          </Link>
        </div>
        <DashboardStats />
      </main>
    </AuthGuard>
  );
}
