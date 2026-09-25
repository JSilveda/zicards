// Shared import/export logic: robust CSV parsing, ZiCards JSON backup format,
// folder-path helpers and file download.

export interface BackupCard {
  front: string;
  back: string;
  example?: string;
  transcription?: string;
  gender?: string;
  image_url?: string;
}

export interface BackupFolder {
  name: string;
  /** Parent folder path like "Idiomas/Verbos". Null = root. */
  parent: string | null;
}

export interface BackupDeck {
  name: string;
  source_language: string;
  target_language: string;
  description?: string | null;
  is_public?: boolean;
  /** Folder path like "Idiomas/Verbos". Null = root. */
  folder?: string | null;
  cards: BackupCard[];
}

export interface BackupFile {
  format: "zicards-backup";
  version: 1;
  exported_at: string;
  folders: BackupFolder[];
  decks: BackupDeck[];
}

// ---------------------------------------------------------------- CSV parsing

function detectDelimiter(headerLine: string): "," | ";" {
  const hasComma = headerLine.includes(",");
  const hasSemi = headerLine.includes(";");
  // Spanish-locale Excel uses ";" — prefer it only when "," is absent.
  if (hasSemi && !hasComma) return ";";
  return ",";
}

/** RFC-4180 style parser: quotes, escaped quotes (""), CRLF and newlines inside quotes. */
export function parseCSVRows(text: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    // Skip fully empty rows
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        pushField();
      } else if (ch === "\r") {
        // ignore, \n handles the break
      } else if (ch === "\n") {
        pushRow();
      } else {
        field += ch;
      }
    }
  }
  pushRow();
  return rows;
}

/** A CSV row: card fields plus optional `id` for round-trip updates. */
export interface ImportRow extends BackupCard {
  id?: string;
}

export interface ParsedCardsCSV {
  cards: ImportRow[];
  errors: string[];
  delimiter: "," | ";";
}

const CARD_FIELDS = ["front", "back", "example", "transcription", "gender", "image_url"] as const;

export function parseCardsCSV(text: string): ParsedCardsCSV {
  const errors: string[] = [];
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCSVRows(text, delimiter);

  if (rows.length < 2) {
    return { cards: [], errors: ["El archivo necesita una fila de encabezado y al menos una fila de datos"], delimiter };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = ["front", "back"].filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return { cards: [], errors: [`Faltan columnas requeridas: ${missing.join(", ")}`], delimiter };
  }

  const idx: Record<string, number> = {};
  for (const f of CARD_FIELDS) idx[f] = header.indexOf(f);
  const idIdx = header.indexOf("id");

  const cards: ImportRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const get = (f: (typeof CARD_FIELDS)[number]) =>
      idx[f] >= 0 ? (values[idx[f]] ?? "").trim() : "";
    const front = get("front");
    const back = get("back");
    if (!front || !back) {
      errors.push(`Fila ${i + 1}: falta front o back, se omite`);
      continue;
    }
    const card: ImportRow = { front, back };
    const id = idIdx >= 0 ? (values[idIdx] ?? "").trim() : "";
    if (id) card.id = id;
    for (const f of ["example", "transcription", "gender", "image_url"] as const) {
      const v = get(f);
      if (v) card[f] = v;
    }
    cards.push(card);
  }

  return { cards, errors, delimiter };
}

function escapeCSVField(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes(";") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function cardsToCSV(cards: (BackupCard & { id?: string })[], includeId = false): string {
  const lines = [
    includeId
      ? "id,front,back,example,transcription,gender,image_url"
      : "front,back,example,transcription,gender,image_url",
  ];
  for (const c of cards) {
    const fields = [
      escapeCSVField(c.front),
      escapeCSVField(c.back),
      escapeCSVField(c.example ?? ""),
      escapeCSVField(c.transcription ?? ""),
      escapeCSVField(c.gender ?? ""),
      escapeCSVField(c.image_url ?? ""),
    ];
    if (includeId) fields.unshift(escapeCSVField(c.id ?? ""));
    lines.push(fields.join(","));
  }
  return lines.join("\n");
}

export const CSV_TEMPLATE = "front,back,example,transcription,gender,image_url\nHola,Hello,\"Hello, how are you?\",,,\nGracias,Thank you,,,,,\n";

// ------------------------------------------------------- Folder path helpers
// Paths look like "Idiomas/Verbos/Irregulares". A literal "/" or "\" inside a
// name is escaped with a backslash: "A\/B" means a single folder named "A/B".

export function splitFolderPath(path: string): string[] {
  const segments: string[] = [];
  let current = "";
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === "\\" && i + 1 < path.length && (path[i + 1] === "/" || path[i + 1] === "\\")) {
      current += path[i + 1];
      i++;
    } else if (ch === "/") {
      segments.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  segments.push(current);
  return segments.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function joinFolderPath(segments: string[]): string {
  return segments
    .map((s) => s.replace(/\\/g, "\\\\").replace(/\//g, "\\/"))
    .join("/");
}

interface FolderLike {
  id: string;
  name: string;
  parent_id: string | null;
}

/** Full path ("A/B/C") of a folder id, or null when root/missing. */
export function folderPathOf(folders: FolderLike[], folderId: string | null): string | null {
  if (!folderId) return null;
  const byId = new Map(folders.map((f) => [f.id, f]));
  const segments: string[] = [];
  const seen = new Set<string>();
  let cur = byId.get(folderId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    segments.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  if (segments.length === 0) return null;
  return joinFolderPath(segments);
}

// ------------------------------------------------------------- Backup format

interface DeckLike {
  name: string;
  source_language: string;
  target_language: string;
  description: string | null;
  is_public: boolean;
  folder_id: string | null;
}

interface CardLike {
  front: string;
  back: string;
  example: string | null;
  transcription: string | null;
  gender: string | null;
  image_url: string | null;
}

export function buildBackupFile(
  folders: FolderLike[],
  decksWithCards: { deck: DeckLike; cards: CardLike[] }[]
): BackupFile {
  // Parents before children so import can create them in order.
  const depthOf = (f: FolderLike, seen = new Set<string>()): number => {
    if (!f.parent_id || seen.has(f.id)) return 0;
    seen.add(f.id);
    const parent = folders.find((x) => x.id === f.parent_id);
    return parent ? 1 + depthOf(parent, seen) : 0;
  };
  const orderedFolders = [...folders].sort((a, b) => depthOf(a) - depthOf(b));

  return {
    format: "zicards-backup",
    version: 1,
    exported_at: new Date().toISOString(),
    folders: orderedFolders.map((f) => ({
      name: f.name,
      parent: f.parent_id ? folderPathOf(folders, f.parent_id) : null,
    })),
    decks: decksWithCards.map(({ deck, cards }) => ({
      name: deck.name,
      source_language: deck.source_language,
      target_language: deck.target_language,
      description: deck.description,
      is_public: deck.is_public,
      folder: folderPathOf(folders, deck.folder_id),
      cards: cards.map((c) => ({
        front: c.front,
        back: c.back,
        ...(c.example ? { example: c.example } : {}),
        ...(c.transcription ? { transcription: c.transcription } : {}),
        ...(c.gender ? { gender: c.gender } : {}),
        ...(c.image_url ? { image_url: c.image_url } : {}),
      })),
    })),
  };
}

export function parseBackupFile(jsonText: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error("El archivo no es un JSON válido");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.format !== "zicards-backup" || !Array.isArray(obj.decks)) {
    throw new Error("No es un backup de ZiCards válido (falta format/decks)");
  }
  const folders = Array.isArray(obj.folders) ? obj.folders : [];
  const decks = (obj.decks as Record<string, unknown>[]).map((d, i) => {
    if (typeof d.name !== "string" || !d.name.trim()) {
      throw new Error(`Deck #${i + 1} sin nombre válido`);
    }
    const cards = Array.isArray(d.cards) ? d.cards : [];
    const cleanCards: BackupCard[] = [];
    for (const c of cards as Record<string, unknown>[]) {
      if (typeof c.front === "string" && c.front.trim() && typeof c.back === "string" && c.back.trim()) {
        cleanCards.push({
          front: String(c.front).trim(),
          back: String(c.back).trim(),
          ...(typeof c.example === "string" && c.example.trim() ? { example: c.example.trim() } : {}),
          ...(typeof c.transcription === "string" && c.transcription.trim() ? { transcription: c.transcription.trim() } : {}),
          ...(typeof c.gender === "string" && c.gender.trim() ? { gender: c.gender.trim() } : {}),
          ...(typeof c.image_url === "string" && c.image_url.trim() ? { image_url: c.image_url.trim() } : {}),
        });
      }
    }
    return {
      name: d.name.trim(),
      source_language: typeof d.source_language === "string" ? d.source_language : "en",
      target_language: typeof d.target_language === "string" ? d.target_language : "es",
      description: typeof d.description === "string" ? d.description : null,
      is_public: d.is_public === true,
      folder: typeof d.folder === "string" && d.folder.trim() ? d.folder.trim() : null,
      cards: cleanCards,
    };
  });
  const cleanFolders: BackupFolder[] = (folders as Record<string, unknown>[])
    .filter((f) => typeof f.name === "string" && f.name.trim())
    .map((f) => ({
      name: (f.name as string).trim(),
      parent: typeof f.parent === "string" && (f.parent as string).trim() ? (f.parent as string).trim() : null,
    }));
  return {
    format: "zicards-backup",
    version: 1,
    exported_at: typeof obj.exported_at === "string" ? obj.exported_at : new Date().toISOString(),
    folders: cleanFolders,
    decks,
  };
}

// ------------------------------------------------------------------ Download

/**
 * Read an uploaded text file with encoding detection. Files saved on Windows
 * (e.g. Excel in Spanish locale) are often Windows-1252, not UTF-8 — reading
 * those as UTF-8 turns ñ/accents into �. Strict UTF-8 is tried first and
 * Windows-1252 is used as fallback. A leading BOM is stripped.
 */
export async function readUploadedText(file: File): Promise<{ text: string; encoding: string }> {
  const buf = await file.arrayBuffer();
  try {
    const strict = new TextDecoder("utf-8", { fatal: true });
    return { text: strict.decode(buf).replace(/^\uFEFF/, ""), encoding: "UTF-8" };
  } catch {
    const latin1 = new TextDecoder("windows-1252");
    return { text: latin1.decode(buf).replace(/^\uFEFF/, ""), encoding: "Windows-1252 (Latin-1)" };
  }
}

export function downloadFile(filename: string, content: string, mime: string, addBom = false) {
  // BOM helps Excel on Windows open UTF-8 CSVs with correct accents.
  // Never add it to JSON (strict parsers reject a leading BOM).
  const blob = new Blob([addBom ? "\uFEFF" + content : content], { type: `${mime};charset=utf-8;` });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1000);
}

export type ImportMode = "add" | "upsert" | "replace";

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
}

const normText = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * Import rows into a deck with duplicate detection:
 * - match by `id` column first (exact, survives front-text edits),
 * - then by `front` text (case-insensitive).
 * Modes: "add" (only new), "upsert" (update existing + add new),
 * "replace" (delete deck cards first, then add all).
 */
export async function importCardsToDeck(
  deckId: string,
  rows: ImportRow[],
  mode: ImportMode
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0 };
  if (rows.length === 0) return result;

  const { getCards, createCards, updateCard, clearDeckCards } = await import(
    "@/lib/queries/cards"
  );

  if (mode === "replace") {
    await clearDeckCards(deckId);
  }

  const existing = mode === "replace" ? [] : await getCards(deckId);
  const byId = new Map(existing.map((c) => [c.id, c]));
  const byFront = new Map(existing.map((c) => [normText(c.front), c]));

  const toCreate: ImportRow[] = [];
  const toUpdate: { id: string; patch: Record<string, string | null> }[] = [];

  for (const row of rows) {
    const match = (row.id && byId.get(row.id)) || byFront.get(normText(row.front));
    if (!match) {
      toCreate.push(row);
      continue;
    }
    if (mode === "add") {
      result.skipped++;
      continue;
    }
    const patch = {
      front: row.front.trim(),
      back: row.back.trim(),
      example: row.example?.trim() || null,
      transcription: row.transcription?.trim() || null,
      gender: row.gender?.trim() || null,
      image_url: row.image_url?.trim() || null,
    };
    const changed =
      normText(match.front) !== normText(patch.front) ||
      normText(match.back) !== normText(patch.back) ||
      normText(match.example) !== normText(patch.example) ||
      normText(match.transcription) !== normText(patch.transcription) ||
      normText(match.gender) !== normText(patch.gender) ||
      normText(match.image_url) !== normText(patch.image_url);
    if (changed) {
      toUpdate.push({ id: match.id, patch });
    } else {
      result.skipped++;
    }
  }

  const CHUNK = 200;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    await createCards(
      toCreate.slice(i, i + CHUNK).map((c) => ({
        deck_id: deckId,
        front: c.front.trim(),
        back: c.back.trim(),
        example: c.example?.trim() || null,
        transcription: c.transcription?.trim() || null,
        gender: c.gender?.trim() || null,
        image_url: c.image_url?.trim() || null,
      }))
    );
    result.created += Math.min(CHUNK, toCreate.length - i);
  }

  const UPDATE_CHUNK = 25;
  for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK) {
    await Promise.all(
      toUpdate.slice(i, i + UPDATE_CHUNK).map((u) => updateCard(u.id, u.patch))
    );
    result.updated += Math.min(UPDATE_CHUNK, toUpdate.length - i);
  }

  return result;
}

export function safeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "deck"
  );
}

export function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
