"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Volume2, Eye } from "lucide-react";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import type { Card as CardType } from "@/types";

interface RecallItProps {
  cards: CardType[];
  sourceLanguage: string;
  targetLanguage: string;
  onComplete: () => void;
  onProgress?: (progress: number) => void;
  autoAdvance?: boolean;
}

const TIMER_SECONDS = 5;

export function RecallIt({ cards, sourceLanguage, targetLanguage, onComplete, onProgress, autoAdvance }: RecallItProps) {
  const [queue] = useState(() => [...cards].sort(() => Math.random() - 0.5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [remembered, setRemembered] = useState(0);
  const [forgotten, setForgotten] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (isComplete && autoAdvance) {
      const timer = setTimeout(() => onCompleteRef.current(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, autoAdvance]);

  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentCard = queue[currentIndex];

  const currentCardRef = useRef(currentCard);
  currentCardRef.current = currentCard;

  const speakIfNeeded = useCallback(() => {
    if (currentCardRef.current && !revealed) {
      speak(currentCardRef.current.front, getLanguageVoiceCode(sourceLanguage));
    }
  }, [sourceLanguage, revealed]);

  useEffect(() => {
    speakIfNeeded();
  }, [currentIndex, speakIfNeeded]);

  useEffect(() => {
    const p = queue.length > 0 ? ((currentIndex + 1) / queue.length) * 100 : 0;
    onProgress?.(p);
  }, [currentIndex, queue.length, onProgress]);

  // Smooth animation loop
  useEffect(() => {
    if (revealed || !currentCard) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    setProgress(0);
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const pct = Math.min(elapsed / TIMER_SECONDS, 1);
      setProgress(pct);

      if (pct >= 1) {
        setRevealed(true);
        return;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [currentIndex, currentCard, revealed]);

  const handleShow = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setRevealed(true);
  };

  const handleRecall = (didRemember: boolean) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (didRemember) {
      setRemembered((r) => r + 1);
      setScore((s) => s + 15);
    } else {
      setForgotten((f) => f + 1);
    }

    if (currentIndex + 1 >= queue.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setRevealed(false);
      setProgress(0);
    }
  };

  if (isComplete || !currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Trophy className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Recall Complete!</h2>
        <div className="flex gap-6 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-500">{remembered}</p>
            <p className="text-sm text-muted-foreground">Remembered</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-500">{forgotten}</p>
            <p className="text-sm text-muted-foreground">Forgotten</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{score}</p>
            <p className="text-sm text-muted-foreground">Points</p>
          </div>
        </div>
        <Button onClick={onComplete} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Play Again
        </Button>
      </div>
    );
  }

  // Card border dimensions for SVG
  const cardW = 340;
  const cardH = 160;
  const perimeter = 2 * (cardW + cardH);
  const dashOffset = perimeter * (1 - progress);
  const timeLeft = Math.ceil(TIMER_SECONDS * (1 - progress));

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Badge variant="outline">
          {currentIndex + 1}/{queue.length}
        </Badge>
        <Badge variant="secondary">{score} pts</Badge>
      </div>

      {/* Front card */}
      <Card className="mb-4">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-muted-foreground mb-2">Memorize this word:</p>
          {currentCard.image_url && (
            <img
              src={currentCard.image_url}
              alt={currentCard.front}
              className="max-h-28 rounded-lg object-cover mb-3"
            />
          )}
          <h2 className="text-4xl font-bold mb-2">{currentCard.front}</h2>
          {currentCard.transcription && (
            <p className="text-muted-foreground mb-2">/{currentCard.transcription}/</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => speak(currentCard.front, getLanguageVoiceCode(sourceLanguage))}
          >
            <Volume2 className="h-4 w-4 mr-1" />
            Listen
          </Button>
        </CardContent>
      </Card>

      {/* Back card with border progress - same width as front card */}
      <div className="flex justify-center mb-6">
        <div className="relative" style={{ width: cardW, height: cardH }}>
          {/* SVG border progress */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${cardW} ${cardH}`}
          >
            {/* Background border - visible track */}
            <rect
              x="1.5"
              y="1.5"
              width={cardW - 3}
              height={cardH - 3}
              rx="16"
              ry="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-border"
            />
            {/* Timer progress border */}
            {!revealed && (
              <rect
                x="1.5"
                y="1.5"
                width={cardW - 3}
                height={cardH - 3}
                rx="16"
                ry="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={perimeter}
                strokeDashoffset={dashOffset}
                className="text-primary"
              />
            )}
          </svg>

          {/* Card content */}
          <div
            className="absolute rounded-2xl bg-card flex items-center justify-center"
            style={{ top: 3, left: 3, right: 3, bottom: 3 }}
          >
            {!revealed ? (
              <button
                onClick={handleShow}
                className="flex flex-col items-center justify-center w-full h-full hover:bg-muted/30 transition-colors rounded-2xl cursor-pointer"
              >
                <Eye className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-sm font-medium text-muted-foreground">Show</span>
                <span className="text-xs text-muted-foreground/60 mt-0.5">{timeLeft}s</span>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <h3 className="text-3xl font-bold text-primary">{currentCard.back}</h3>
                {currentCard.example && (
                  <p className="text-sm text-muted-foreground italic mt-2 max-w-[280px] text-center">
                    &quot;{currentCard.example}&quot;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {revealed && (
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            variant="outline"
            className="gap-2 text-red-600 min-w-[140px]"
            onClick={() => handleRecall(false)}
          >
            <XIcon className="h-5 w-5" />
            Forgot
          </Button>
          <Button
            size="lg"
            className="gap-2 bg-green-600 hover:bg-green-700 min-w-[140px]"
            onClick={() => handleRecall(true)}
          >
            <CheckIcon className="h-5 w-5" />
            Remembered
          </Button>
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
