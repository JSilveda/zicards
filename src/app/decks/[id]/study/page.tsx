"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { StudySession } from "@/components/study-session";
import { getDeck } from "@/lib/queries/decks";
import { ArrowLeft } from "lucide-react";
import type { Deck } from "@/types";
import { LoadingPage } from "@/components/ui/loading";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const mode = (searchParams.get("mode") as "learn" | "review" | "game" | "autoplay") || "review";
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDeck = useCallback(async () => {
    try {
      const data = await getDeck(deckId);
      if (!data) {
        router.push("/decks");
        return;
      }
      setDeck(data);
    } catch (error) {
      console.error("Failed to load deck:", error);
    } finally {
      setLoading(false);
    }
  }, [deckId, router]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  if (loading) return <LoadingPage />;
  if (!deck) return null;

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Link
          href={`/decks/${deckId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {deck.name}
        </Link>

        <h1 className="text-2xl font-bold mb-6 text-center">
          {mode === "learn" && "Learning"}
          {mode === "review" && "Reviewing"}
          {mode === "game" && "Game Mode"}
          {mode === "autoplay" && "Autoplay"}
          : {deck.name}
        </h1>

        <StudySession deck={deck} mode={mode} />
      </main>
    </AuthGuard>
  );
}
