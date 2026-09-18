"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import { Volume2, Edit, Trash2, RotateCcw } from "lucide-react";
import type { Card as FlashCardType } from "@/types";

interface FlashCardProps {
  card: FlashCardType;
  sourceLanguage?: string;
  targetLanguage?: string;
  onEdit?: (card: FlashCardType) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export function FlashCard({
  card,
  sourceLanguage = "en",
  targetLanguage = "es",
  onEdit,
  onDelete,
  showActions = true,
}: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className="relative cursor-pointer perspective-1000"
        onClick={() => setFlipped(!flipped)}
        style={{ perspective: "1000px" }}
      >
        <div
          className="transition-transform duration-500 transform-style-preserve-3d relative"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <Card
            className="w-full min-h-[280px] flex flex-col items-center justify-center p-8 backface-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardContent className="text-center p-0">
              <p className="text-sm text-muted-foreground mb-4">
                Tap to flip
              </p>
              <h2 className="text-3xl font-bold mb-3">{card.front}</h2>
              {card.transcription && (
                <p className="text-sm text-muted-foreground mb-2">
                  /{card.transcription}/
                </p>
              )}
              {card.gender && (
                <Badge variant="secondary" className="mb-4">
                  {card.gender}
                </Badge>
              )}
              {card.image_url && (
                <img
                  src={card.image_url}
                  alt={card.front}
                  className="mx-auto mt-4 max-h-32 rounded-lg object-cover"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(card.front, getLanguageVoiceCode(sourceLanguage));
                }}
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Listen
              </Button>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className="w-full min-h-[280px] flex flex-col items-center justify-center p-8 backface-hidden absolute top-0 left-0"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <CardContent className="text-center p-0">
              <p className="text-sm text-muted-foreground mb-4">
                Tap to flip back
              </p>
              <h2 className="text-3xl font-bold mb-3">{card.back}</h2>
              {card.example && (
                <p className="text-sm text-muted-foreground italic mb-4 max-w-xs">
                  &quot;{card.example}&quot;
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(card.back, getLanguageVoiceCode(targetLanguage));
                }}
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Listen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showActions && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFlipped(false)}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(card)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => onDelete(card.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
