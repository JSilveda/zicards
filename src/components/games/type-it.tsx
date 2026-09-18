"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Volume2, CheckCircle, XCircle } from "lucide-react";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import type { Card as CardType } from "@/types";

interface TypeItProps {
  cards: CardType[];
  sourceLanguage: string;
  targetLanguage: string;
  onComplete: () => void;
}

export function TypeIt({ cards, sourceLanguage, targetLanguage, onComplete }: TypeItProps) {
  const [queue] = useState(() => [...cards].sort(() => Math.random() - 0.5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCard = queue[currentIndex];

  useEffect(() => {
    if (currentCard) {
      speak(currentCard.front, getLanguageVoiceCode(sourceLanguage));
      inputRef.current?.focus();
    }
  }, [currentIndex, currentCard, sourceLanguage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || feedback) return;

    const userAnswer = input.trim().toLowerCase();
    const correctAnswer = currentCard.back.toLowerCase();

    if (userAnswer === correctAnswer) {
      setFeedback("correct");
      setScore((s) => s + 20);
      setCorrectCount((c) => c + 1);
    } else {
      setFeedback("wrong");
      setWrongCount((w) => w + 1);
    }

    setTimeout(() => {
      if (currentIndex + 1 >= queue.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setInput("");
        setFeedback(null);
        setShowHint(false);
      }
    }, 1500);
  };

  if (isComplete || !currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Trophy className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Typing Complete!</h2>
        <div className="flex gap-6 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-500">{correctCount}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-500">{wrongCount}</p>
            <p className="text-sm text-muted-foreground">Wrong</p>
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

      <Card className="mb-6">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <p className="text-sm text-muted-foreground mb-2">Type the translation of:</p>
          <h2 className="text-3xl font-bold mb-3">{currentCard.front}</h2>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer..."
            className={`text-lg h-14 ${
              feedback === "correct"
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : feedback === "wrong"
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : ""
            }`}
            disabled={!!feedback}
            autoComplete="off"
          />
          {feedback && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {feedback === "correct" ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
          )}
        </div>

        {feedback === "wrong" && (
          <p className="text-sm text-center">
            Correct answer: <strong className="text-primary">{currentCard.back}</strong>
          </p>
        )}

        {!feedback && (
          <div className="flex gap-2 justify-center">
            <Button type="submit" size="lg" className="w-full">
              Check
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => setShowHint(true)}
            >
              Hint
            </Button>
          </div>
        )}

        {showHint && !feedback && (
          <p className="text-center text-muted-foreground">
            Hint: {currentCard.back.charAt(0)}{"_".repeat(Math.max(0, currentCard.back.length - 1))}
          </p>
        )}
      </form>
    </div>
  );
}
