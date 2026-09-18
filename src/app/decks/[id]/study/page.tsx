"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { StudySession } from "@/components/study-session";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });
import { getDeck } from "@/lib/queries/decks";
import { ArrowLeft } from "lucide-react";
import type { Deck } from "@/types";
import { LoadingPage } from "@/components/ui/loading";

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
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
          Studying: {deck.name}
        </h1>

        <StudySession deck={deck} />
      </main>
    </AuthGuard>
  );
}
