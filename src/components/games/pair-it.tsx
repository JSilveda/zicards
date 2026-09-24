"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, CheckCircle } from "lucide-react";
import { TermText } from "@/components/term-text";
import { useEqualTileHeight } from "@/lib/use-equal-height";
import type { Card as CardType } from "@/types";

interface PairItProps {
  cards: CardType[];
  onComplete: () => void;
  onProgress?: (progress: number) => void;
  autoAdvance?: boolean;
}

interface WordItem {
  id: string;
  text: string;
  cardId: string;
  side: "left" | "right";
  image_url?: string | null;
}

export function PairIt({ cards, onComplete, onProgress, autoAdvance }: PairItProps) {
  const totalPairs = cards.length;

  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [score, setScore] = useState(0);
  const [totalMatched, setTotalMatched] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (isComplete && autoAdvance) {
      const timer = setTimeout(() => onCompleteRef.current(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, autoAdvance]);

  const BLOCK_SIZE = 5;

  const getBlockCards = useCallback(() => {
    const available: number[] = [];
    for (let i = 0; i < totalPairs; i++) {
      if (!usedIndices.has(i)) {
        available.push(i);
      }
    }

    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, BLOCK_SIZE);
  }, [usedIndices, totalPairs]);

  const blockIndices = useMemo(() => getBlockCards(), [getBlockCards]);

  const leftItems: WordItem[] = useMemo(() => {
    return blockIndices.map((idx) => ({
      id: `l-${idx}`,
      text: cards[idx].front,
      cardId: cards[idx].id,
      side: "left" as const,
      image_url: cards[idx].image_url || null,
    }));
  }, [blockIndices, cards]);

  const rightItems: WordItem[] = useMemo(() => {
    return blockIndices
      .map((idx) => ({
        id: `r-${idx}`,
        text: cards[idx].back,
        cardId: cards[idx].id,
        side: "right" as const,
        image_url: null,
      }))
      .sort(() => Math.random() - 0.5);
  }, [blockIndices, cards]);

  const progress = totalPairs > 0 ? (totalMatched / totalPairs) * 100 : 0;

  // All tiles share the tallest tile's height
  const { setRef: setTileRef, height: tileHeight } = useEqualTileHeight<HTMLButtonElement>(
    blockIndices.join(",")
  );
  const tileStyle = tileHeight ? { minHeight: tileHeight } : undefined;

  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);

  const checkMatch = useCallback(
    (leftId: string, rightId: string) => {
      const leftItem = leftItems.find((l) => l.id === leftId);
      const rightItem = rightItems.find((r) => r.id === rightId);

      if (!leftItem || !rightItem) return;

      if (leftItem.cardId === rightItem.cardId) {
        setMatched((prev) => new Set([...prev, leftId, rightId]));
        setScore((s) => s + 10);
        setTotalMatched((t) => t + 1);

        const newUsedIndices = new Set(usedIndices);
        const cardIndex = cards.findIndex((c) => c.id === leftItem.cardId);
        newUsedIndices.add(cardIndex);
        setUsedIndices(newUsedIndices);

        setSelectedLeft(null);
        setSelectedRight(null);

        const newTotalMatched = totalMatched + 1;
        if (newTotalMatched >= totalPairs) {
          setTimeout(() => setIsComplete(true), 500);
        }
      } else {
        setWrongPair([leftId, rightId]);
        setTimeout(() => {
          setWrongPair(null);
          setSelectedLeft(null);
          setSelectedRight(null);
        }, 800);
      }
    },
    [leftItems, rightItems, usedIndices, cards, totalMatched, totalPairs]
  );

  const handleLeftClick = (id: string) => {
    if (matched.has(id) || wrongPair?.includes(id)) return;
    setSelectedLeft(id);
    if (selectedRight) {
      checkMatch(id, selectedRight);
    }
  };

  const handleRightClick = (id: string) => {
    if (matched.has(id) || wrongPair?.includes(id)) return;
    setSelectedRight(id);
    if (selectedLeft) {
      checkMatch(selectedLeft, id);
    }
  };

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

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <Badge variant="outline">
          {totalMatched}/{totalPairs} matched
        </Badge>
        <Badge variant="secondary">{score} pts</Badge>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-3">
          {leftItems.map((item) => {
            const isMatched = matched.has(item.id);
            const isSelected = selectedLeft === item.id;
            const isWrong = wrongPair?.includes(item.id);

            return (
              <button
                key={item.id}
                ref={setTileRef(item.id)}
                style={tileStyle}
                onClick={() => handleLeftClick(item.id)}
                disabled={isMatched}
                className={`w-full min-h-16 rounded-xl border-2 text-sm font-medium px-4 py-2 transition-all text-left flex items-center gap-2 break-words ${
                  isMatched
                    ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700"
                    : isWrong
                    ? "bg-red-100 dark:bg-red-900/30 border-red-500 animate-pulse"
                    : isSelected
                    ? "bg-primary/10 border-primary"
                    : "bg-card hover:bg-muted border-border"
                }`}
              >
                {item.image_url && (
                  <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                )}
                {isMatched ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <TermText text={item.text} />
                  </span>
                ) : (
                  <TermText text={item.text} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {rightItems.map((item) => {
            const isMatched = matched.has(item.id);
            const isSelected = selectedRight === item.id;
            const isWrong = wrongPair?.includes(item.id);

            return (
              <button
                key={item.id}
                ref={setTileRef(item.id)}
                style={tileStyle}
                onClick={() => handleRightClick(item.id)}
                disabled={isMatched}
                className={`w-full min-h-16 rounded-xl border-2 text-sm font-medium px-4 py-2 transition-all text-left flex items-center break-words ${
                  isMatched
                    ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700"
                    : isWrong
                    ? "bg-red-100 dark:bg-red-900/30 border-red-500 animate-pulse"
                    : isSelected
                    ? "bg-primary/10 border-primary"
                    : "bg-card hover:bg-muted border-border"
                }`}
              >
                {isMatched ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <TermText text={item.text} />
                  </span>
                ) : (
                  <TermText text={item.text} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Select one word from each column to match them
      </p>
    </div>
  );
}
