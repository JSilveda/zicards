"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { speak, getLanguageVoiceCode } from "@/lib/tts";
import { Volume2, Edit, Trash2, RotateCcw, MoreHorizontal } from "lucide-react";
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="w-full">
      <div
        className="relative cursor-pointer"
        onClick={() => setFlipped(!flipped)}
        style={{ perspective: "1000px" }}
      >
        <div
          className="transition-transform duration-500 relative"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <Card
            className="w-full min-h-[180px] flex flex-col items-center justify-center p-5 backface-hidden shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-shadow"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardContent className="text-center p-0 w-full">
              {showActions && (
                <div className="absolute top-2 right-2" ref={menuRef}>
                  <button
                    className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(!showMenu);
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-card border rounded-xl shadow-lg z-20 overflow-hidden">
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlipped(false);
                          setShowMenu(false);
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </button>
                      {onEdit && (
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onEdit(card);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onDelete(card.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mb-2">Tap to flip</p>
              <h2 className="text-2xl font-bold mb-2">{card.front}</h2>
              {card.transcription && (
                <p className="text-xs text-muted-foreground mb-1">
                  /{card.transcription}/
                </p>
              )}
              {card.gender && (
                <Badge variant="secondary" className="mb-2 text-xs">
                  {card.gender}
                </Badge>
              )}
              {card.image_url && (
                <img
                  src={card.image_url}
                  alt={card.front}
                  className="mx-auto mt-2 max-h-20 rounded-lg object-cover"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(card.front, getLanguageVoiceCode(sourceLanguage));
                }}
              >
                <Volume2 className="h-3 w-3 mr-1" />
                Listen
              </Button>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className="w-full min-h-[180px] flex flex-col items-center justify-center p-5 backface-hidden absolute top-0 left-0 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-shadow"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <CardContent className="text-center p-0 w-full">
              <p className="text-xs text-muted-foreground mb-2">Tap to flip back</p>
              <h2 className="text-2xl font-bold mb-2">{card.back}</h2>
              {card.example && (
                <p className="text-xs text-muted-foreground italic mb-2 max-w-xs">
                  &quot;{card.example}&quot;
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(card.back, getLanguageVoiceCode(targetLanguage));
                }}
              >
                <Volume2 className="h-3 w-3 mr-1" />
                Listen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
