"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FlashCard } from "@/components/flash-card";
import { getCards, createCard, updateCard, deleteCard } from "@/lib/queries/cards";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { Card as CardType } from "@/types";

interface CardManagerProps {
  deckId: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export function CardManager({
  deckId,
  sourceLanguage,
  targetLanguage,
}: CardManagerProps) {
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [form, setForm] = useState({
    front: "",
    back: "",
    example: "",
    transcription: "",
    gender: "",
    image_url: "",
  });

  const loadCards = useCallback(async () => {
    try {
      const data = await getCards(deckId);
      setCards(data);
    } catch (error) {
      console.error("Failed to load cards:", error);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return;
    try {
      await deleteCard(id);
      loadCards();
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading cards...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cards ({cards.length})</h3>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Card
        </Button>
      </div>

      {cards.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-muted-foreground mb-4">No cards yet. Add your first card!</p>
            <Button onClick={openCreate} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <FlashCard
              key={card.id}
              card={card}
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Edit Card" : "New Card"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Front *</label>
              <Input
                value={form.front}
                onChange={(e) => setForm({ ...form, front: e.target.value })}
                placeholder="Word or phrase"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Back (Translation) *</label>
              <Input
                value={form.back}
                onChange={(e) => setForm({ ...form, back: e.target.value })}
                placeholder="Translation"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Example</label>
              <Textarea
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
              <label className="text-sm font-medium">Image URL</label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
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
