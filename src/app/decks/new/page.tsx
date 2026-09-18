"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDeck } from "@/lib/queries/decks";
import { LANGUAGES } from "@/lib/utils";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewDeckPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    source_language: "en",
    target_language: "es",
    description: "",
    is_public: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Deck name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await createDeck({
        user_id: user.id,
        name: form.name,
        source_language: form.source_language,
        target_language: form.target_language,
        description: form.description || null,
        is_public: form.is_public,
      });

      router.push("/decks");
    } catch (err) {
      setError("Failed to create deck. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/decks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Decks
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Create New Deck</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Deck Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., English-Spanish Travel Words"
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
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is_public" className="text-sm">
                  Make this deck public
                </label>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <Save className="h-4 w-4" />
                {loading ? "Creating..." : "Create Deck"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </AuthGuard>
  );
}
