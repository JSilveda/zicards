"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Volume2, Eye, EyeOff } from "lucide-react";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import type { Card as CardType } from "@/types";

interface RecallItProps {
  cards: CardType[];
  sourceLanguage: string;
  targetLanguage: string;
  onComplete: () => void;
}

export function RecallIt({ cards, sourceLanguage, targetLanguage, onComplete }: RecallItProps) {
  const [queue] = useState(() => [...cards].sort(() => Math.random() - 0.5));
  const [phase, setPhase] = useState<"memorize" | "recall">("memorize");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [score, setScore] = useState(0);
  const [remembered, setRemembered] = useState(0);
  const [forgotten, setForgotten] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentCard = queue[currentIndex];

  useEffect(() => {
    if (currentCard && phase === "memorize") {
      speak(currentCard.front, getLanguageVoiceCode(sourceLanguage));
    }
  }, [currentIndex, currentCard, phase, sourceLanguage]);

  const handleMemorizeDone = () => {
    setPhase("recall");
    setShowBack(false);
  };

  const handleRecall = (didRemember: boolean) => {
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
      setPhase("memorize");
      setShowBack(false);
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

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Badge variant="outline">
          {currentIndex + 1}/{queue.length}
        </Badge>
        <Badge variant="secondary">{score} pts</Badge>
      </div>

      {phase === "memorize" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground mb-2">Memorize this word:</p>
            <h2 className="text-4xl font-bold mb-3">{currentCard.front}</h2>
            {currentCard.transcription && (
              <p className="text-muted-foreground mb-2">/{currentCard.transcription}/</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mb-6"
              onClick={() => speak(currentCard.front, getLanguageVoiceCode(sourceLanguage))}
            >
              <Volume2 className="h-4 w-4 mr-1" />
              Listen
            </Button>
            <Button onClick={handleMemorizeDone} size="lg" className="gap-2">
              <Eye className="h-5 w-5" />
              I memorized it!
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground mb-2">
              What does <strong>{currentCard.front}</strong> mean?
            </p>

            {showBack ? (
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4 text-primary">{currentCard.back}</h2>
                {currentCard.example && (
                  <p className="text-sm text-muted-foreground italic mb-6">
                    &quot;{currentCard.example}&quot;
                  </p>
                )}
                <div className="flex gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 text-red-600"
                    onClick={() => handleRecall(false)}
                  >
                    <XIcon className="h-5 w-5" />
                    Forgot
                  </Button>
                  <Button
                    size="lg"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => handleRecall(true)}
                  >
                    <CheckIcon className="h-5 w-5" />
                    Remembered
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="gap-2 mt-4"
                onClick={() => setShowBack(true)}
              >
                <EyeOff className="h-5 w-5" />
                Show Answer
              </Button>
            )}
          </CardContent>
        </Card>
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
