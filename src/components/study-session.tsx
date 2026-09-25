"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import { TermText } from "@/components/term-text";
import { toPlainText } from "@/lib/terms";
import type { ReviewGrade } from "@/lib/srs";
import { submitReview, getDueCards, getReviewsForDeck, ensureReviewsExist } from "@/lib/queries/reviews";
import { getCards } from "@/lib/queries/cards";
import { LoadingPage } from "@/components/ui/loading";
import { CheckCircle, XCircle, Volume2, Trophy, RotateCcw, Pause, Play, Undo2 } from "lucide-react";
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
  const [effortCount, setEffortCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [incorrectCardIds, setIncorrectCardIds] = useState<string[]>([]);
  const [effortCardIds, setEffortCardIds] = useState<string[]>([]);
  const [isReasking, setIsReasking] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [pendingResume, setPendingResume] = useState<SavedProgress | null>(null);
  const [cardMap, setCardMap] = useState<Map<string, CardType>>(new Map());
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
  const [answeredCardIds, setAnsweredCardIds] = useState<Set<string>>(new Set());

  const [drag, setDrag] = useState({ dx: 0, dy: 0, active: false });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const [exit, setExit] = useState<{
    card: CardType;
    dir: "left" | "right" | "up";
    startX: number;
    startY: number;
  } | null>(null);
  const exitElRef = useRef<HTMLDivElement>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  // Animate the exiting (graded) card off-screen
  useEffect(() => {
    if (!exit) return;
    const el = exitElRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = `translate(${exit.startX}px, ${exit.startY}px) rotate(${exit.startX / 16}deg)`;
    el.style.opacity = "1";
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.28s ease-in, opacity 0.28s ease-in";
        el.style.transform =
          exit.dir === "left"
            ? "translateX(-130%) rotate(-18deg)"
            : exit.dir === "right"
            ? "translateX(130%) rotate(18deg)"
            : "translateY(-135%)";
        el.style.opacity = "0";
      })
    );
    return () => cancelAnimationFrame(raf);
  }, [exit]);

  const batchesRef = useRef<CardType[][]>([]);
  const batchCardsRef = useRef<CardType[]>([]);
  const advanceRef = useRef<() => void>(() => {});
  const answersRef = useRef<Map<string, ReviewGrade>>(new Map());
  const shuffledOrderRef = useRef<string[]>([]);
  const savedProgressHandledRef = useRef(false);

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
        setEffortCount(0);
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

        const learnCards = freshCards.length > 0 ? [...freshCards] : [...reviewedCards];
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
          batchCardsRef.current = batches[resume.batchIndex] || batches[0] || [];
          setCards(resBatchCards.length > 0 ? resBatchCards : batches[0] || []);
          setCurrentIndex(resume.currentIndex ?? 0);
        } else {
          setBatchIndex(0);
          setPhase("flashcards");
          setGameIndex(0);
          batchCardsRef.current = batches[0] || [];
          setCards(batches[0] || []);
          setCurrentIndex(0);
        }
        setCorrectCount(0);
        setEffortCount(0);
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
        setEffortCount(0);
        setIncorrectCount(0);
        setNewCardIds(new Set());
      }
      setIsComplete(false);
      setFlipped(false);
      setIncorrectCardIds([]);
      setEffortCardIds([]);
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
        const isAtStart =
          saved.batchIndex === 0 &&
          (saved.currentIndex ?? 0) === 0 &&
          saved.phase === "flashcards";
        if (!isAtStart) {
          setPendingResume(saved);
          setShowResumeDialog(true);
          return;
        }
        clearProgressData(deck.id, mode);
      }
    }
    savedProgressHandledRef.current = true;
  }, [deck.id, mode, loading, isReasking, isComplete]);

  useEffect(() => {
    if (!savedProgressHandledRef.current) return;
    const isAtStart = batchIndex === 0 && currentIndex === 0 && phase === "flashcards";
    if (isAtStart) return;
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
      batchCardsRef.current = batches[nextBatchIdx];
      setCards(batches[nextBatchIdx]);
      setCurrentIndex(0);
      setFlipped(false);
      setPhase("flashcards");
      setGameIndex(0);
      setIncorrectCardIds([]);
      setEffortCardIds([]);
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

  const advanceToGames = () => {
    // Games always play with the FULL batch, not the re-asked subset,
    // so Easy cards from the first pass are included too.
    if (batchCardsRef.current.length > 0) {
      setCards(batchCardsRef.current);
    }
    setPhase("games");
    setGameIndex(0);
    setCurrentIndex(0);
    setFlipped(false);
    setIsReasking(false);
    setIncorrectCardIds([]);
    setEffortCardIds([]);
  };

  /**
   * Grade with a fly-out animation. The review is fired without awaiting
   * (retry + end-of-session sync cover failures) and the next card advances
   * synchronously beneath the exiting card — no snap-back.
   */
  const gradeWithAnimation = (
    grade: ReviewGrade,
    dir: "left" | "right" | "up",
    start?: { x: number; y: number }
  ) => {
    if (submitting || exit) return;
    const card = cards[currentIndex];
    if (!card) return;
    setSubmitting(true);

    submitReview(card.id, grade).catch((error) => {
      console.error("Failed to submit review:", error);
    });
    answersRef.current.set(card.id, grade);

    if (grade === "easy") {
      setCorrectCount((c) => c + 1);
    } else if (grade === "effort") {
      setEffortCount((c) => c + 1);
    } else {
      setIncorrectCount((c) => c + 1);
    }

    const addUnique = (list: string[]) =>
      list.includes(card.id) ? list : [...list, card.id];

    let newIncorrectIds = incorrectCardIds;
    let newEffortIds = effortCardIds;
    if (grade === "missed") {
      newIncorrectIds = addUnique(incorrectCardIds);
      setIncorrectCardIds(newIncorrectIds);
    } else if (grade === "effort") {
      newEffortIds = addUnique(effortCardIds);
      setEffortCardIds(newEffortIds);
      newIncorrectIds = incorrectCardIds.filter((id) => id !== card.id);
      setIncorrectCardIds(newIncorrectIds);
    } else {
      newIncorrectIds = incorrectCardIds.filter((id) => id !== card.id);
      newEffortIds = effortCardIds.filter((id) => id !== card.id);
      setIncorrectCardIds(newIncorrectIds);
      setEffortCardIds(newEffortIds);
    }
    setAnsweredCardIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      return next;
    });
    setNewCardIds((prev) => {
      if (prev.has(card.id)) {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      }
      return prev;
    });

    setExit({ card, dir, startX: start?.x ?? 0, startY: start?.y ?? 0 });
    setDrag({ dx: 0, dy: 0, active: false });
    dragStartRef.current = null;

    if (currentIndex + 1 >= cards.length) {
      if (mode === "learn") {
        const uniqueMissed = [...new Set(newIncorrectIds)];
        const uniqueEffort = [...new Set(newEffortIds)];
        if ((uniqueMissed.length > 0 || uniqueEffort.length > 0) && !isReasking) {
          const reviewCards = [...uniqueMissed, ...uniqueEffort]
            .map((id) => cardMap.get(id))
            .filter(Boolean) as CardType[];
          if (reviewCards.length > 0) {
            setIsReasking(true);
            setCards(reviewCards);
            setCurrentIndex(0);
            setFlipped(false);
            setIncorrectCardIds([]);
            setEffortCardIds([]);
          } else {
            advanceToGames();
          }
        } else {
          advanceToGames();
        }
      } else {
        clearProgressData(deck.id, mode);
        setIsComplete(true);
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }

    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = setTimeout(() => {
      setExit(null);
      setSubmitting(false);
    }, 320);
  };

  const SWIPE_X = 110;
  const SWIPE_UP = 110;

  const onCardPointerDown = (e: React.PointerEvent) => {
    if (!flipped || submitting) return;
    if ((e.target as HTMLElement).closest("button")) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ dx: 0, dy: 0, active: true });
  };

  const onCardPointerMove = (e: React.PointerEvent) => {
    if (!drag.active || !dragStartRef.current) return;
    setDrag({
      dx: e.clientX - dragStartRef.current.x,
      dy: e.clientY - dragStartRef.current.y,
      active: true,
    });
  };

  const resetDrag = () => {
    dragStartRef.current = null;
    setDrag({ dx: 0, dy: 0, active: false });
  };

  // A click event lost after a swipe (retargeted to an unmounted node on
  // mobile) must not eat the next card's first tap.
  useEffect(() => {
    suppressClickRef.current = false;
    dragStartRef.current = null;
  }, [currentIndex, cards]);

  const onCardPointerUp = (e: React.PointerEvent) => {
    if (!drag.active || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    suppressClickRef.current = Math.abs(dx) > 10 || Math.abs(dy) > 10;

    if (Math.abs(dx) >= SWIPE_X && Math.abs(dx) >= Math.abs(dy)) {
      gradeWithAnimation(dx > 0 ? "easy" : "missed", dx > 0 ? "right" : "left", { x: dx, y: dy });
      return;
    }
    if (dy <= -SWIPE_UP && Math.abs(dy) > Math.abs(dx)) {
      gradeWithAnimation("effort", "up", { x: dx, y: dy });
      return;
    }
    dragStartRef.current = null;
    setDrag({ dx: 0, dy: 0, active: false });
  };

  const handleCardTap = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    handleFlipAndSpeak();
  };

  const swipeDir =
    drag.dx > 40 ? "easy" : drag.dx < -40 ? "missed" : drag.dy < -40 ? "effort" : null;
  const swipeIntensity = Math.min(Math.max(Math.abs(drag.dx), Math.abs(drag.dy)) / SWIPE_X, 1);

  const handleResume = () => {
    setShowResumeDialog(false);
    savedProgressHandledRef.current = true;
    if (pendingResume) {
      loadCards(pendingResume);
    }
    setPendingResume(null);
  };

  const handleStartFresh = () => {
    setShowResumeDialog(false);
    savedProgressHandledRef.current = true;
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
            <p className="text-3xl font-bold text-rose-500">{incorrectCount}</p>
            <p className="text-sm text-muted-foreground">Missed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-500">{effortCount}</p>
            <p className="text-sm text-muted-foreground">With effort</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-500">{correctCount}</p>
            <p className="text-sm text-muted-foreground">Easy</p>
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
                alt={toPlainText(currentCard.front)}
                className="max-h-36 rounded-lg object-cover mx-auto mb-4"
              />
            )}
            <p className="text-sm text-muted-foreground mb-2">Front</p>
            <h2 className="text-4xl font-bold mb-4">
              <TermText text={currentCard.front} />
            </h2>
            <div className="h-px bg-border w-32 mx-auto my-4" />
            <p className="text-sm text-muted-foreground mb-2">Back</p>
            <h2 className="text-3xl font-bold text-primary">
              <TermText text={currentCard.back} />
            </h2>
            {currentCard.example && (
              <p className="text-sm text-muted-foreground italic mt-4 max-w-sm mx-auto">
                &quot;
                <TermText text={currentCard.example} />
                &quot;
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
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <Badge variant="outline">
              {currentIndex + 1} / {cards.length}
            </Badge>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-rose-600">
                {incorrectCount}
              </Badge>
              <Badge variant="secondary" className="text-amber-600">
                {effortCount}
              </Badge>
              <Badge variant="secondary" className="text-emerald-600">
                {correctCount}
              </Badge>
            </div>
          </div>
          {mode === "learn" && (
            <p className="text-xs text-muted-foreground mt-1">
              Batch {batchIndex + 1} of {totalBatches}
              {isReasking && " · Reviewing difficult cards"}
            </p>
          )}
        </div>

        <div className="relative mb-2 pb-5" style={{ touchAction: "pan-y" }}>
          {/* Card stack behind: two solid layers peeking below the top card */}
          <div
            aria-hidden
            className="absolute left-7 right-7 top-7 bottom-2 rounded-3xl border border-border bg-card shadow-lg"
            style={{ transform: "rotate(-3deg)" }}
          />
          <div
            aria-hidden
            className="absolute left-3.5 right-3.5 top-3.5 bottom-3 rounded-3xl border border-border bg-card shadow-md"
            style={{ transform: "rotate(2deg)" }}
          />

          {/* Draggable top card */}
          <div
            key={currentCard.id}
            className="relative cursor-grab active:cursor-grabbing select-none"
            style={{
              perspective: "1000px",
              touchAction: "pan-y",
              transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 16}deg)`,
              transition: drag.active ? "none" : "transform 0.25s ease",
            }}
            onPointerDown={onCardPointerDown}
            onPointerMove={onCardPointerMove}
            onPointerUp={onCardPointerUp}
            onPointerCancel={resetDrag}
            onClick={handleCardTap}
          >
            <div
              className="transition-transform duration-500 relative"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <Card
                className="w-full min-h-[340px] flex flex-col items-center justify-center p-8 border-border"
                style={{ backfaceVisibility: "hidden" }}
              >
                <CardContent
                  className="text-center p-0 w-full"
                  style={{ opacity: 1 - Math.min(swipeIntensity * 1.4, 1) }}
                >
                  <div className="flex justify-center gap-2 mb-4 min-h-[18px]">
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
                  {currentCard.image_url && (
                    <img
                      src={currentCard.image_url}
                      alt={toPlainText(currentCard.front)}
                      draggable={false}
                      className="max-h-32 rounded-lg object-cover mx-auto mb-4 pointer-events-none"
                    />
                  )}
                  <h2 className="text-3xl font-bold mb-3 text-center">
                    <TermText text={currentCard.front} />
                  </h2>
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
                      size="icon"
                      className="rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(currentCard.front, getLanguageVoiceCode(deck.source_language));
                      }}
                      aria-label="Listen"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="w-full min-h-[340px] flex flex-col items-center justify-center p-8 absolute top-0 left-0 border-border"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <CardContent
                  className="text-center p-0 w-full"
                  style={{ opacity: 1 - Math.min(swipeIntensity * 1.4, 1) }}
                >
                  {currentCard.image_url && (
                    <img
                      src={currentCard.image_url}
                      alt={toPlainText(currentCard.back)}
                      draggable={false}
                      className="max-h-32 rounded-lg object-cover mx-auto mb-4 pointer-events-none"
                    />
                  )}
                  <h2 className="text-3xl font-bold mb-3 text-center">
                    <TermText text={currentCard.back} />
                  </h2>
                  {currentCard.example && (
                    <p className="text-muted-foreground italic mb-4 max-w-sm mx-auto">
                      &quot;
                      <TermText text={currentCard.example} />
                      &quot;
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(currentCard.back, getLanguageVoiceCode(deck.target_language));
                    }}
                    aria-label="Listen"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Swipe tint + stamp (content fades out so only these show) */}
            {swipeDir && (
              <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
                <div
                  className={`absolute inset-0 ${
                    swipeDir === "easy"
                      ? "bg-emerald-500"
                      : swipeDir === "missed"
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                  style={{ opacity: 0.25 + swipeIntensity * 0.75 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-3xl font-black tracking-widest text-white drop-shadow-lg"
                    style={{ opacity: swipeIntensity }}
                  >
                    {swipeDir === "easy" ? "EASY" : swipeDir === "missed" ? "MISSED" : "EFFORT"}
                  </span>
                </div>
              </div>
            )}

            {/* Exiting (graded) card flying off, next card emerging beneath */}
            {exit && (
              <div className="absolute inset-0 pointer-events-none">
                <div ref={exitElRef} className="w-full h-full">
                  <Card className="w-full h-full min-h-[340px] flex flex-col items-center justify-center p-8 border-border">
                    <CardContent className="text-center p-0 w-full">
                      <h2 className="text-3xl font-bold text-center">
                        <TermText text={exit.card.back} />
                      </h2>
                      {exit.card.example && (
                        <p className="text-muted-foreground italic mt-3 max-w-sm mx-auto">
                          &quot;
                          <TermText text={exit.card.example} />
                          &quot;
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {!flipped ? (
          <p className="text-center text-sm text-muted-foreground mt-4 mb-2">
            Tap to show answer
          </p>
        ) : (
          <div className="mt-4 mb-2">
            <p className="text-center font-semibold">Did the answer come to mind?</p>
            <p className="text-center text-sm text-muted-foreground mb-4">
              You can also swipe right, left or up to answer
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => gradeWithAnimation("missed", "left")}
                disabled={submitting}
                className="flex-1 max-w-[150px] flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-3 font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
                <span className="text-sm leading-tight">Missed</span>
              </button>
              <button
                onClick={() => gradeWithAnimation("effort", "up")}
                disabled={submitting}
                className="flex-1 max-w-[150px] flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-3 font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
              >
                <Undo2 className="h-5 w-5" />
                <span className="text-sm leading-tight">With effort</span>
              </button>
              <button
                onClick={() => gradeWithAnimation("easy", "right")}
                disabled={submitting}
                className="flex-1 max-w-[150px] flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-3 font-semibold bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm leading-tight">Easy</span>
              </button>
            </div>
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
