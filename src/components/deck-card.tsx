"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLanguageName } from "@/lib/utils";
import { GamesModal } from "@/components/games/games-modal";
import {
  Play,
  BookOpen,
  Headphones,
  Trash2,
  Upload,
  RefreshCw,
  X,
  Gamepad2,
} from "lucide-react";
import type { Deck } from "@/types";

interface DeckCardProps {
  deck: Deck;
  onDelete?: (id: string) => void;
}

export function DeckCard({ deck, onDelete }: DeckCardProps) {
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [showGamesModal, setShowGamesModal] = useState(false);
  const router = useRouter();

  const totalCards = deck.card_count || 0;
  const progress = deck.progress_percent || 0;
  const dueCount = deck.due_count || 0;
  const newCount = totalCards - (deck.learned_count || 0);

  return (
    <>
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
        {/* Progress circle */}
        <div className="relative shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/50"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${(progress / 100) * 150.8} 150.8`}
              strokeLinecap="round"
              className="text-primary"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
            {progress}%
          </span>
        </div>

        {/* Deck info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {totalCards} words
          </p>
          <h3 className="font-semibold text-base truncate">{deck.name}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {getLanguageName(deck.source_language)} → {getLanguageName(deck.target_language)}
            </Badge>
            {deck.is_public && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Public
              </Badge>
            )}
          </div>
        </div>

        {/* Due badge */}
        {dueCount > 0 && (
          <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shrink-0">
            {dueCount > 99 ? "99+" : dueCount}
          </Badge>
        )}

        {/* Play button */}
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 w-12 h-12 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
          onClick={() => setShowPlayModal(true)}
        >
          <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
        </Button>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-2 px-4">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted"
          onClick={() => router.push(`/decks/${deck.id}`)}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted"
          onClick={() => router.push(`/import`)}
        >
          <Upload className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted text-destructive"
            onClick={() => onDelete(deck.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Play Modal */}
      {showPlayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPlayModal(false)}
          />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <button
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
              onClick={() => setShowPlayModal(false)}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="divide-y">
              {/* Learn */}
              <button
                className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                onClick={() => {
                  setShowPlayModal(false);
                  router.push(`/decks/${deck.id}/study?mode=learn`);
                }}
              >
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <Play className="h-6 w-6 text-green-600" fill="currentColor" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Learn</p>
                  <p className="text-sm text-muted-foreground">
                    {newCount} new words
                  </p>
                </div>
              </button>

              {/* Review words */}
              <button
                className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                onClick={() => {
                  setShowPlayModal(false);
                  router.push(`/decks/${deck.id}/study?mode=review`);
                }}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Review words</p>
                  <p className="text-sm text-muted-foreground">
                    {dueCount > 0 ? `${dueCount} words to review` : "All caught up!"}
                  </p>
                </div>
              </button>

              {/* One game */}
              <button
                className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                onClick={() => {
                  setShowPlayModal(false);
                  setShowGamesModal(true);
                }}
              >
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <Gamepad2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg">One game</p>
                  <p className="text-sm text-muted-foreground">
                    {newCount} new words
                  </p>
                </div>
              </button>

              {/* Autoplay */}
              <button
                className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                onClick={() => {
                  setShowPlayModal(false);
                  router.push(`/decks/${deck.id}/study?mode=autoplay`);
                }}
              >
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                  <Headphones className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Autoplay</p>
                  <p className="text-sm text-muted-foreground">
                    Listen to all words
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Games Modal */}
      <GamesModal
        open={showGamesModal}
        onClose={() => setShowGamesModal(false)}
        onSelect={(game) => {
          setShowGamesModal(false);
          router.push(`/decks/${deck.id}/study?mode=game&game=${game}`);
        }}
      />
    </>
  );
}
