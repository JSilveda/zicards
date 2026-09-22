"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import { submitReview, getDueCards, getReviewsForDeck, ensureReviewsExist } from "@/lib/queries/reviews";
import { getCards } from "@/lib/queries/cards";
import { LoadingPage } from "@/components/ui/loading";
import { CheckCircle, XCircle, Volume2, Trophy, RotateCcw, Pause, Play } from "lucide-react";
import type { Card as CardType, Deck } from "@/types";

const PairIt = dynamic(() => import("@/components/games/pair-it").then((m) => m.PairIt), { ssr: false });
const GuessIt = dynamic(() => import("@/components/games/guess-it").then((m) => m.GuessIt), { ssr: false });
const RecallIt = dynamic(() => import("@/components/games/recall-it").then((m) => m.RecallIt), { ssr: false });
const TypeIt = dynamic(() => import("@/components/games/type-it").then((m) => m.TypeIt), { ssr: false });

interface StudySessionProps {
  deck: Deck;
  mode?: "learn" | "review" | "game" | "autoplay";
  onProgress?: (progress: number) => void;
}

interface SavedProgress {
  deckId: string;
  mode: string;
  batchIndex: number;
  phase: string;
  batchCardIds: string[];
  totalCards: number;
  currentIndex: number;
  shuffledCardOrder: string[];
}

const BATCH_SIZE = 5;
const GAME_ORDER = ["pair-it", "guess-it", "recall-it", "type-it"] as const;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
    if (!parsed.batchCardIds || parsed.batchCardIds.length === 0) return null;
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
  const [allCards, setAllCards] = useState<CardType[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [phase, setPhase] = useState<"flashcards" | "games">("flashcards");
  const [gameIndex, setGameIndex] = useState(0);
  const [totalBatches, setTotalBatches] = useState(1);

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
  const [answeredCardIds, setAnsweredCardIds] = useState<Set<string>>(new Set());

  const batchesRef = useRef<CardType[][]>([]);
  const advanceRef = useRef<() => void>(() => {});
  const answersRef = useRef<Map<string, boolean>>(new Map());
  const shuffledOrderRef = useRef<string[]>([]);
  const progressCheckedRef = useRef(false);

  const loadCards = useCallback(async (resume?: SavedProgress) => {
    try {
      if (mode === "review") {
        const dueCards = await getDueCards(deck.id);
        setCards(dueCards);
        setAllCards(dueCards);
        batchesRef.current = [dueCards];
        setTotalBatches(1);
        setBatchIndex(0);
        setPhase("flashcards");
        setGameIndex(0);

        const map = new Map<string, CardType>();
        for (const c of dueCards) map.set(c.id, c);
        setCardMap(map);

        setCurrentIndex(0);
        setCorrectCount(0);
        setIncorrectCount(0);
        setNewCardIds(new Set());
      } else if (mode === "learn") {
        const all = await getCards(deck.id);
        let freshCards: CardType[] = [];
        let reviewedCards: CardType[] = [];

        try {
          const reviews = await getReviewsForDeck(deck.id);
          const reviewedIds = new Set(reviews.map((r) => r.card_id));
          freshCards = all.filter((c) => !reviewedIds.has(c.id));
          reviewedCards = all.filter((c) => reviewedIds.has(c.id));
        } catch {
          freshCards = all;
          reviewedCards = [];
        }

        const learnCards = [...freshCards, ...reviewedCards];
        setAllCards(learnCards);
        setNewCardIds(new Set(freshCards.map((c) => c.id)));

        const map = new Map<string, CardType>();
        for (const c of learnCards) map.set(c.id, c);
        setCardMap(map);

        let orderedCards: CardType[];
        if (resume?.shuffledCardOrder && resume.shuffledCardOrder.length > 0) {
          orderedCards = resume.shuffledCardOrder
            .map((id) => map.get(id))
            .filter(Boolean) as CardType[];
          const existingIds = new Set(orderedCards.map((c) => c.id));
          const missing = learnCards.filter((c) => !existingIds.has(c.id));
          if (missing.length > 0) orderedCards.push(...missing);
        } else {
          orderedCards = shuffleArray(learnCards);
        }

        const batches: CardType[][] = [];
        for (let i = 0; i < orderedCards.length; i += BATCH_SIZE) {
          batches.push(orderedCards.slice(i, i + BATCH_SIZE));
        }
        batchesRef.current = batches;
        setTotalBatches(batches.length);

        const shuffledOrder = orderedCards.map((c) => c.id);
        shuffledOrderRef.current = shuffledOrder;

        if (resume) {
          const resBatchCards = resume.batchCardIds
            .map((id) => map.get(id))
            .filter(Boolean) as CardType[];
          setBatchIndex(resume.batchIndex);
          setPhase(resume.phase as "flashcards" | "games");
          setGameIndex(0);
          setCards(resBatchCards.length > 0 ? resBatchCards : batches[0] || []);
          setCurrentIndex(resume.currentIndex ?? 0);
        } else {
          setBatchIndex(0);
          setPhase("flashcards");
          setGameIndex(0);
          setCards(batches[0] || []);
          setCurrentIndex(0);

          saveProgressData({
            deckId: deck.id,
            mode,
            batchIndex: 0,
            phase: "flashcards",
            batchCardIds: (batches[0] || []).map((c) => c.id),
            totalCards: learnCards.length,
            currentIndex: 0,
            shuffledCardOrder: shuffledOrder,
          });
        }
        setCorrectCount(0);
        setIncorrectCount(0);
      } else {
        const all = await getCards(deck.id);
        setCards(all);
        setAllCards(all);
        batchesRef.current = [all];
        setTotalBatches(1);
        setBatchIndex(0);
        setPhase("flashcards");
        setGameIndex(0);

        const map = new Map<string, CardType>();
        for (const c of all) map.set(c.id, c);
        setCardMap(map);

        setCurrentIndex(0);
        setCorrectCount(0);
        setIncorrectCount(0);
        setNewCardIds(new Set());
      }
      setIsComplete(false);
      setFlipped(false);
      setIncorrectCardIds([]);
      setIsReasking(false);
      if (!resume) {
        setAnsweredCardIds(new Set());
        answersRef.current.clear();
      }
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
    if (loading || mode === "autoplay" || isReasking || isComplete) return;
    if (mode === "learn" || mode === "review") {
      const saved = loadProgressData(deck.id, mode);
      if (saved) {
        setPendingResume(saved);
        setShowResumeDialog(true);
      }
    }
    progressCheckedRef.current = true;
  }, [deck.id, mode, loading, isReasking, isComplete]);

  useEffect(() => {
    if (!progressCheckedRef.current) return;
    if (cards.length > 0 && mode === "learn" && !showResumeDialog && !isReasking && !isComplete) {
      saveProgressData({
        deckId: deck.id,
        mode,
        batchIndex,
        phase,
        batchCardIds: cards.map((c) => c.id),
        totalCards: allCards.length,
        currentIndex,
        shuffledCardOrder: shuffledOrderRef.current,
      });
    }
  }, [currentIndex, cards, mode, deck.id, batchIndex, phase, showResumeDialog, isReasking, isComplete, allCards.length]);

  useEffect(() => {
    let progress = 0;
    if (mode === "learn" && allCards.length > 0 && totalBatches > 0) {
      const completedBatches = batchIndex;
      const batchProgress = phase === "games" ? 1 : (cards.length > 0 ? currentIndex / cards.length : 0);
      progress = ((completedBatches + batchProgress) / totalBatches) * 100;
    } else if (cards.length > 0) {
      progress = ((currentIndex + 1) / cards.length) * 100;
    }
    onProgress?.(Math.min(progress, 100));
  }, [currentIndex, cards.length, onProgress, mode, batchIndex, phase, totalBatches, allCards.length]);

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
      if (!card) return;
      const lang = currentIndex % 2 === 0 ? deck.source_language : deck.target_language;
      const text = currentIndex % 2 === 0 ? card.front : card.back;
      speak(text, getLanguageVoiceCode(lang));
    }
  }, [currentIndex, mode, cards, isPlaying, deck]);

  advanceRef.current = () => {
    const batches = batchesRef.current;
    const nextBatchIdx = batchIndex + 1;
    if (nextBatchIdx < batches.length) {
      setBatchIndex(nextBatchIdx);
      setCards(batches[nextBatchIdx]);
      setCurrentIndex(0);
      setFlipped(false);
      setPhase("flashcards");
      setGameIndex(0);
      setIncorrectCardIds([]);
      setIsReasking(false);
    } else {
      const answers = new Map(answersRef.current);
      answersRef.current.clear();
      ensureReviewsExist(deck.id, answers).then(() => {
        clearProgressData(deck.id, mode);
        setIsComplete(true);
      }).catch(() => {
        clearProgressData(deck.id, mode);
        setIsComplete(true);
      });
    }
  };

  const handleAnswer = async (correct: boolean) => {
    if (submitting) return;
    setSubmitting(true);

    const currentCard = cards[currentIndex];
    if (!currentCard) { setSubmitting(false); return; }

    try {
      await submitReview(currentCard.id, correct);
    } catch (error) {
      console.error("Failed to submit review:", error);
    }

    answersRef.current.set(currentCard.id, correct);

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
    setAnsweredCardIds((prev) => {
      const next = new Set(prev);
      next.add(currentCard.id);
      return next;
    });
    setNewCardIds((prev) => {
      if (prev.has(currentCard.id)) {
        const next = new Set(prev);
        next.delete(currentCard.id);
        return next;
      }
      return prev;
    });

    if (currentIndex + 1 >= cards.length) {
      if (mode === "learn") {
        const uniqueIncorrect = [...new Set(newIncorrectIds)];
        if (uniqueIncorrect.length > 0 && !isReasking) {
          const reviewCards = uniqueIncorrect
            .map((id) => cardMap.get(id))
            .filter(Boolean) as CardType[];
          if (reviewCards.length > 0) {
            setIsReasking(true);
            setCards(reviewCards);
            setCurrentIndex(0);
            setFlipped(false);
            setIncorrectCardIds([]);
            setSubmitting(false);
            return;
          }
        }
        setPhase("games");
        setGameIndex(0);
        setCurrentIndex(0);
        setFlipped(false);
        setIsReasking(false);
        setIncorrectCardIds([]);
      } else {
        clearProgressData(deck.id, mode);
        setIsComplete(true);
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }

    setSubmitting(false);
  };

  const handleResume = () => {
    setShowResumeDialog(false);
    progressCheckedRef.current = true;
    if (pendingResume) {
      loadCards(pendingResume);
    }
    setPendingResume(null);
  };

  const handleStartFresh = () => {
    setShowResumeDialog(false);
    progressCheckedRef.current = true;
    clearProgressData(deck.id, mode);
    setPendingResume(null);
    loadCards();
  };

  const handleFlipAndSpeak = () => {
    setFlipped(!flipped);
    if (!flipped && cards[currentIndex]) {
      const lang = deck.target_language;
      speak(cards[currentIndex].back, getLanguageVoiceCode(lang));
    }
  };

  const gameIndexRef = useRef(gameIndex);
  gameIndexRef.current = gameIndex;

  const handleGameComplete = useCallback(() => {
    const nextGameIdx = gameIndexRef.current + 1;
    if (nextGameIdx < GAME_ORDER.length) {
      setGameIndex(nextGameIdx);
    } else {
      advanceRef.current();
    }
  }, []);

  const noopProgress = useCallback(() => {}, []);

  const currentGame = GAME_ORDER[gameIndexRef.current];

  if (loading) return <LoadingPage />;

  if (cards.length === 0 && !isComplete) {
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
            <p className="text-3xl font-bold">{allCards.length}</p>
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
    );
  }

  if (mode === "learn" && phase === "games" && cards.length > 0) {
    const gameKey = `batch${batchIndex}-game${gameIndex}`;

    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-4 text-center">
          <Badge variant="outline" className="mb-2">
            Batch {batchIndex + 1} / {totalBatches}
          </Badge>
          <p className="text-sm text-muted-foreground capitalize">
            {currentGame.replace("-", " ")}
          </p>
        </div>
        {currentGame === "pair-it" && (
          <PairIt key={gameKey} cards={cards} onComplete={handleGameComplete} onProgress={noopProgress} autoAdvance />
        )}
        {currentGame === "guess-it" && (
          <GuessIt
            key={gameKey}
            cards={cards}
            sourceLanguage={deck.source_language}
            targetLanguage={deck.target_language}
            onComplete={handleGameComplete}
            onProgress={noopProgress}
            autoAdvance
          />
        )}
        {currentGame === "recall-it" && (
          <RecallIt
            key={gameKey}
            cards={cards}
            sourceLanguage={deck.source_language}
            targetLanguage={deck.target_language}
            onComplete={handleGameComplete}
            onProgress={noopProgress}
            autoAdvance
          />
        )}
        {currentGame === "type-it" && (
          <TypeIt
            key={gameKey}
            cards={cards}
            sourceLanguage={deck.source_language}
            targetLanguage={deck.target_language}
            onComplete={handleGameComplete}
            onProgress={noopProgress}
            autoAdvance
          />
        )}
      </div>
    );
  }

  if (mode === "autoplay") {
    const currentCard = cards[currentIndex];
    if (!currentCard) return null;
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
              <><Pause className="h-5 w-5" /> Pause</>
            ) : (
              <><Play className="h-5 w-5" /> Play</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  if (!currentCard) return null;
  const isCurrentNew = newCardIds.has(currentCard.id) && !answeredCardIds.has(currentCard.id);
  const isCurrentReask = isReasking;

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
          {mode === "learn" && (
            <p className="text-xs text-muted-foreground mt-1">
              Batch {batchIndex + 1} of {totalBatches}
              {isReasking && " · Reviewing missed cards"}
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
