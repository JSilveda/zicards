import { createClient } from "@/lib/supabase/client";
import type { Card } from "@/types";

export async function getCards(deckId: string): Promise<Card[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCard(id: string): Promise<Card | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCard(
  card: Omit<Card, "id" | "created_at" | "updated_at">
): Promise<Card> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cards")
    .insert(card)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCard(
  id: string,
  updates: Partial<Omit<Card, "id" | "created_at">>
): Promise<Card> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cards")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCard(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) throw error;
}

export async function clearDeckCards(deckId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("cards").delete().eq("deck_id", deckId);
  if (error) throw error;
}

export async function createCards(
  cards: Omit<Card, "id" | "created_at" | "updated_at">[]
): Promise<Card[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cards")
    .insert(cards)
    .select();

  if (error) throw error;
  return data || [];
}
