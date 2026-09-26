"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getLanguageName } from "@/lib/utils";
import { GamesModal } from "@/components/games/games-modal";
import {
  Play,
  BookOpen,
  Headphones,
  Trash2,
  Upload,
  RefreshCw,
  MoreHorizontal,
  Gamepad2,
  RotateCcw,
  FolderInput,
} from "lucide-react";
import type { Deck } from "@/types";

interface DeckCardProps {
  deck: Deck;
  onDelete?: (id: string) => void;
  onMove?: (id: string) => void;
}

export function DeckCard({ deck, onDelete, onMove }: DeckCardProps) {
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const router = useRouter();

  const totalCards = deck.card_count || 0;
  const progress = deck.progress_percent || 0;
  const dueCount = deck.due_count || 0;
  const newCount = totalCards - (deck.learned_count || 0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleCardClick = () => {
    router.push(`/decks/${deck.id}`);
  };

  const handleResetProgress = async () => {
    setShowResetModal(false);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cards } = await supabase
        .from("cards")
        .select("id")
        .eq("deck_id", deck.id);

      if (cards && cards.length > 0) {
        const cardIds = cards.map((c: { id: string }) => c.id);
        await supabase
          .from("reviews")
          .delete()
          .in("card_id", cardIds)
          .eq("user_id", user.id);
      }

      window.location.reload();
    } catch (error) {
      console.error("Failed to reset progress:", error);
    }
  };

  return (
    <>
      <div
        className="relative cursor-pointer group"
        onClick={handleCardClick}
      >
        {/* Stacked cards effect */}
        <div className="relative">
          {/* Back card (shadow) */}
          <div
            className="absolute inset-x-1 top-1 h-full rounded-2xl border border-border/50 bg-muted/30"
            style={{ transform: "rotate(1.5deg)" }}
          />
          {/* Middle card */}
          <div
            className="absolute inset-x-0.5 top-0.5 h-full rounded-2xl border border-border/50 bg-muted/50"
            style={{ transform: "rotate(-0.75deg)" }}
          />
          {/* Front card */}
          <div className="relative rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all">
            <div className="p-4">
              {/* Top row: progress circle + info */}
              <div className="flex items-center gap-3">
                {/* Progress circle */}
                <div className="relative shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-muted/50"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${(progress / 100) * 125.6} 125.6`}
                      strokeLinecap="round"
                      className="text-primary"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
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
                  </div>
                </div>

                {/* Due badge */}
                {dueCount > 0 && (
                  <Badge className="bg-red-500 text-white dark:bg-red-500/25 dark:text-red-200 text-xs px-2 py-0.5 rounded-full shrink-0">
                    {dueCount > 99 ? "99+" : dueCount}
                  </Badge>
                )}

                {/* Play button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPlayModal(true);
                  }}
                >
                  <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                </Button>

                {/* Menu button */}
                <div className="relative shrink-0" ref={menuRef}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-10 h-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(!showMenu);
                    }}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>

                  {/* Dropdown menu */}
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-card border rounded-xl shadow-lg z-20 overflow-hidden">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          router.push(`/decks/${deck.id}`);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Manage deck
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          router.push(`/import?deck=${deck.id}`);
                        }}
                      >
                        <Upload className="h-4 w-4" />
                        Import / Export
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          setShowResetModal(true);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset Progress
                      </button>
                      {onMove && (
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onMove(deck.id);
                          }}
                        >
                          <FolderInput className="h-4 w-4" />
                          Mover
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onDelete(deck.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete deck
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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
              ✕
            </button>

            <div className="divide-y divide-border">
              {/* Learn */}
              <button
                className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                onClick={() => {
                  setShowPlayModal(false);
                  router.push(`/decks/${deck.id}/study?mode=learn`);
                }}
              >
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <Play className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" />
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
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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

      {/* Reset Progress Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Progress</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            All review history for this deck will be deleted. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetProgress}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
