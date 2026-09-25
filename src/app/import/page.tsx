"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDecks } from "@/lib/queries/decks";
import { getFolders, createFolder } from "@/lib/queries/folders";
import { createDeck } from "@/lib/queries/decks";
import { createCards, getCards } from "@/lib/queries/cards";
import { LANGUAGES } from "@/lib/utils";
import {
  parseCardsCSV,
  parseBackupFile,
  cardsToCSV,
  buildBackupFile,
  downloadFile,
  safeFilename,
  todayStamp,
  splitFolderPath,
  joinFolderPath,
  folderPathOf,
  CSV_TEMPLATE,
  type BackupCard,
  type BackupFile,
  type ImportRow,
  type ImportMode,
  importCardsToDeck,
} from "@/lib/import-export";
import {
  ArrowLeft,
  Upload,
  Download,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  BookOpen,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import type { Deck, Folder } from "@/types";

type Tab = "import" | "export" | "docs";

const JSON_SAMPLE: BackupFile = {
  format: "zicards-backup",
  version: 1,
  exported_at: new Date().toISOString(),
  folders: [{ name: "Verbos", parent: "Idiomas" }, { name: "Idiomas", parent: null }],
  decks: [
    {
      name: "Verbos irregulares",
      source_language: "en",
      target_language: "es",
      description: "Common irregular verbs",
      is_public: false,
      folder: "Idiomas/Verbos",
      cards: [
        { front: "Go", back: "Ir", example: "Go home!" },
        { front: "Eat", back: "Comer" },
      ],
    },
  ],
};

function ImportExportPage() {
  const searchParams = useSearchParams();
  const preselectedDeck = searchParams.get("deck");

  const [tab, setTab] = useState<Tab>("import");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Export state
  const [exportScope, setExportScope] = useState<"deck" | "all">("deck");
  const [exportDeckId, setExportDeckId] = useState("");
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  // ---- Import state
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvCards, setCsvCards] = useState<ImportRow[] | null>(null);
  const [csvMode, setCsvMode] = useState<ImportMode>("upsert");
  const [backup, setBackup] = useState<BackupFile | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [csvTarget, setCsvTarget] = useState<"existing" | "new">("existing");
  const [csvDeckId, setCsvDeckId] = useState("");
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckSource, setNewDeckSource] = useState("en");
  const [newDeckTarget, setNewDeckTarget] = useState("es");
  const [newDeckFolder, setNewDeckFolder] = useState("");
  const [jsonBaseFolder, setJsonBaseFolder] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([
        getDecks(),
        getFolders().catch(() => [] as Folder[]),
      ]);
      setDecks(d);
      setFolders(f);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (preselectedDeck) {
      setExportDeckId(preselectedDeck);
      setCsvDeckId(preselectedDeck);
      setCsvTarget("existing");
    }
  }, [preselectedDeck]);

  const deckLabel = (d: Deck) => {
    const path = folderPathOf(folders, d.folder_id ?? null);
    return path ? `${d.name} (${path})` : d.name;
  };

  const folderOptions = [
    { value: "", label: "Raíz (sin carpeta)" },
    ...folders.map((f) => ({
      value: f.id,
      label: folderPathOf(folders, f.id) ?? f.name,
    })),
  ];

  // ------------------------------------------------------------- Export
  const handleExport = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      if (exportScope === "all") {
        const decksWithCards = [];
        for (const deck of decks) {
          const cards = await getCards(deck.id);
          decksWithCards.push({
            deck: {
              name: deck.name,
              source_language: deck.source_language,
              target_language: deck.target_language,
              description: deck.description,
              is_public: deck.is_public,
              folder_id: deck.folder_id ?? null,
            },
            cards: cards.map((c) => ({
              front: c.front,
              back: c.back,
              example: c.example,
              transcription: c.transcription,
              gender: c.gender,
              image_url: c.image_url,
            })),
          });
        }
        const backupFile = buildBackupFile(folders, decksWithCards);
        downloadFile(
          `zicards-backup-${todayStamp()}.json`,
          JSON.stringify(backupFile, null, 2),
          "application/json"
        );
        const totalCards = decksWithCards.reduce((n, d) => n + d.cards.length, 0);
        setExportMsg(
          `Backup descargado: ${decks.length} deck(s), ${folders.length} carpeta(s), ${totalCards} carta(s).`
        );
      } else {
        const deck = decks.find((d) => d.id === exportDeckId);
        if (!deck) throw new Error("Selecciona un deck");
        const cards = await getCards(deck.id);
        const base = safeFilename(deck.name);
        if (exportFormat === "csv") {
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
            "text/csv"
          );
        } else {
          const backupFile = buildBackupFile(folders, [
            {
              deck: {
                name: deck.name,
                source_language: deck.source_language,
                target_language: deck.target_language,
                description: deck.description,
                is_public: deck.is_public,
                folder_id: deck.folder_id ?? null,
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
          ]);
          downloadFile(
            `${base}-${todayStamp()}.json`,
            JSON.stringify(backupFile, null, 2),
            "application/json"
          );
        }
        setExportMsg(`Deck "${deck.name}" exportado (${cards.length} cartas).`);
      }
    } catch (error) {
      console.error("Export failed:", error);
      setExportMsg("No se pudo exportar. Inténtalo de nuevo.");
    } finally {
      setExporting(false);
    }
  };

  // ------------------------------------------------------------- Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFileName(selected.name);
    setCsvCards(null);
    setBackup(null);
    setParseErrors([]);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        if (/\.json$/i.test(selected.name)) {
          const parsed = parseBackupFile(text);
          const totalCards = parsed.decks.reduce((n, d) => n + d.cards.length, 0);
          if (parsed.decks.length === 0) {
            setParseErrors(["El JSON no contiene decks"]);
          } else {
            setBackup(parsed);
            if (totalCards === 0) {
              setParseErrors(["Aviso: los decks del JSON no traen cartas"]);
            }
          }
        } else {
          const { cards, errors } = parseCardsCSV(text);
          setParseErrors(errors);
          setCsvCards(cards);
        }
      } catch (err) {
        setParseErrors([err instanceof Error ? err.message : "No se pudo leer el archivo"]);
      }
    };
    reader.readAsText(selected);
  };

  const createCardsChunked = async (deckId: string, cards: BackupCard[]) => {
    const CHUNK = 200;
    for (let i = 0; i < cards.length; i += CHUNK) {
      await createCards(
        cards.slice(i, i + CHUNK).map((c) => ({
          deck_id: deckId,
          front: c.front,
          back: c.back,
          example: c.example || null,
          transcription: c.transcription || null,
          gender: c.gender || null,
          image_url: c.image_url || null,
        }))
      );
    }
  };

  /** Resolve (find or create) a folder path. Returns folder id or null for root. */
  const resolveFolderPath = async (
    fullPath: string | null,
    folderCache: Map<string, string>,
    createdCounter: { count: number },
    workingFolders: Folder[]
  ): Promise<string | null> => {
    if (!fullPath) return null;
    if (folderCache.has(fullPath)) return folderCache.get(fullPath)!;
    const segments = splitFolderPath(fullPath);
    let parentId: string | null = null;
    let currentPath = "";
    for (const seg of segments) {
      currentPath = currentPath ? joinFolderPath([currentPath, seg]) : seg;
      if (folderCache.has(currentPath)) {
        parentId = folderCache.get(currentPath)!;
        continue;
      }
      const existing = workingFolders.find(
        (f) => f.name === seg && (f.parent_id ?? null) === parentId
      );
      if (existing) {
        folderCache.set(currentPath, existing.id);
        parentId = existing.id;
      } else {
        const created = await createFolder(seg, parentId);
        workingFolders.push(created);
        folderCache.set(currentPath, created.id);
        parentId = created.id;
        createdCounter.count++;
      }
    }
    return parentId;
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      if (csvCards) {
        // ---- CSV
        if (csvCards.length === 0) throw new Error("No hay cartas para importar");
        if (csvTarget === "existing") {
          if (!csvDeckId) throw new Error("Selecciona un deck de destino");
          if (csvMode === "replace" && !confirm("Se eliminarán todas las cartas actuales del deck antes de importar. ¿Continuar?")) {
            return;
          }
          const result = await importCardsToDeck(csvDeckId, csvCards, csvMode);
          const deck = decks.find((d) => d.id === csvDeckId);
          const parts: string[] = [];
          if (result.created > 0) parts.push(`${result.created} creada(s)`);
          if (result.updated > 0) parts.push(`${result.updated} actualizada(s)`);
          if (result.skipped > 0) parts.push(`${result.skipped} sin cambios`);
          setImportResult(`Deck "${deck?.name ?? ""}": ${parts.join(", ") || "sin cambios"}.`);
        } else {
          if (!newDeckName.trim()) throw new Error("Escribe un nombre para el nuevo deck");
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Not authenticated");
          const created = await createDeck({
            user_id: user.id,
            name: newDeckName.trim(),
            source_language: newDeckSource,
            target_language: newDeckTarget,
            description: null,
            is_public: false,
            folder_id: newDeckFolder || null,
          });
          await createCardsChunked(created.id, csvCards);
          setImportResult(`Deck "${created.name}" creado con ${csvCards.length} carta(s).`);
        }
      } else if (backup) {
        // ---- JSON backup
        const folderCache = new Map<string, string>();
        const createdCounter = { count: 0 };
        const workingFolders = [...folders];
        const basePrefix = jsonBaseFolder
          ? folderPathOf(folders, jsonBaseFolder) ?? ""
          : "";

        // Register explicit folders first (parents before children)
        const byDepth = [...backup.folders].sort((a, b) => {
          const da = a.parent ? splitFolderPath(a.parent).length : 0;
          const db = b.parent ? splitFolderPath(b.parent).length : 0;
          return da - db;
        });
        for (const f of byDepth) {
          const full = basePrefix
            ? joinFolderPath([basePrefix, ...(f.parent ? [f.parent] : []), f.name])
            : f.parent
              ? joinFolderPath([f.parent, f.name])
              : f.name;
          await resolveFolderPath(full, folderCache, createdCounter, workingFolders);
        }

        let decksCreated = 0;
        let cardsCreated = 0;
        for (const bd of backup.decks) {
          const fullFolder: string | null = basePrefix
            ? bd.folder
              ? joinFolderPath([basePrefix, bd.folder])
              : basePrefix
            : (bd.folder ?? null);
          const folderId = await resolveFolderPath(fullFolder, folderCache, createdCounter, workingFolders);

          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Not authenticated");

          // Dedupe deck name inside target folder
          const siblings = decks.filter((d) => (d.folder_id ?? null) === folderId);
          let name = bd.name;
          let suffix = 2;
          const taken = new Set(siblings.map((d) => d.name.toLowerCase()));
          while (taken.has(name.toLowerCase())) {
            name = `${bd.name} (${suffix++})`;
          }
          taken.add(name.toLowerCase());

          const created = await createDeck({
            user_id: user.id,
            name,
            source_language: bd.source_language || "en",
            target_language: bd.target_language || "es",
            description: bd.description || null,
            is_public: bd.is_public === true,
            folder_id: folderId,
          });
          decks.push({ ...created, card_count: 0 } as Deck);
          if (bd.cards.length > 0) {
            await createCardsChunked(created.id, bd.cards);
          }
          decksCreated++;
          cardsCreated += bd.cards.length;
        }
        setImportResult(
          `Importado: ${createdCounter.count} carpeta(s) nueva(s), ${decksCreated} deck(s), ${cardsCreated} carta(s).`
        );
      }
      setFileName(null);
      setCsvCards(null);
      setBackup(null);
      await loadAll();
    } catch (error) {
      console.error("Import failed:", error);
      setImportResult(error instanceof Error ? error.message : "No se pudo importar.");
    } finally {
      setImporting(false);
    }
  };

  const canImport =
    (csvCards && csvCards.length > 0 && (csvTarget === "existing" ? !!csvDeckId : !!newDeckName.trim())) ||
    (backup && backup.decks.length > 0);

  const totalBackupCards = backup ? backup.decks.reduce((n, d) => n + d.cards.length, 0) : 0;

  const tabBtn = (t: Tab, label: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      tab === t ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
    }`;

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-2">Importar / Exportar</h1>
        <p className="text-muted-foreground mb-6">
          Lleva tus decks y carpetas en CSV o JSON, con previsualización antes de importar.
        </p>

        <div className="flex gap-2 mb-6">
          <button className={tabBtn("import", "Importar")} onClick={() => setTab("import")}>
            <span className="inline-flex items-center gap-1.5">
              <Upload className="h-4 w-4" /> Importar
            </span>
          </button>
          <button className={tabBtn("export", "Exportar")} onClick={() => setTab("export")}>
            <span className="inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Exportar
            </span>
          </button>
          <button className={tabBtn("docs", "Formatos")} onClick={() => setTab("docs")}>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> Formatos
            </span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {tab === "export" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Exportar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Alcance</label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        variant={exportScope === "deck" ? "default" : "outline"}
                        onClick={() => setExportScope("deck")}
                      >
                        Un deck
                      </Button>
                      <Button
                        variant={exportScope === "all" ? "default" : "outline"}
                        onClick={() => {
                          setExportScope("all");
                          setExportFormat("json");
                        }}
                      >
                        Todo (decks + carpetas)
                      </Button>
                    </div>
                  </div>

                  {exportScope === "deck" && (
                    <div>
                      <label className="text-sm font-medium">Deck</label>
                      <Select
                        value={exportDeckId}
                        onChange={(e) => setExportDeckId(e.target.value)}
                        placeholder="Selecciona un deck"
                        options={decks.map((d) => ({ value: d.id, label: deckLabel(d) }))}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Formato</label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        variant={exportFormat === "json" ? "default" : "outline"}
                        onClick={() => setExportFormat("json")}
                        className="gap-1"
                      >
                        <FileJson className="h-4 w-4" /> JSON
                      </Button>
                      <Button
                        variant={exportFormat === "csv" ? "default" : "outline"}
                        onClick={() => setExportFormat("csv")}
                        disabled={exportScope === "all"}
                        className="gap-1"
                        title={exportScope === "all" ? "CSV solo disponible para un deck" : ""}
                      >
                        <FileSpreadsheet className="h-4 w-4" /> CSV
                      </Button>
                    </div>
                    {exportScope === "all" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        El backup completo (con carpetas) solo está disponible en JSON.
                      </p>
                    )}
                  </div>

                  {exportMsg && <p className="text-sm text-muted-foreground">{exportMsg}</p>}

                  <Button
                    onClick={handleExport}
                    disabled={exporting || (exportScope === "deck" && !exportDeckId)}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    {exporting ? "Exportando..." : "Descargar"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {tab === "import" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Importar archivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input type="file" accept=".csv,.tsv,.txt,.json" onChange={handleFileChange} />
                  {fileName && <p className="text-xs text-muted-foreground">Archivo: {fileName}</p>}

                  {parseErrors.length > 0 && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                      {parseErrors.map((err, i) => (
                        <p key={i} className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {err}
                        </p>
                      ))}
                    </div>
                  )}

                  {csvCards && csvCards.length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium">
                          {csvCards.length} carta(s) detectadas en el CSV
                        </p>
                        <div className="max-h-32 overflow-y-auto mt-1 space-y-1">
                          {csvCards.slice(0, 8).map((c, i) => (
                            <p key={i} className="text-xs text-muted-foreground">
                              {c.front} → {c.back}
                            </p>
                          ))}
                          {csvCards.length > 8 && (
                            <p className="text-xs text-muted-foreground">...y {csvCards.length - 8} más</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Destino</label>
                        <div className="flex gap-2 mt-1 mb-3">
                          <Button
                            variant={csvTarget === "existing" ? "default" : "outline"}
                            onClick={() => setCsvTarget("existing")}
                          >
                            Deck existente
                          </Button>
                          <Button
                            variant={csvTarget === "new" ? "default" : "outline"}
                            onClick={() => setCsvTarget("new")}
                          >
                            Deck nuevo
                          </Button>
                        </div>
                        {csvTarget === "existing" ? (
                          <div className="space-y-3">
                            <Select
                              value={csvDeckId}
                              onChange={(e) => setCsvDeckId(e.target.value)}
                              placeholder="Selecciona un deck"
                              options={decks.map((d) => ({ value: d.id, label: deckLabel(d) }))}
                            />
                            <div>
                              <label className="text-sm font-medium">Cómo importar</label>
                              <Select
                                value={csvMode}
                                onChange={(e) => setCsvMode(e.target.value as ImportMode)}
                                options={[
                                  { value: "upsert", label: "Actualizar existentes y agregar nuevas" },
                                  { value: "add", label: "Solo agregar nuevas (omitir repetidas)" },
                                  { value: "replace", label: "Reemplazar todo el deck" },
                                ]}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Detecta repetidas por columna <code className="bg-muted px-1 rounded">id</code> o
                                por texto de <code className="bg-muted px-1 rounded">front</code>.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Input
                              value={newDeckName}
                              onChange={(e) => setNewDeckName(e.target.value)}
                              placeholder="Nombre del nuevo deck"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-medium">Desde</label>
                                <Select
                                  value={newDeckSource}
                                  onChange={(e) => setNewDeckSource(e.target.value)}
                                  options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Hacia</label>
                                <Select
                                  value={newDeckTarget}
                                  onChange={(e) => setNewDeckTarget(e.target.value)}
                                  options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Carpeta</label>
                              <Select
                                value={newDeckFolder}
                                onChange={(e) => setNewDeckFolder(e.target.value)}
                                options={folderOptions}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {backup && (
                    <div className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium mb-1">
                          Backup: {backup.decks.length} deck(s), {totalBackupCards} carta(s)
                          {backup.folders.length > 0 && `, ${backup.folders.length} carpeta(s)`}
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {backup.decks.map((d, i) => (
                            <div key={i} className="text-xs text-muted-foreground">
                              <p className="font-medium text-foreground">
                                {d.name}
                                {d.folder && <span className="font-normal"> → {d.folder}</span>}
                              </p>
                              <p>
                                {d.cards.length} carta(s) · {d.source_language} → {d.target_language}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Importar todo dentro de</label>
                        <Select
                          value={jsonBaseFolder}
                          onChange={(e) => setJsonBaseFolder(e.target.value)}
                          options={folderOptions}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Opcional: anida toda la estructura importada bajo una carpeta existente.
                        </p>
                      </div>
                    </div>
                  )}

                  {importResult && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        {importResult}
                      </p>
                    </div>
                  )}

                  <Button onClick={handleImport} disabled={!canImport || importing} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {importing ? "Importando..." : "Importar"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {tab === "docs" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      Formato CSV
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Ideal para editar en Excel o Google Sheets. Una fila por carta.
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>
                        Requeridas: <code className="bg-muted px-1 rounded">front</code>,{" "}
                        <code className="bg-muted px-1 rounded">back</code>
                      </li>
                      <li>
                        Opcionales: <code className="bg-muted px-1 rounded">example</code>,{" "}
                        <code className="bg-muted px-1 rounded">transcription</code>,{" "}
                        <code className="bg-muted px-1 rounded">gender</code>,{" "}
                        <code className="bg-muted px-1 rounded">image_url</code>
                      </li>
                      <li>
                        Opcional <code className="bg-muted px-1 rounded">id</code>: lo incluye el
                        export. Al reimportar, esa fila actualiza la carta exacta aunque hayas
                        cambiado su <code className="bg-muted px-1 rounded">front</code>.
                      </li>
                      <li>Si un texto lleva comas o saltos de línea, enciérralo entre comillas.</li>
                      <li>Se acepta coma (,) o punto y coma (;) como separador (Excel en español usa ;).</li>
                      <li>
                        Modos al importar a un deck existente: actualizar existentes y agregar nuevas,
                        solo agregar nuevas, o reemplazar todo el deck.
                      </li>
                    </ul>
                    <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">
                      {`front,back,example,transcription,gender,image_url\nHola,Hello,"Hello, how are you?",,,\nGracias,Thank you,,,,,`}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => downloadFile("plantilla.csv", CSV_TEMPLATE, "text/csv")}
                    >
                      <FileDown className="h-4 w-4" />
                      Descargar plantilla CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileJson className="h-5 w-5" />
                      Formato JSON (backup completo)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Guarda decks, cartas y la estructura de carpetas. Es lo que genera el botón
                      Exportar, y lo que debes usar para respaldos o para compartir varios decks.
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>
                        Las carpetas se referencian por <strong>ruta</strong>:{" "}
                        <code className="bg-muted px-1 rounded">Idiomas/Verbos</code> significa la
                        subcarpeta Verbos dentro de Idiomas. <code className="bg-muted px-1 rounded">null</code> = raíz.
                      </li>
                      <li>Las carpetas que no existan se crean solas (sin duplicar las que ya existen).</li>
                      <li>Si un deck con el mismo nombre ya existe en esa carpeta, se crea como “Nombre (2)”.</li>
                      <li>El progreso de estudio (reviews) no se exporta: los decks importados empiezan en 0%.</li>
                    </ul>
                    <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">
                      {JSON.stringify(JSON_SAMPLE, null, 2)}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() =>
                        downloadFile("plantilla.json", JSON.stringify(JSON_SAMPLE, null, 2), "application/json")
                      }
                    >
                      <FileDown className="h-4 w-4" />
                      Descargar plantilla JSON
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Términos con {"{llaves}"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Envuelve palabras en {"{llaves}"} en cualquier campo (front, back, example) y
                      se mostrarán como etiquetas al estudiar. Funciona igual en CSV y JSON porque
                      es texto plano. Ejemplo para verbos irregulares:
                    </p>
                    <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">
                      {`front,back\nNadar,"{swim}, {swam}, {swum}"`}
                    </pre>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>En el juego de escritura aparece un campo por cada término.</li>
                      <li>
                        La voz (TTS) lee los términos sin llaves. Si necesitas llaves literales
                        (p. ej. estudiando código), escríbelas como{" "}
                        <code className="bg-muted px-1 rounded">{"\\{"}</code> y{" "}
                        <code className="bg-muted px-1 rounded">{"\\}"}</code>.
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cómo importar paso a paso</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                      <strong>1.</strong> Ve a la pestaña Importar y elige tu archivo (.csv o .json).
                    </p>
                    <p>
                      <strong>2.</strong> Revisa la previsualización (cartas, decks y carpetas detectadas).
                    </p>
                    <p>
                      <strong>3.</strong> Elige el destino: para CSV, un deck existente o uno nuevo (con
                      idiomas y carpeta); para JSON, opcionalmente una carpeta base donde anidar todo.
                    </p>
                    <p>
                      <strong>4.</strong> Si importas CSV a un deck existente, elige el modo (actualizar,
                      solo agregar o reemplazar). Las filas se detectan por <code className="bg-muted px-1 rounded">id</code> o
                      por texto de <code className="bg-muted px-1 rounded">front</code>: edita el CSV y reimpórtalo
                      para actualizar sin duplicar.
                      <strong>5.</strong> Pulsa Importar y verás el resumen (creadas, actualizadas, sin cambios).
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
    </AuthGuard>
  );
}

export default function ImportPage() {
  return (
    <Suspense>
      <ImportExportPage />
    </Suspense>
  );
}
