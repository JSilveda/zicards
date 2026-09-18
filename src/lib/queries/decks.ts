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

  const decksWithCount = await Promise.all(
    (decks || []).map(async (deck: Deck) => {
      const { count } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", deck.id);
      return { ...deck, card_count: count || 0 };
    })
  );

  return decksWithCount;
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
  deck: Omit<Deck, "id" | "created_at" | "updated_at" | "card_count">
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
