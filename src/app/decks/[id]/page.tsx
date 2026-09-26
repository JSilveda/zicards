"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { CardManager } from "@/components/card-manager";
import { ImportExport } from "@/components/import-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getDeck, updateDeck, deleteDeck } from "@/lib/queries/decks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LANGUAGES, getLanguageName } from "@/lib/utils";
import { GamesModal } from "@/components/games/games-modal";
import {
  ArrowLeft,
  Play,
  Save,
  Trash2,
  MoreHorizontal,
  Search,
  Plus,
  BookOpen,
  Headphones,
  Gamepad2,
  Settings,
  Upload,
  RotateCcw,
} from "lucide-react";
import type { Deck } from "@/types";

const AuthGuard = dynamic(
  () => import("@/components/auth-guard").then((m) => m.AuthGuard),
  { ssr: false }
);

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
  const menuRef = useRef<HTMLDivElement>(null);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"cards" | "settings" | "import">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDeck(deckId, form);
      loadDeck();
      setActiveTab("cards");
    } catch (error) {
      console.error("Failed to save deck:", error);
    } finally {
      setSaving(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = () => {
    setShowMenu(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteDeck(deckId);
      router.push("/decks");
    } catch (error) {
      console.error("Failed to delete deck:", error);
    }
  };

  const handleResetProgress = async () => {
    setShowResetModal(false);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cards } = await supabase
        .from("cards")
        .select("id")
        .eq("deck_id", deckId);

      if (cards && cards.length > 0) {
        const cardIds = cards.map((c: { id: string }) => c.id);
        await supabase
          .from("reviews")
          .delete()
          .in("card_id", cardIds)
          .eq("user_id", user.id);
      }

      loadDeck();
    } catch (error) {
      console.error("Failed to reset progress:", error);
    }
  };

  const progress = deck?.progress_percent || 0;
  const totalCards = deck?.card_count || 0;
  const dueCount = deck?.due_count || 0;
  const newCount = totalCards - (deck?.learned_count || 0);

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
      <main className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Row 1: Back arrow + 3-dot menu */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/decks")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Decks
          </button>

          <div className="relative" ref={menuRef}>
            <button
              className="p-2 rounded-full hover:bg-muted transition-colors"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border rounded-xl shadow-lg z-30 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setShowMenu(false);
                    setActiveTab("settings");
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setShowMenu(false);
                    setActiveTab("import");
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Import / Export
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setShowMenu(false);
                    setShowResetModal(true);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Progress
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Deck
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Deck name + search/add/play */}
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold truncate">{deck.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {getLanguageName(deck.source_language)} → {getLanguageName(deck.target_language)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-3">
            {activeTab === "cards" && (
              <>
                {/* Search */}
                {showSearch ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search cards..."
                      className="h-9 w-40 text-sm"
                      autoFocus
                    />
                    <button
                      className="p-2 rounded-full hover:bg-muted transition-colors"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery("");
                      }}
                    >
                      <span className="text-xs text-muted-foreground">✕</span>
                    </button>
                  </div>
                ) : (
                  <button
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}

                {/* Add card */}
                <button
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  onClick={() => {
                    document.dispatchEvent(new CustomEvent("open-create-card"));
                  }}
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </button>
              </>
            )}

            {/* Play button with progress ring */}
            <button
              className="relative w-10 h-10 flex items-center justify-center"
              onClick={() => setShowPlayModal(true)}
            >
              <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-muted/50"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray={`${(progress / 100) * 106.8} 106.8`}
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
              <Play className="h-4 w-4 text-primary ml-0.5 relative z-10" fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "cards" && (
          <CardManager
            deckId={deckId}
            sourceLanguage={deck.source_language}
            targetLanguage={deck.target_language}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === "settings" && (
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
                <Button variant="outline" onClick={() => setActiveTab("cards")}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "import" && (
          <ImportExport deckId={deckId} onImportComplete={loadDeck} />
        )}

        {/* Play Modal */}
        {showPlayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowPlayModal(false)}
            />
            <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
              <button
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
                onClick={() => setShowPlayModal(false)}
              >
                ✕
              </button>
              <div className="divide-y">
                <button
                  className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    setShowPlayModal(false);
                    router.push(`/decks/${deckId}/study?mode=learn`);
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <Play className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Learn</p>
                    <p className="text-sm text-muted-foreground">
                      {newCount} new words
                    </p>
                  </div>
                </button>
                <button
                  className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    setShowPlayModal(false);
                    router.push(`/decks/${deckId}/study?mode=review`);
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Review words</p>
                    <p className="text-sm text-muted-foreground">
                      {dueCount > 0 ? `${dueCount} words to review` : "All caught up!"}
                    </p>
                  </div>
                </button>
                <button
                  className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    setShowPlayModal(false);
                    setShowGamesModal(true);
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <Gamepad2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">One game</p>
                    <p className="text-sm text-muted-foreground">
                      {newCount} new words
                    </p>
                  </div>
                </button>
                <button
                  className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    setShowPlayModal(false);
                    router.push(`/decks/${deckId}/study?mode=autoplay`);
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    <Headphones className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Autoplay</p>
                    <p className="text-sm text-muted-foreground">Listen to all words</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Games Modal */}
        <GamesModal
          open={showGamesModal}
          onClose={() => setShowGamesModal(false)}
          onSelect={(game) => {
            setShowGamesModal(false);
            router.push(`/decks/${deckId}/study?mode=game&game=${game}`);
          }}
        />

        <ConfirmDialog
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          title="Eliminar deck"
          description="Se eliminará el deck con todas sus cartas. Esta acción no se puede deshacer."
          onConfirm={confirmDelete}
        />

        {/* Reset Progress Modal */}
        <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Reset Progress</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              All review history for this deck will be deleted. This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleResetProgress}>
                Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AuthGuard>
  );
}
