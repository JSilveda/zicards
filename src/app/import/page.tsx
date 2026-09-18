"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });
import { ImportExport } from "@/components/import-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";

export default function ImportPage() {
  const [deckId, setDeckId] = useState("");

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-8">Import / Export</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Select Deck
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a deck ID to import or export cards. You can find the deck ID in the URL when viewing a deck.
            </p>
            <div className="flex gap-2">
              <Input
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                placeholder="Enter deck ID..."
              />
              <Link href={deckId ? `/decks/${deckId}` : "#"}>
                <Button disabled={!deckId}>Go to Deck</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>Supported CSV format:</strong>
          </p>
          <p>
            Required columns: <code className="bg-muted px-1 rounded">front</code>, <code className="bg-muted px-1 rounded">back</code>
          </p>
          <p>
            Optional columns: <code className="bg-muted px-1 rounded">example</code>, <code className="bg-muted px-1 rounded">transcription</code>, <code className="bg-muted px-1 rounded">gender</code>, <code className="bg-muted px-1 rounded">image_url</code>
          </p>
        </div>
      </main>
    </AuthGuard>
  );
}
