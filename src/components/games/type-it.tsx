"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Volume2, CheckCircle, XCircle, Eye } from "lucide-react";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import type { Card as CardType } from "@/types";

interface TypeItProps {
  cards: CardType[];
  sourceLanguage: string;
  targetLanguage: string;
  onComplete: () => void;
  onProgress?: (progress: number) => void;
  autoAdvance?: boolean;
}

export function TypeIt({ cards, sourceLanguage, targetLanguage, onComplete, onProgress, autoAdvance }: TypeItProps) {
  const [queue] = useState(() => [...cards].sort(() => Math.random() - 0.5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isComplete && autoAdvance) {
      const timer = setTimeout(() => onComplete(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, autoAdvance, onComplete]);

  const [nativeLang, setNativeLang] = useState(sourceLanguage);
  const inputRef = useRef<HTMLInputElement>(null);

  // Read native language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("nativeLanguage");
    if (saved) {
      // If native language matches target, show target side (back), type source (front)
      // If native language matches source, show source side (front), type target (back)
      // If native language matches neither, default to source side
      if (saved === targetLanguage) {
        setNativeLang(targetLanguage);
      } else {
        setNativeLang(sourceLanguage);
      }
    }
  }, [sourceLanguage, targetLanguage]);

  const currentCard = queue[currentIndex];

  // Determine which side is shown (native language) and which is typed
  const showSideIsTarget = nativeLang === targetLanguage;
  const shownText = showSideIsTarget ? currentCard?.back : currentCard?.front;
  const correctAnswer = showSideIsTarget ? currentCard?.front : currentCard?.back;
  const shownLang = showSideIsTarget ? targetLanguage : sourceLanguage;
  const answerLang = showSideIsTarget ? sourceLanguage : targetLanguage;

  const progress = queue.length > 0 ? ((currentIndex + 1) / queue.length) * 100 : 0;

  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);

  useEffect(() => {
    if (currentCard && !showHelp) {
      inputRef.current?.focus();
    }
  }, [currentIndex, currentCard, showHelp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || feedback || !correctAnswer) return;

    const userAnswer = input.trim().toLowerCase();
    if (userAnswer === correctAnswer.toLowerCase()) {
      setFeedback("correct");
      setScore((s) => s + 20);
      setCorrectCount((c) => c + 1);
    } else {
      setFeedback("wrong");
      setWrongCount((w) => w + 1);
    }

    setTimeout(() => {
      goToNext();
    }, 1500);
  };

  const goToNext = () => {
    if (currentIndex + 1 >= queue.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setInput("");
      setFeedback(null);
      setShowHelp(false);
    }
  };

  const handleHelp = () => {
    setShowHelp(true);
    if (correctAnswer) {
      speak(correctAnswer, getLanguageVoiceCode(answerLang));
    }
  };

  const handleTryAgain = () => {
    setShowHelp(false);
    setInput("");
    setFeedback(null);
    inputRef.current?.focus();
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
          {showHelp ? (
            <>
              <p className="text-sm text-muted-foreground mb-2">The answer is:</p>
              {currentCard.image_url && (
                <img
                  src={currentCard.image_url}
                  alt={correctAnswer || ""}
                  className="max-h-28 rounded-lg object-cover mb-3"
                />
              )}
              <h2 className="text-3xl font-bold mb-2 text-primary">{correctAnswer}</h2>
              {currentCard.example && (
                <p className="text-sm text-muted-foreground italic mb-2 max-w-xs">
                  &quot;{currentCard.example}&quot;
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => correctAnswer && speak(correctAnswer, getLanguageVoiceCode(answerLang))}
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Listen
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">Type the translation of:</p>
              {currentCard.image_url && (
                <img
                  src={currentCard.image_url}
                  alt={shownText || ""}
                  className="max-h-28 rounded-lg object-cover mb-3"
                />
              )}
              <h2 className="text-3xl font-bold mb-1">{shownText}</h2>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => shownText && speak(shownText, getLanguageVoiceCode(shownLang))}
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Listen
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {showHelp ? (
        <div className="flex gap-2 justify-center">
          <Button size="lg" className="w-full gap-2" onClick={handleTryAgain}>
            <RotateCcw className="h-5 w-5" />
            Try Again
          </Button>
          <Button size="lg" variant="outline" className="w-full gap-2" onClick={goToNext}>
            Skip
          </Button>
        </div>
      ) : (
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
              Correct answer: <strong className="text-primary">{correctAnswer}</strong>
            </p>
          )}

          {!feedback && (
            <div className="flex gap-2">
              <Button type="submit" size="lg" className="flex-1">
                Check
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={handleHelp}
              >
                <Eye className="h-5 w-5" />
                Help
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
