"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FlashCard } from "@/components/flash-card";
import { getCards, createCard, updateCard, deleteCard } from "@/lib/queries/cards";
import { getReviewsForDeck } from "@/lib/queries/reviews";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Image, ArrowUpDown, Braces } from "lucide-react";
import type { Card as CardType } from "@/types";

interface CardManagerProps {
  deckId: string;
  sourceLanguage: string;
  targetLanguage: string;
  searchQuery?: string;
}

export function CardManager({
  deckId,
  sourceLanguage,
  targetLanguage,
  searchQuery: externalSearch = "",
}: CardManagerProps) {
  const [cards, setCards] = useState<CardType[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [sortBy, setSortBy] = useState("newest");
  const [form, setForm] = useState({
    front: "",
    back: "",
    example: "",
    transcription: "",
    gender: "",
    image_url: "",
  });
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const exampleRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    field: "front" | "back" | "example"
  ) => {
    const el = ref.current;
    if (!el) return;
    const value = form[field];
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    setForm({ ...form, [field]: `${value.slice(0, start)}{${selected}}${value.slice(end)}` });
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + 1;
      el.setSelectionRange(cursor, cursor + selected.length);
    });
  };

  const wrapButton = (
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    field: "front" | "back" | "example"
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 text-xs"
      title="Envolver la selección en {término}"
      onClick={() => wrapSelection(ref, field)}
    >
      <Braces className="h-3.5 w-3.5" />
      {"{ }"}
    </Button>
  );

  const loadCards = useCallback(async () => {
    try {
      const [data, reviews] = await Promise.all([
        getCards(deckId),
        getReviewsForDeck(deckId).catch(() => []),
      ]);
      setCards(data);
      setReviewedIds(new Set(reviews.map((r) => r.card_id)));
    } catch (error) {
      console.error("Failed to load cards:", error);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    const handler = () => openCreate();
    document.addEventListener("open-create-card", handler);
    return () => document.removeEventListener("open-create-card", handler);
  }, []);

  const openCreate = () => {
    setEditingCard(null);
    setForm({ front: "", back: "", example: "", transcription: "", gender: "", image_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (card: CardType) => {
    setEditingCard(card);
    setForm({
      front: card.front,
      back: card.back,
      example: card.example || "",
      transcription: card.transcription || "",
      gender: card.gender || "",
      image_url: card.image_url || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.front.trim() || !form.back.trim()) return;

    try {
      if (editingCard) {
        await updateCard(editingCard.id, {
          front: form.front,
          back: form.back,
          example: form.example || null,
          transcription: form.transcription || null,
          gender: form.gender || null,
          image_url: form.image_url || null,
        });
      } else {
        await createCard({
          deck_id: deckId,
          front: form.front,
          back: form.back,
          example: form.example || null,
          transcription: form.transcription || null,
          gender: form.gender || null,
          image_url: form.image_url || null,
        });
      }
      setDialogOpen(false);
      loadCards();
    } catch (error) {
      console.error("Failed to save card:", error);
    }
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteCard(pendingDeleteId);
      loadCards();
    } catch (error) {
      console.error("Failed to delete card:", error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const filteredCards = cards.filter((card) => {
    if (!externalSearch.trim()) return true;
    const q = externalSearch.toLowerCase();
    return (
      card.front.toLowerCase().includes(q) ||
      card.back.toLowerCase().includes(q) ||
      (card.example && card.example.toLowerCase().includes(q))
    );
  });

  const sortedCards = [...filteredCards].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "az":
        return a.front.localeCompare(b.front);
      case "za":
        return b.front.localeCompare(a.front);
      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading cards...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sortedCards.length} card{sortedCards.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-auto h-8 text-xs"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "az", label: "A - Z" },
              { value: "za", label: "Z - A" },
            ]}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sortedCards.length === 0 ? (
          <Card className="py-12 text-center md:col-span-2">
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {externalSearch ? "No cards match your search" : "No cards yet. Add your first card!"}
              </p>
              {!externalSearch && (
                <Button onClick={openCreate} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Card
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedCards.map((card) => (
            <FlashCard
              key={card.id}
              card={card}
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onEdit={openEdit}
              onDelete={handleDelete}
              isNew={!reviewedIds.has(card.id)}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Eliminar carta"
        description="La carta se eliminará del deck. Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Edit Card" : "New Card"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Front *</label>
                {wrapButton(frontRef, "front")}
              </div>
              <Input
                ref={frontRef}
                value={form.front}
                onChange={(e) => setForm({ ...form, front: e.target.value })}
                placeholder="Word or phrase"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Back (Translation) *</label>
                {wrapButton(backRef, "back")}
              </div>
              <Input
                ref={backRef}
                value={form.back}
                onChange={(e) => setForm({ ...form, back: e.target.value })}
                placeholder="Translation"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Tip: envuelve términos en {"{llaves}"} para verlos como etiquetas, ej.{" "}
                {"{swim}, {swam}, {swum}"}. En el juego de escritura saldrá un campo por término.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Example</label>
                {wrapButton(exampleRef, "example")}
              </div>
              <Textarea
                ref={exampleRef}
                value={form.example}
                onChange={(e) => setForm({ ...form, example: e.target.value })}
                placeholder="Example sentence"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Transcription</label>
                <Input
                  value={form.transcription}
                  onChange={(e) => setForm({ ...form, transcription: e.target.value })}
                  placeholder="phonetic"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <Select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  options={[
                    { value: "", label: "None" },
                    { value: "m", label: "Masculine" },
                    { value: "f", label: "Feminine" },
                    { value: "n", label: "Neuter" },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Image</label>
              <div className="flex gap-2">
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="Paste image URL here"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const searchQuery = form.front || "flashcard image";
                    window.open(
                      `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`,
                      "_blank"
                    );
                  }}
                  title="Search image on Google"
                >
                  <Image className="h-4 w-4" />
                </Button>
              </div>
              {form.image_url ? (
                <div className="mt-2 relative inline-block">
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-20 rounded-lg object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <button
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center"
                    onClick={() => setForm({ ...form, image_url: "" })}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Click the icon to search on Google, then right-click an image → Copy image address
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.front.trim() || !form.back.trim()}>
              {editingCard ? "Save Changes" : "Create Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
