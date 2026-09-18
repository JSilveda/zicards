"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import { submitReview, getDueCards } from "@/lib/queries/reviews";
import { LoadingPage } from "@/components/ui/loading";
import { CheckCircle, XCircle, Volume2, Trophy, RotateCcw } from "lucide-react";
import type { Card as CardType, Deck } from "@/types";

interface StudySessionProps {
  deck: Deck;
}

export function StudySession({ deck }: StudySessionProps) {
  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadCards = useCallback(async () => {
    try {
      const dueCards = await getDueCards(deck.id);
      setCards(dueCards);
      setCurrentIndex(0);
      setCorrectCount(0);
      setIncorrectCount(0);
      setIsComplete(false);
      setFlipped(false);
    } catch (error) {
      console.error("Failed to load cards:", error);
    } finally {
      setLoading(false);
    }
  }, [deck.id]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleAnswer = async (correct: boolean) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const currentCard = cards[currentIndex];
      await submitReview(currentCard.id, correct);

      if (correct) setCorrectCount((c) => c + 1);
      else setIncorrectCount((c) => c + 1);

      if (currentIndex + 1 >= cards.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setFlipped(false);
      }
    } catch (error) {
      console.error("Failed to submit review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingPage />;

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Trophy className="h-16 w-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">No cards to review!</h2>
        <p className="text-muted-foreground mb-6">
          All caught up! Come back later for more reviews.
        </p>
        <Button onClick={loadCards} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reload Cards
        </Button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Trophy className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
        <div className="flex gap-6 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-500">{correctCount}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-500">{incorrectCount}</p>
            <p className="text-sm text-muted-foreground">Incorrect</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{cards.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadCards} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Study Again
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <Badge variant="outline">
            {currentIndex + 1} / {cards.length}
          </Badge>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-green-600">
              {correctCount} correct
            </Badge>
            <Badge variant="secondary" className="text-red-600">
              {incorrectCount} incorrect
            </Badge>
          </div>
        </div>
        <Progress value={progress} />
      </div>

      <div
        className="cursor-pointer mb-6"
        onClick={() => setFlipped(!flipped)}
        style={{ perspective: "1000px" }}
      >
        <div
          className="transition-transform duration-500 relative"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <Card
            className="w-full min-h-[300px] flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardContent className="text-center p-0">
              <p className="text-sm text-muted-foreground mb-4">
                Tap to reveal answer
              </p>
              <h2 className="text-4xl font-bold mb-3">{currentCard.front}</h2>
              {currentCard.transcription && (
                <p className="text-muted-foreground mb-2">
                  /{currentCard.transcription}/
                </p>
              )}
              {currentCard.gender && (
                <Badge variant="secondary">{currentCard.gender}</Badge>
              )}
              <div className="mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(currentCard.front, getLanguageVoiceCode(deck.source_language));
                  }}
                >
                  <Volume2 className="h-4 w-4 mr-1" />
                  Listen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className="w-full min-h-[300px] flex flex-col items-center justify-center p-8 absolute top-0 left-0"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <CardContent className="text-center p-0">
              <h2 className="text-4xl font-bold mb-3">{currentCard.back}</h2>
              {currentCard.example && (
                <p className="text-muted-foreground italic mb-4 max-w-sm">
                  &quot;{currentCard.example}&quot;
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(currentCard.back, getLanguageVoiceCode(deck.target_language));
                }}
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Listen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {flipped && (
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            variant="outline"
            className="gap-2 text-red-600 hover:text-red-600 hover:bg-red-50 min-w-[140px]"
            onClick={() => handleAnswer(false)}
            disabled={submitting}
          >
            <XCircle className="h-5 w-5" />
            Incorrect
          </Button>
          <Button
            size="lg"
            className="gap-2 bg-green-600 hover:bg-green-700 min-w-[140px]"
            onClick={() => handleAnswer(true)}
            disabled={submitting}
          >
            <CheckCircle className="h-5 w-5" />
            Correct
          </Button>
        </div>
      )}
    </div>
  );
}
