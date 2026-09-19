import { createClient } from "@/lib/supabase/client";
import type { Deck } from "@/types";

export async function getDecks(): Promise<Deck[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: decks, error } = await supabase
    .from("decks")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const decksWithStats = await Promise.all(
    (decks || []).map(async (deck: Deck) => {
      const { count: cardCount } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", deck.id);

      const totalCards = cardCount || 0;

      let learnedCount = 0;
      let dueCount = 0;

      if (totalCards > 0) {
        const { data: cards } = await supabase
          .from("cards")
          .select("id")
          .eq("deck_id", deck.id);

        if (cards && cards.length > 0) {
          const cardIds = cards.map((c: { id: string }) => c.id);

          const { data: reviews } = await supabase
            .from("reviews")
            .select("card_id, box_number, next_review_date")
            .in("card_id", cardIds)
            .eq("user_id", user.id);

          type ReviewRow = { card_id: string; box_number: number; next_review_date: string };
          const reviewMap = new Map<string, ReviewRow>(
            (reviews as ReviewRow[] || []).map((r) => [r.card_id, r])
          );

          const now = new Date();
          for (const card of cards) {
            const review = reviewMap.get(card.id);
            if (review) {
              if (review.box_number >= 1) {
                learnedCount++;
              }
              if (new Date(review.next_review_date) <= now) {
                dueCount++;
              }
            }
          }
        }
      }

      const progressPercent = totalCards > 0
        ? Math.round((learnedCount / totalCards) * 100)
        : 0;

      return {
        ...deck,
        card_count: totalCards,
        learned_count: learnedCount,
        due_count: dueCount,
        progress_percent: progressPercent,
      };
    })
  );

  return decksWithStats;
}

export async function getDeck(id: string): Promise<Deck | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDeck(
  deck: Omit<Deck, "id" | "created_at" | "updated_at" | "card_count" | "learned_count" | "due_count" | "progress_percent">
): Promise<Deck> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decks")
    .insert(deck)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDeck(
  id: string,
  updates: Partial<Omit<Deck, "id" | "created_at">>
): Promise<Deck> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDeck(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("decks").delete().eq("id", id);
  if (error) throw error;
}
