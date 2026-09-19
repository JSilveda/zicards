import { createClient } from "@/lib/supabase/client";
import type { Review } from "@/types";
import { calculateNextReview, getNextReviewDate } from "@/lib/srs";

interface ReviewRow {
  id: string;
  card_id: string;
  user_id: string;
  status: string;
  interval_days: number;
  next_review_date: string;
  box_number: number;
  created_at: string;
  updated_at: string;
}

interface CardRow {
  id: string;
}

export async function getReviewsForDeck(deckId: string): Promise<Review[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: cards } = await supabase
    .from("cards")
    .select("id")
    .eq("deck_id", deckId);

  if (!cards || cards.length === 0) return [];

  const cardIds = cards.map((c: CardRow) => c.id);

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .in("card_id", cardIds)
    .eq("user_id", user.id);

  if (error) throw error;
  return (data || []) as Review[];
}

export async function getDueCards(deckId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", deckId);

  if (!cards || cards.length === 0) return [];

  const cardIds = cards.map((c: CardRow) => c.id);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .in("card_id", cardIds)
    .eq("user_id", user.id);

  const reviewMap = new Map<string, ReviewRow>(
    (reviews || []).map((r: ReviewRow) => [r.card_id, r])
  );

  const now = new Date();
  const dueCards = cards.filter((card: Record<string, unknown>) => {
    const review = reviewMap.get(card.id as string);
    if (!review) return true;
    return new Date(review.next_review_date) <= now;
  });

  return dueCards;
}

export async function submitReview(
  cardId: string,
  correct: boolean
): Promise<Review> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("*")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  const currentBox = (existingReview as ReviewRow | null)?.box_number || 1;
  const { nextBox, intervalDays } = calculateNextReview(currentBox, correct);
  const nextReviewDate = getNextReviewDate(intervalDays);

  if (existingReview) {
    const { data, error } = await supabase
      .from("reviews")
      .update({
        status: correct ? "correct" : "incorrect",
        interval_days: intervalDays,
        next_review_date: nextReviewDate.toISOString(),
        box_number: nextBox,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (existingReview as ReviewRow).id)
      .select()
      .single();

    if (error) throw error;
    return data as Review;
  } else {
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        card_id: cardId,
        user_id: user.id,
        status: correct ? "correct" : "incorrect",
        interval_days: intervalDays,
        next_review_date: nextReviewDate.toISOString(),
        box_number: nextBox,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Review;
  }
}

export async function getDashboardStats(): Promise<{
  totalDecks: number;
  totalCards: number;
  cardsToReviewToday: number;
  streak: number;
  weeklyProgress: { day: string; cardsStudied: number }[];
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      totalDecks: 0,
      totalCards: 0,
      cardsToReviewToday: 0,
      streak: 0,
      weeklyProgress: [],
    };
  }

  const { count: totalDecks } = await supabase
    .from("decks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: userDecks } = await supabase
    .from("decks")
    .select("id")
    .eq("user_id", user.id);

  const deckIds = (userDecks || []).map((d: { id: string }) => d.id);

  let totalCards = 0;
  if (deckIds.length > 0) {
    const { count } = await supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .in("deck_id", deckIds);
    totalCards = count || 0;
  }

  let cardsToReviewToday = 0;
  if (deckIds.length > 0) {
    const { count } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_review_date", new Date().toISOString());
    cardsToReviewToday = count || 0;
  }

  const { data: recentReviews } = await supabase
    .from("reviews")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  let streak = 0;
  if (recentReviews && recentReviews.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDays = new Set(
      recentReviews.map((r: { created_at: string }) => {
        const d = new Date(r.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    const sortedDays = Array.from(uniqueDays).sort((a, b) => (b as number) - (a as number));
    const todayTime = today.getTime();

    if (sortedDays[0] === todayTime) {
      streak = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const expectedPrev = todayTime - i * 86400000;
        if (sortedDays[i] === expectedPrev) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyProgress = weekDays.map((day: string, index: number) => {
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() - (6 - index));
    dayDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(dayDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const count = (recentReviews || []).filter((r: { created_at: string }) => {
      const reviewDate = new Date(r.created_at);
      return reviewDate >= dayDate && reviewDate < nextDay;
    }).length;

    return { day, cardsStudied: count };
  });

  return {
    totalDecks: totalDecks || 0,
    totalCards,
    cardsToReviewToday,
    streak,
    weeklyProgress,
  };
}
