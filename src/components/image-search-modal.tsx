"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Check, Loader2, Sparkles, ImageIcon } from "lucide-react";

interface ImageResult {
  id: number;
  url: string;
  preview: string;
  alt: string;
  loaded?: boolean;
}

interface ImageSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  initialQuery?: string;
}

export function ImageSearchModal({ open, onClose, onSelect, initialQuery = "" }: ImageSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const generateOneImage = async (searchQuery: string, seed: number): Promise<ImageResult | null> => {
    try {
      const apiUrl = `/api/search-images?q=${encodeURIComponent(searchQuery)}&seed=${seed}`;
      const res = await fetch(apiUrl);

      if (!res.ok) return null;

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      return {
        id: seed,
        url: objectUrl,
        preview: objectUrl,
        alt: searchQuery,
        loaded: true,
      };
    } catch {
      return null;
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setImages([]);

    const seeds = Array.from({ length: 4 }, () => Math.floor(Math.random() * 100000));

    for (let i = 0; i < seeds.length; i++) {
      setGeneratingId(seeds[i]);
      const result = await generateOneImage(query, seeds[i]);
      if (result) {
        setImages((prev) => [...prev, result]);
      }
      setGeneratingId(null);
    }

    setLoading(false);
    setGeneratingId(null);
  };

  const handleRegenerate = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");

    const seeds = Array.from({ length: 4 }, () => Math.floor(Math.random() * 100000));

    for (let i = 0; i < seeds.length; i++) {
      setGeneratingId(seeds[i]);
      const result = await generateOneImage(query, seeds[i]);
      if (result) {
        setImages((prev) => [...prev, result]);
      }
      setGeneratingId(null);
    }

    setLoading(false);
    setGeneratingId(null);
  };

  const handleSelect = (image: ImageResult) => {
    setSelectedId(image.id);
    onSelect(image.url);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Image Generator
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe the image (e.g. red apple, happy cat...)"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            autoFocus
          />
          <Button onClick={handleSearch} disabled={loading} className="gap-2 shrink-0">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Generating..." : "Generate"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4">
          {error && (
            <p className="text-sm text-muted-foreground text-center py-8">{error}</p>
          )}

          {images.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {images.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleSelect(image)}
                    className={`relative group rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                      selectedId === image.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={image.preview}
                      alt={image.alt}
                      className="w-full aspect-square object-cover bg-white"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Check className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </button>
                ))}

                {generatingId && (
                  <div className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Generating...</p>
                  </div>
                )}
              </div>

              {!loading && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Generate More
                  </Button>
                </div>
              )}
            </>
          )}

          {!loading && images.length === 0 && !error && (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Type a word and click Generate to create AI images
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Images are generated with clean white backgrounds, perfect for flashcards
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
