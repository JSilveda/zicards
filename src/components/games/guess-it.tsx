"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw } from "lucide-react";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import { TermText } from "@/components/term-text";
import { toPlainText } from "@/lib/terms";
import { useEqualTileHeight } from "@/lib/use-equal-height";
import type { Card as CardType } from "@/types";

interface GuessItProps {
  cards: CardType[];
  sourceLanguage: string;
  targetLanguage: string;
  onComplete: () => void;
  onProgress?: (progress: number) => void;
  autoAdvance?: boolean;
}

export function GuessIt({ cards, sourceLanguage, targetLanguage, onComplete, onProgress, autoAdvance }: GuessItProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (isComplete && autoAdvance) {
      const timer = setTimeout(() => onCompleteRef.current(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, autoAdvance]);

  const shuffledCards = useMemo(() => [...cards].sort(() => Math.random() - 0.5), [cards]);
  const currentCard = shuffledCards[currentIndex];

  const options = useMemo(() => {
    if (!currentCard) return [];
    const wrongOptions = shuffledCards
      .filter((c) => c.id !== currentCard.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4)
      .map((c) => c.back);
    return [...wrongOptions, currentCard.back].sort(() => Math.random() - 0.5);
  }, [currentCard, shuffledCards]);

  const progress = shuffledCards.length > 0
    ? ((currentIndex + 1) / shuffledCards.length) * 100
    : 0;

  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);

  // All option tiles share the tallest tile's height
  const { setRef: setTileRef, height: tileHeight } = useEqualTileHeight<HTMLButtonElement>(
    `${currentIndex}:${options.length}`
  );
  const tileStyle = tileHeight ? { minHeight: tileHeight } : undefined;

  const handleSelect = (option: string) => {
    if (selected) return;
    setSelected(option);
    const correct = option === currentCard.back;
    setIsCorrect(correct);
    if (correct) {
      setScore((s) => s + 10 + streak * 2);
      setStreak((s) => s + 1);
      speak(currentCard.back, getLanguageVoiceCode(targetLanguage));
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (currentIndex + 1 >= shuffledCards.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelected(null);
        setIsCorrect(null);
      }
    }, 1200);
  };

  if (isComplete || !currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Trophy className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
        <p className="text-muted-foreground mb-2">Score: {score} points</p>
        <p className="text-sm text-muted-foreground mb-6">
          Best streak: {streak > 0 ? streak : "N/A"}
        </p>
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
    <div className="max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Badge variant="outline">
          {currentIndex + 1}/{shuffledCards.length}
        </Badge>
        <div className="flex gap-2">
          <Badge variant="secondary">{score} pts</Badge>
          {streak > 1 && (
            <Badge className="bg-orange-500">🔥 {streak}</Badge>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col items-center justify-center py-6">
          {currentCard.image_url && (
            <img
              src={currentCard.image_url}
              alt={toPlainText(currentCard.front)}
              className="max-h-32 rounded-lg object-cover mb-4"
            />
          )}
          <p className="text-sm text-muted-foreground mb-2">What is the translation of:</p>
          <h2 className="text-3xl font-bold mb-4 text-center">
            <TermText text={currentCard.front} />
          </h2>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => {
          let style = "bg-card hover:bg-muted border-border";
          if (selected) {
            if (option === currentCard.back) {
              style = "bg-green-100 dark:bg-green-900/30 border-green-500";
            } else if (option === selected && !isCorrect) {
              style = "bg-red-100 dark:bg-red-900/30 border-red-500";
            }
          }

          return (
            <button
              key={`${currentIndex}-${option}`}
              ref={setTileRef(`${currentIndex}-${option}`)}
              style={tileStyle}
              onClick={() => handleSelect(option)}
              disabled={!!selected}
              className={`p-4 rounded-xl border-2 font-medium transition-all ${style}`}
            >
              <TermText text={option} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
