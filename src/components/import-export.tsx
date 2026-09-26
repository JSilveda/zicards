"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCards } from "@/lib/queries/cards";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  parseCardsCSV,
  parseBackupFile,
  cardsToCSV,
  downloadFile,
  safeFilename,
  todayStamp,
  importCardsToDeck,
  readUploadedText,
  type ImportRow,
  type ImportMode,
} from "@/lib/import-export";
import { Upload, FileSpreadsheet, FileJson, AlertCircle, CheckCircle, Download } from "lucide-react";

interface ImportExportProps {
  deckId: string;
  deckName?: string;
  onImportComplete?: () => void;
}

export function ImportExport({ deckId, deckName, onImportComplete }: ImportExportProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCards, setParsedCards] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>("upsert");
  const [encoding, setEncoding] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFileName(selected.name);
    setParsedCards([]);
    setErrors([]);
    setSuccess(null);
    setEncoding(null);

    try {
      const { text, encoding } = await readUploadedText(selected);
      setEncoding(encoding);
      if (/\.json$/i.test(selected.name)) {
        const backup = parseBackupFile(text);
        const cards = backup.decks.flatMap((d) => d.cards);
        if (cards.length === 0) {
          setErrors(["El JSON no contiene cartas"]);
        } else {
          setParsedCards(cards);
        }
      } else {
        const { cards, errors } = parseCardsCSV(text);
        setErrors(errors);
        setParsedCards(cards);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "No se pudo leer el archivo"]);
    }
  };

  const [showReplaceModal, setShowReplaceModal] = useState(false);

  const handleImport = () => {
    if (parsedCards.length === 0) return;
    if (mode === "replace") {
      setShowReplaceModal(true);
      return;
    }
    doImport();
  };

  const doImport = async () => {
    if (parsedCards.length === 0) return;

    setImporting(true);
    try {
      const result = await importCardsToDeck(deckId, parsedCards, mode);
      const parts: string[] = [];
      if (result.created > 0) parts.push(`${result.created} creada(s)`);
      if (result.updated > 0) parts.push(`${result.updated} actualizada(s)`);
      if (result.skipped > 0) parts.push(`${result.skipped} sin cambios`);
      setSuccess(`Importación lista: ${parts.join(", ") || "sin cambios"}.`);
      setParsedCards([]);
      setFileName(null);
      onImportComplete?.();
    } catch (error) {
      console.error("Failed to import cards:", error);
      setErrors(["No se pudieron importar las cartas. Inténtalo de nuevo."]);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const cards = await getCards(deckId);
      const base = safeFilename(deckName || `deck-${deckId.slice(0, 8)}`);
      if (format === "csv") {
        downloadFile(
          `${base}-${todayStamp()}.csv`,
          cardsToCSV(
            cards.map((c) => ({
              id: c.id,
              front: c.front,
              back: c.back,
              example: c.example || undefined,
              transcription: c.transcription || undefined,
              gender: c.gender || undefined,
              image_url: c.image_url || undefined,
            })),
            true
          ),
          "text/csv",
          true
        );
      } else {
        const { buildBackupFile } = await import("@/lib/import-export");
        const backup = buildBackupFile(
          [],
          [
            {
              deck: {
                name: deckName || base,
                source_language: "en",
                target_language: "es",
                description: null,
                is_public: false,
                folder_id: null,
              },
              cards: cards.map((c) => ({
                front: c.front,
                back: c.back,
                example: c.example,
                transcription: c.transcription,
                gender: c.gender,
                image_url: c.image_url,
              })),
            },
          ]
        );
        downloadFile(`${base}-${todayStamp()}.json`, JSON.stringify(backup, null, 2), "application/json");
      }
    } catch (error) {
      console.error("Failed to export:", error);
      setErrors(["No se pudo exportar. Inténtalo de nuevo."]);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={showReplaceModal}
        onOpenChange={setShowReplaceModal}
        title="Reemplazar deck"
        description="Se eliminarán todas las cartas actuales del deck antes de importar. Esta acción no se puede deshacer."
        confirmLabel="Reemplazar"
        onConfirm={doImport}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar cartas (CSV o JSON)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-1">
              CSV: columnas requeridas <code className="bg-muted px-1 rounded">front</code>,{" "}
              <code className="bg-muted px-1 rounded">back</code>; opcionales{" "}
              <code className="bg-muted px-1 rounded">example</code>,{" "}
              <code className="bg-muted px-1 rounded">transcription</code>,{" "}
              <code className="bg-muted px-1 rounded">gender</code>,{" "}
              <code className="bg-muted px-1 rounded">image_url</code>
            </p>
            <p>JSON: archivo de backup de ZiCards (se importan sus cartas a este deck).</p>
            <p>
              Tip: usa {"{término}"} para mostrar etiquetas, ej. {"{swim}, {swam}, {swum}"}.
            </p>
          </div>

          <Input type="file" accept=".csv,.tsv,.txt,.json" onChange={handleFileChange} />
          {fileName && (
            <p className="text-xs text-muted-foreground">
              Archivo: {fileName}
              {encoding && ` · Detectado: ${encoding}`}
            </p>
          )}

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
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
                {parsedCards.length} cartas listas para importar
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {parsedCards.slice(0, 10).map((card, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {card.front} → {card.back}
                  </p>
                ))}
                {parsedCards.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    ...y {parsedCards.length - 10} más
                  </p>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {success}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Cómo importar</label>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as ImportMode)}
              options={[
                { value: "upsert", label: "Actualizar existentes y agregar nuevas" },
                { value: "add", label: "Solo agregar nuevas (omitir repetidas)" },
                { value: "replace", label: "Reemplazar todo el deck" },
              ]}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Detecta repetidas por columna <code className="bg-muted px-1 rounded">id</code> o por
              texto de <code className="bg-muted px-1 rounded">front</code>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleImport}
              disabled={parsedCards.length === 0 || importing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? "Importando..." : "Importar cartas"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar este deck
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={exporting}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("json")}
              disabled={exporting}
              className="gap-2"
            >
              <FileJson className="h-4 w-4" />
              Exportar JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
