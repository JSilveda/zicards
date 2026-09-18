"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check, Loader2 } from "lucide-react";

interface ImageResult {
  id: number;
  url: string;
  preview: string;
  alt: string;
  photographer: string;
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

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setImages([]);

    try {
      const res = await fetch(`/api/search-images?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to search images");
        return;
      }

      setImages(data.images || []);
      if (data.images?.length === 0) {
        setError("No images found. Try a different search.");
      }
    } catch {
      setError("Failed to search images. Check your connection.");
    } finally {
      setLoading(false);
    }
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
          <DialogTitle>Search Images</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for an image (e.g. apple, cat, house...)"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            autoFocus
          />
          <Button onClick={handleSearch} disabled={loading} className="gap-2 shrink-0">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4">
          {error && (
            <p className="text-sm text-muted-foreground text-center py-8">{error}</p>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => handleSelect(image)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                    selectedId === image.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-primary/50"
                  }`}
                >
                  <img
                    src={image.preview}
                    alt={image.alt}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Check className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && images.length === 0 && !error && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Search for an image to add to your card
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
