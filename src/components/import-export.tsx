"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createCards } from "@/lib/queries/cards";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";

interface ImportExportProps {
  deckId: string;
  onImportComplete?: () => void;
}

interface ParsedCard {
  front: string;
  back: string;
  example?: string;
  transcription?: string;
  gender?: string;
  image_url?: string;
}

export function ImportExport({ deckId, onImportComplete }: ImportExportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const parseCSV = useCallback((text: string): ParsedCard[] => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      setErrors(["File must have a header row and at least one data row"]);
      return [];
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const requiredCols = ["front", "back"];
    const missingCols = requiredCols.filter((c) => !header.includes(c));

    if (missingCols.length > 0) {
      setErrors([`Missing required columns: ${missingCols.join(", ")}`]);
      return [];
    }

    const cards: ParsedCard[] = [];
    const newErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length < 2 || (!values[0] && !values[1])) continue;

      const card: ParsedCard = {
        front: values[header.indexOf("front")] || "",
        back: values[header.indexOf("back")] || "",
      };

      const exampleIdx = header.indexOf("example");
      if (exampleIdx >= 0 && values[exampleIdx]) {
        card.example = values[exampleIdx];
      }

      const transcriptionIdx = header.indexOf("transcription");
      if (transcriptionIdx >= 0 && values[transcriptionIdx]) {
        card.transcription = values[transcriptionIdx];
      }

      const genderIdx = header.indexOf("gender");
      if (genderIdx >= 0 && values[genderIdx]) {
        card.gender = values[genderIdx];
      }

      const imageUrlIdx = header.indexOf("image_url");
      if (imageUrlIdx >= 0 && values[imageUrlIdx]) {
        card.image_url = values[imageUrlIdx];
      }

      if (card.front && card.back) {
        cards.push(card);
      } else {
        newErrors.push(`Row ${i + 1}: Missing front or back value`);
      }
    }

    setErrors(newErrors);
    return cards;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setParsedCards([]);
    setErrors([]);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedCards(parsed);
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (parsedCards.length === 0) return;

    setImporting(true);
    try {
      await createCards(
        parsedCards.map((card) => ({
          deck_id: deckId,
          ...card,
          example: card.example || null,
          transcription: card.transcription || null,
          gender: card.gender || null,
          image_url: card.image_url || null,
        }))
      );
      setSuccess(true);
      setParsedCards([]);
      setFile(null);
      onImportComplete?.();
    } catch (error) {
      setErrors(["Failed to import cards. Please try again."]);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = ["front", "back", "example", "transcription", "gender", "image_url"];
    const csvContent = [headers.join(",")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `deck-export-${deckId}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Cards from CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Required columns: <code className="bg-muted px-1 rounded">front</code>, <code className="bg-muted px-1 rounded">back</code></p>
            <p>Optional columns: <code className="bg-muted px-1 rounded">example</code>, <code className="bg-muted px-1 rounded">transcription</code>, <code className="bg-muted px-1 rounded">gender</code>, <code className="bg-muted px-1 rounded">image_url</code></p>
          </div>

          <Input
            type="file"
            accept=".csv,.tsv"
            onChange={handleFileChange}
          />

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {errors.map((error, i) => (
                <p key={i} className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              ))}
            </div>
          )}

          {parsedCards.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">
                {parsedCards.length} cards ready to import
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {parsedCards.slice(0, 10).map((card, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {card.front} → {card.back}
                  </p>
                ))}
                {parsedCards.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    ...and {parsedCards.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Cards imported successfully!
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={parsedCards.length === 0 || importing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? "Importing..." : "Import Cards"}
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
