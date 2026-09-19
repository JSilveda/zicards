"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import { submitReview, getDueCards, getReviewsForDeck } from "@/lib/queries/reviews";
import { getCards } from "@/lib/queries/cards";
import { LoadingPage } from "@/components/ui/loading";
import { CheckCircle, XCircle, Volume2, Trophy, RotateCcw, Pause, Play } from "lucide-react";
import type { Card as CardType, Deck } from "@/types";

interface StudySessionProps {
  deck: Deck;
  mode?: "learn" | "review" | "game" | "autoplay";
  onProgress?: (progress: number) => void;
}

interface SavedProgress {
  deckId: string;
  mode: string;
  currentIndex: number;
  cardIds: string[];
  correctCount: number;
  incorrectCount: number;
}

function getStorageKey(deckId: string, mode: string) {
  return `study_progress_${deckId}_${mode}`;
}

function saveProgressData(data: SavedProgress) {
  try {
    localStorage.setItem(getStorageKey(data.deckId, data.mode), JSON.stringify(data));
  } catch {}
}

function loadProgressData(deckId: string, mode: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(getStorageKey(deckId, mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.deckId !== deckId || parsed.mode !== mode) return null;
    if (!parsed.cardIds || parsed.cardIds.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearProgressData(deckId: string, mode: string) {
  try {
    localStorage.removeItem(getStorageKey(deckId, mode));
  } catch {}
}

export function StudySession({ deck, mode = "review", onProgress }: StudySessionProps) {
  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [incorrectCardIds, setIncorrectCardIds] = useState<string[]>([]);
  const [isReasking, setIsReasking] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [pendingResume, setPendingResume] = useState<SavedProgress | null>(null);
  const [cardMap, setCardMap] = useState<Map<string, CardType>>(new Map());
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());

  const loadCards = useCallback(async (resume?: SavedProgress) => {
    try {
      let cardsToUse: CardType[] = [];
      if (mode === "review") {
        cardsToUse = await getDueCards(deck.id);
      } else {
        const all = await getCards(deck.id);
        if (mode === "learn") {
          const reviews = await getReviewsForDeck(deck.id);
          const reviewedIds = new Set(reviews.map((r) => r.card_id));
          const freshCards = all.filter((c) => !reviewedIds.has(c.id));
          cardsToUse = freshCards.length > 0 ? freshCards : all.slice(0, 20);
          setNewCardIds(new Set(cardsToUse.map((c) => c.id)));
        } else {
          cardsToUse = all;
          setNewCardIds(new Set());
        }
      }

      const map = new Map<string, CardType>();
      for (const c of cardsToUse) map.set(c.id, c);
      setCardMap(map);

      if (resume) {
        const resumedCards = resume.cardIds
          .map((id) => map.get(id))
          .filter(Boolean) as CardType[];
        const finalCards = resumedCards.length > 0 ? resumedCards : cardsToUse;
        setCards(finalCards);
        setCurrentIndex(Math.min(resume.currentIndex, finalCards.length - 1));
        setCorrectCount(resume.correctCount);
        setIncorrectCount(resume.incorrectCount);
      } else {
        setCards(cardsToUse);
        setCurrentIndex(0);
        setCorrectCount(0);
        setIncorrectCount(0);
      }
      setIsComplete(false);
      setFlipped(false);
      setIncorrectCardIds([]);
      setIsReasking(false);
    } catch (error) {
      console.error("Failed to load cards:", error);
    } finally {
      setLoading(false);
    }
  }, [deck.id, mode]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    if (loading || cards.length === 0 || mode === "autoplay" || isReasking) return;
    const saved = loadProgressData(deck.id, mode);
    if (saved && saved.currentIndex < saved.cardIds.length - 1) {
      setPendingResume(saved);
      setShowResumeDialog(true);
    } else {
      clearProgressData(deck.id, mode);
    }
  }, [deck.id, mode, loading, cards.length, isReasking]);

  useEffect(() => {
    if (cards.length > 0 && mode !== "autoplay" && !showResumeDialog && !isReasking && currentIndex < cards.length - 1) {
      saveProgressData({
        deckId: deck.id,
        mode,
        currentIndex,
        cardIds: cards.map((c) => c.id),
        correctCount,
        incorrectCount,
      });
    }
  }, [currentIndex, cards, mode, deck.id, correctCount, incorrectCount, showResumeDialog, isReasking]);

  useEffect(() => {
    const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;
    onProgress?.(progress);
  }, [currentIndex, cards.length, onProgress]);

  useEffect(() => {
    if (mode === "autoplay" && cards.length > 0 && isPlaying) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= cards.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [mode, cards.length, isPlaying, currentIndex]);

  useEffect(() => {
    if (mode === "autoplay" && cards.length > 0 && isPlaying) {
      const card = cards[currentIndex];
      const lang = currentIndex % 2 === 0 ? deck.source_language : deck.target_language;
      const text = currentIndex % 2 === 0 ? card.front : card.back;
      speak(text, getLanguageVoiceCode(lang));
    }
  }, [currentIndex, mode, cards, isPlaying, deck]);

  const handleAnswer = async (correct: boolean) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const currentCard = cards[currentIndex];
      await submitReview(currentCard.id, correct);

      const newCorrectCount = correct ? correctCount + 1 : correctCount;
      const newIncorrectCount = correct ? incorrectCount : incorrectCount + 1;
      setCorrectCount(newCorrectCount);
      setIncorrectCount(newIncorrectCount);

      let newIncorrectIds: string[];
      if (correct) {
        newIncorrectIds = incorrectCardIds.filter((id) => id !== currentCard.id);
      } else {
        newIncorrectIds = incorrectCardIds.includes(currentCard.id)
          ? incorrectCardIds
          : [...incorrectCardIds, currentCard.id];
      }
      setIncorrectCardIds(newIncorrectIds);

      if (currentIndex + 1 >= cards.length) {
        const uniqueIncorrect = [...new Set(newIncorrectIds)];

        if (uniqueIncorrect.length > 0) {
          const reviewCards = uniqueIncorrect
            .map((id) => cardMap.get(id))
            .filter(Boolean) as CardType[];
          if (reviewCards.length > 0) {
            setIsReasking(true);
            setCards(reviewCards);
            setCurrentIndex(0);
            setFlipped(false);
            setIncorrectCardIds([]);
            return;
          }
        }

        clearProgressData(deck.id, mode);
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

  const handleResume = () => {
    setShowResumeDialog(false);
    if (pendingResume) {
      loadCards(pendingResume);
    }
    setPendingResume(null);
  };

  const handleStartFresh = () => {
    setShowResumeDialog(false);
    clearProgressData(deck.id, mode);
    setPendingResume(null);
    loadCards();
  };

  const handleFlipAndSpeak = () => {
    setFlipped(!flipped);
    if (!flipped) {
      const lang = deck.target_language;
      speak(cards[currentIndex].back, getLanguageVoiceCode(lang));
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
        <Button onClick={() => loadCards()} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reload Cards
        </Button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <>
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
              <p className="text-3xl font-bold">{correctCount + incorrectCount}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => loadCards()} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Study Again
            </Button>
          </div>
        </div>
      </>
    );
  }

  const currentCard = cards[currentIndex];
  const isCurrentNew = newCardIds.has(currentCard.id);
  const isCurrentReask = isReasking;

  if (mode === "autoplay") {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <Badge variant="outline">
              {currentIndex + 1} / {cards.length}
            </Badge>
          </div>
        </div>

        <Card className="min-h-[300px] flex flex-col items-center justify-center p-8">
          <CardContent className="text-center p-0">
            {currentCard.image_url && (
              <img
                src={currentCard.image_url}
                alt={currentCard.front}
                className="max-h-36 rounded-lg object-cover mx-auto mb-4"
              />
            )}
            <p className="text-sm text-muted-foreground mb-2">Front</p>
            <h2 className="text-4xl font-bold mb-4">{currentCard.front}</h2>
            <div className="h-px bg-border w-32 mx-auto my-4" />
            <p className="text-sm text-muted-foreground mb-2">Back</p>
            <h2 className="text-3xl font-bold text-primary">{currentCard.back}</h2>
            {currentCard.example && (
              <p className="text-sm text-muted-foreground italic mt-4 max-w-sm mx-auto">
                &quot;{currentCard.example}&quot;
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center mt-6 gap-4">
          <Button
            size="lg"
            variant="outline"
            className="gap-2"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <>
                <Pause className="h-5 w-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Play
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
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
          {isReasking && (
            <p className="text-xs text-muted-foreground mt-1">
              Reviewing cards you missed
            </p>
          )}
        </div>

        <div
          className="cursor-pointer mb-6"
          onClick={handleFlipAndSpeak}
          style={{ perspective: "1000px" }}
        >
          <div
            className="transition-transform duration-500 relative"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <Card
              className="w-full min-h-[300px] flex flex-col items-center justify-center p-8"
              style={{ backfaceVisibility: "hidden" }}
            >
              <CardContent className="text-center p-0">
                <div className="flex justify-center gap-2 mb-4">
                  {isCurrentNew && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      New
                    </span>
                  )}
                  {isCurrentReask && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Review
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Tap to reveal answer
                </p>
                {currentCard.image_url && (
                  <img
                    src={currentCard.image_url}
                    alt={currentCard.front}
                    className="max-h-36 rounded-lg object-cover mx-auto mb-4"
                  />
                )}
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

            <Card
              className="w-full min-h-[300px] flex flex-col items-center justify-center p-8 absolute top-0 left-0"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <CardContent className="text-center p-0">
                {currentCard.image_url && (
                  <img
                    src={currentCard.image_url}
                    alt={currentCard.back}
                    className="max-h-36 rounded-lg object-cover mx-auto mb-4"
                  />
                )}
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

      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resume Study Session?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have a saved session for this deck. Would you like to continue where you left off?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleStartFresh}>
              Start Fresh
            </Button>
            <Button onClick={handleResume}>
              Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
