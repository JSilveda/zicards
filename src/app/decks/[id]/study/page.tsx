"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { StudySession } from "@/components/study-session";
import { PairIt } from "@/components/games/pair-it";
import { GuessIt } from "@/components/games/guess-it";
import { RecallIt } from "@/components/games/recall-it";
import { TypeIt } from "@/components/games/type-it";
import { getDeck } from "@/lib/queries/decks";
import { getCards } from "@/lib/queries/cards";
import { LoadingPage } from "@/components/ui/loading";
import { ArrowLeft } from "lucide-react";
import type { Deck } from "@/types";
import type { Card as CardType } from "@/types";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const mode = searchParams.get("mode") || "review";
  const game = searchParams.get("game");

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeck = useCallback(async () => {
    try {
      const [deckData, cardsData] = await Promise.all([
        getDeck(deckId),
        getCards(deckId),
      ]);
      if (!deckData) {
        router.push("/decks");
        return;
      }
      setDeck(deckData);
      setCards(cardsData);
    } catch (error) {
      console.error("Failed to load deck:", error);
    } finally {
      setLoading(false);
    }
  }, [deckId, router]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  const handleGameComplete = () => {
    loadDeck();
  };

  if (loading) return <LoadingPage />;
  if (!deck) return null;

  const renderContent = () => {
    if (mode === "game" && game) {
      const gameCards = cards.slice(0, 10);

      switch (game) {
        case "pair-it":
          return <PairIt cards={gameCards} onComplete={handleGameComplete} />;
        case "guess-it":
          return (
            <GuessIt
              cards={gameCards}
              sourceLanguage={deck.source_language}
              targetLanguage={deck.target_language}
              onComplete={handleGameComplete}
            />
          );
        case "recall-it":
          return (
            <RecallIt
              cards={gameCards}
              sourceLanguage={deck.source_language}
              targetLanguage={deck.target_language}
              onComplete={handleGameComplete}
            />
          );
        case "type-it":
          return (
            <TypeIt
              cards={gameCards}
              sourceLanguage={deck.source_language}
              targetLanguage={deck.target_language}
              onComplete={handleGameComplete}
            />
          );
        default:
          return <StudySession deck={deck} mode={mode as "learn" | "review" | "game" | "autoplay"} />;
      }
    }

    return <StudySession deck={deck} mode={mode as "learn" | "review" | "game" | "autoplay"} />;
  };

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
          {mode === "game" && game === "pair-it" && "Pair It"}
          {mode === "game" && game === "guess-it" && "Guess It"}
          {mode === "game" && game === "recall-it" && "Recall It"}
          {mode === "game" && game === "type-it" && "Type It"}
          {mode === "autoplay" && "Autoplay"}
          : {deck.name}
        </h1>

        {renderContent()}
      </main>
    </AuthGuard>
  );
}
