"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StudyHeader } from "@/components/study-header";
import { StudySession } from "@/components/study-session";
import { PairIt } from "@/components/games/pair-it";
import { GuessIt } from "@/components/games/guess-it";
import { RecallIt } from "@/components/games/recall-it";
import { TypeIt } from "@/components/games/type-it";
import { getDeck } from "@/lib/queries/decks";
import { getCards } from "@/lib/queries/cards";
import { LoadingPage } from "@/components/ui/loading";
import type { Deck } from "@/types";
import type { Card as CardType } from "@/types";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });
import dynamic from "next/dynamic";

const activityTitles: Record<string, string> = {
  learn: "Learn",
  review: "Review words",
  game: "Game",
  autoplay: "Autoplay",
  "pair-it": "Pair It",
  "guess-it": "Guess It",
  "recall-it": "Recall It",
  "type-it": "Type It",
};

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
  const [studyProgress, setStudyProgress] = useState(0);

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

  const handleComplete = () => {
    loadDeck();
  };

  const handleBack = () => {
    router.push(`/decks/${deckId}`);
  };

  if (loading) return <LoadingPage />;
  if (!deck) return null;

  const getActivityTitle = () => {
    if (mode === "game" && game) {
      return activityTitles[game] || "Game";
    }
    return activityTitles[mode] || "Study";
  };

  const renderContent = () => {
    if (mode === "game" && game) {
      const gameCards = cards.slice(0, 10);

      switch (game) {
        case "pair-it":
          return (
            <PairIt
              cards={gameCards}
              onComplete={handleComplete}
              onProgress={setStudyProgress}
            />
          );
        case "guess-it":
          return (
            <GuessIt
              cards={gameCards}
              sourceLanguage={deck.source_language}
              targetLanguage={deck.target_language}
              onComplete={handleComplete}
              onProgress={setStudyProgress}
            />
          );
        case "recall-it":
          return (
            <RecallIt
              cards={gameCards}
              sourceLanguage={deck.source_language}
              targetLanguage={deck.target_language}
              onComplete={handleComplete}
              onProgress={setStudyProgress}
            />
          );
        case "type-it":
          return (
            <TypeIt
              cards={gameCards}
              sourceLanguage={deck.source_language}
              targetLanguage={deck.target_language}
              onComplete={handleComplete}
              onProgress={setStudyProgress}
            />
          );
        default:
          return (
            <StudySession
              deck={deck}
              mode={mode as "learn" | "review" | "game" | "autoplay"}
              onProgress={setStudyProgress}
            />
          );
      }
    }

    return (
      <StudySession
        deck={deck}
        mode={mode as "learn" | "review" | "game" | "autoplay"}
        onProgress={setStudyProgress}
      />
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <StudyHeader
          activityTitle={getActivityTitle()}
          deckName={deck.name}
          progress={studyProgress}
          onBack={handleBack}
        />
        <main className="flex-1 container mx-auto px-4 py-6">
          {renderContent()}
        </main>
      </div>
    </AuthGuard>
  );
}
