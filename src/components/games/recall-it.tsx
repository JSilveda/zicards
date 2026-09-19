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
}

const TIMER_SECONDS = 5;
const CIRCLE_RADIUS = 70;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export function RecallIt({ cards, sourceLanguage, targetLanguage, onComplete, onProgress }: RecallItProps) {
  const [queue] = useState(() => [...cards].sort(() => Math.random() - 0.5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [score, setScore] = useState(0);
  const [remembered, setRemembered] = useState(0);
  const [forgotten, setForgotten] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentCard = queue[currentIndex];

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (currentCard && !revealed) {
      speak(currentCard.front, getLanguageVoiceCode(sourceLanguage));
    }
  }, [currentIndex, currentCard, sourceLanguage, revealed]);

  useEffect(() => {
    const progress = queue.length > 0 ? ((currentIndex + 1) / queue.length) * 100 : 0;
    onProgress?.(progress);
  }, [currentIndex, queue.length, onProgress]);

  // Timer countdown
  useEffect(() => {
    if (revealed || !currentCard) return;

    setTimeLeft(TIMER_SECONDS);
    setRevealed(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          setRevealed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => stopTimer();
  }, [currentIndex, currentCard, revealed, stopTimer]);

  const handleShow = () => {
    stopTimer();
    setRevealed(true);
  };

  const handleRecall = (didRemember: boolean) => {
    stopTimer();
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
      setTimeLeft(TIMER_SECONDS);
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

  const timerProgress = ((TIMER_SECONDS - timeLeft) / TIMER_SECONDS) * CIRCLE_CIRCUMFERENCE;

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

      {/* Back card with timer border */}
      <div className="flex justify-center mb-6">
        <div className="relative w-[160px] h-[160px]">
          {/* SVG circle timer */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 160 160"
          >
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/30"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={CIRCLE_CIRCUMFERENCE - timerProgress}
              strokeLinecap="round"
              className="text-primary transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Card content inside the circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            {!revealed ? (
              <button
                onClick={handleShow}
                className="flex flex-col items-center justify-center w-[140px] h-[140px] rounded-full bg-card border-2 border-muted/20 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <Eye className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-sm font-medium text-muted-foreground">Show</span>
                <span className="text-xs text-muted-foreground/60 mt-0.5">{timeLeft}s</span>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center w-[140px] h-[140px] rounded-full bg-primary/5 border-2 border-primary/30">
                <h3 className="text-xl font-bold text-primary text-center px-2">{currentCard.back}</h3>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons - only shown when revealed */}
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
