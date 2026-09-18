"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLanguageName } from "@/lib/utils";
import { BookOpen, Edit, Trash2, Play } from "lucide-react";
import type { Deck } from "@/types";

interface DeckCardProps {
  deck: Deck;
  onDelete?: (id: string) => void;
}

export function DeckCard({ deck, onDelete }: DeckCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-1">{deck.name}</CardTitle>
          <Badge variant="secondary" className="ml-2 shrink-0">
            {deck.card_count || 0} cards
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {getLanguageName(deck.source_language)}
          </Badge>
          <span>→</span>
          <Badge variant="outline" className="text-xs">
            {getLanguageName(deck.target_language)}
          </Badge>
        </div>
      </CardHeader>
      {deck.description && (
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {deck.description}
          </p>
        </CardContent>
      )}
      <CardFooter className="flex gap-2 pt-0">
        <Link href={`/decks/${deck.id}/study`} className="flex-1">
          <Button size="sm" className="w-full gap-1">
            <Play className="h-3.5 w-3.5" />
            Study
          </Button>
        </Link>
        <Link href={`/decks/${deck.id}`}>
          <Button size="sm" variant="outline" className="gap-1">
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </Link>
        {onDelete && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-destructive hover:text-destructive"
            onClick={() => onDelete(deck.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
