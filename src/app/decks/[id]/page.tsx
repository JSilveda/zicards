"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { CardManager } from "@/components/card-manager";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });
import { ImportExport } from "@/components/import-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDeck, updateDeck, deleteDeck } from "@/lib/queries/decks";
import { LANGUAGES, getLanguageName } from "@/lib/utils";
import { ArrowLeft, Play, Save, Trash2 } from "lucide-react";
import type { Deck } from "@/types";

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    source_language: "en",
    target_language: "es",
    is_public: false,
  });

  const loadDeck = useCallback(async () => {
    try {
      const data = await getDeck(deckId);
      if (!data) {
        router.push("/decks");
        return;
      }
      setDeck(data);
      setForm({
        name: data.name,
        description: data.description || "",
        source_language: data.source_language,
        target_language: data.target_language,
        is_public: data.is_public,
      });
    } catch (error) {
      console.error("Failed to load deck:", error);
    } finally {
      setLoading(false);
    }
  }, [deckId, router]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDeck(deckId, form);
      loadDeck();
    } catch (error) {
      console.error("Failed to save deck:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this deck and all its cards? This cannot be undone.")) return;
    try {
      await deleteDeck(deckId);
      router.push("/decks");
    } catch (error) {
      console.error("Failed to delete deck:", error);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </AuthGuard>
    );
  }

  if (!deck) return null;

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/decks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Decks
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{deck.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">
                {getLanguageName(deck.source_language)} → {getLanguageName(deck.target_language)}
              </Badge>
              {deck.is_public && <Badge variant="secondary">Public</Badge>}
            </div>
          </div>
          <Link href={`/decks/${deckId}/study`}>
            <Button className="gap-2">
              <Play className="h-4 w-4" />
              Study Now
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="cards">
          <TabsList>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="import">Import/Export</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-6">
            <CardManager
              deckId={deckId}
              sourceLanguage={deck.source_language}
              targetLanguage={deck.target_language}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Deck Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">From Language</label>
                    <Select
                      value={form.source_language}
                      onChange={(e) => setForm({ ...form, source_language: e.target.value })}
                      options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To Language</label>
                    <Select
                      value={form.target_language}
                      onChange={(e) => setForm({ ...form, target_language: e.target.value })}
                      options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_public}
                    onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm">Make this deck public</label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Deck
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <ImportExport deckId={deckId} onImportComplete={loadDeck} />
          </TabsContent>
        </Tabs>
      </main>
    </AuthGuard>
  );
}
