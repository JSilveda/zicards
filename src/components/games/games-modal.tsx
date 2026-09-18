"use client";

import { X, Link2, MessageCircle, Brain, Keyboard } from "lucide-react";

interface GamesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (game: string) => void;
}

export function GamesModal({ open, onClose, onSelect }: GamesModalProps) {
  if (!open) return null;

  const games = [
    {
      id: "pair-it",
      name: "Pair It",
      description: "Match words with translations",
      icon: Link2,
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
    },
    {
      id: "guess-it",
      name: "Guess It",
      description: "Multiple choice quiz",
      icon: MessageCircle,
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
    },
    {
      id: "recall-it",
      name: "Recall It",
      description: "Remember and recall words",
      icon: Brain,
      color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
    },
    {
      id: "type-it",
      name: "Type It",
      description: "Type the translation",
      icon: Keyboard,
      color: "bg-green-100 dark:bg-green-900/30 text-green-600",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
        <button
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Choose a Game</h3>
        </div>

        <div className="divide-y">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <button
                key={game.id}
                className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                onClick={() => onSelect(game.id)}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${game.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{game.name}</p>
                  <p className="text-sm text-muted-foreground">{game.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
