"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw } from "lucide-react";
import type { Card as CardType } from "@/types";

interface PairItProps {
  cards: CardType[];
  onComplete: () => void;
}

export function PairIt({ cards, onComplete }: PairItProps) {
  const [pairs] = useState(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5).slice(0, 6);
    const items: { id: string; text: string; pairId: string; type: "front" | "back" }[] = [];
    shuffled.forEach((card) => {
      items.push({ id: `f-${card.id}`, text: card.front, pairId: card.id, type: "front" });
      items.push({ id: `b-${card.id}`, text: card.back, pairId: card.id, type: "back" });
    });
    return items.sort(() => Math.random() - 0.5);
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const handleSelect = useCallback((item: { id: string; pairId: string }) => {
    if (selected.includes(item.id) || matched.has(item.pairId)) return;

    const newSelected = [...selected, item.id];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      const [first, second] = newSelected;
      const firstItem = pairs.find((p) => p.id === first);
      const secondItem = pairs.find((p) => p.id === second);

      if (firstItem && secondItem && firstItem.pairId === secondItem.pairId) {
        setMatched((prev) => new Set([...prev, firstItem.pairId]));
        setScore((s) => s + 10);
        setSelected([]);
      } else {
        setWrong(newSelected);
        setTimeout(() => {
          setWrong([]);
          setSelected([]);
        }, 800);
      }
    }
  }, [selected, matched, pairs]);

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Trophy className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">All Pairs Matched!</h2>
        <p className="text-muted-foreground mb-6">Score: {score} points</p>
        <div className="flex gap-2">
          <Button onClick={onComplete} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Play Again
          </Button>
        </div>
      </div>
    );
  }

  const matchedCount = matched.size;
  const totalPairs = cards.length;

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Badge variant="outline">{matchedCount}/{totalPairs} pairs</Badge>
        <Badge variant="secondary">{score} pts</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {pairs.map((item) => {
          const isMatched = matched.has(item.pairId);
          const isSelected = selected.includes(item.id);
          const isWrong = wrong.includes(item.id);

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              disabled={isMatched}
              className={`h-24 rounded-xl border-2 text-sm font-medium p-2 transition-all ${
                isMatched
                  ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700"
                  : isWrong
                  ? "bg-red-100 dark:bg-red-900/30 border-red-500 animate-pulse"
                  : isSelected
                  ? "bg-primary/10 border-primary"
                  : "bg-card hover:bg-muted border-border"
              }`}
            >
              <span className="line-clamp-3">{item.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
