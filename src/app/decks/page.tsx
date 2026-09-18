"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { DeckCard } from "@/components/deck-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDecks, deleteDeck } from "@/lib/queries/decks";
import { Plus, Search, Layers } from "lucide-react";
import type { Deck } from "@/types";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadDecks = useCallback(async () => {
    try {
      const data = await getDecks();
      setDecks(data);
    } catch (error) {
      console.error("Failed to load decks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    try {
      await deleteDeck(id);
      setDecks((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Failed to delete deck:", error);
    }
  };

  const filtered = decks.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Decks</h1>
            <p className="text-muted-foreground">
              {decks.length} deck{decks.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/decks/new">
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              New Deck
            </Button>
          </Link>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {search ? "No matching decks" : "No decks yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {search
                ? "Try a different search term"
                : "Create your first deck to start learning"}
            </p>
            {!search && (
              <Link href="/decks/new">
                <Button className="gap-1">
                  <Plus className="h-4 w-4" />
                  Create Deck
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((deck) => (
              <DeckCard key={deck.id} deck={deck} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
