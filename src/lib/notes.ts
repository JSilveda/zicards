// Helpers for the notes module. Kept dependency-free (no BlockNote imports)
// so they work with the raw JSONB document shape.

function inlineToText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((node: unknown) => {
      if (!node || typeof node !== "object") return "";
      const n = node as { type?: string; text?: string; content?: unknown };
      if (n.type === "text") return typeof n.text === "string" ? n.text : "";
      if (n.type === "link") return inlineToText(n.content);
      return "";
    })
    .join("");
}

/** Flatten a BlockNote document into plain text, one line per block. */
export function blocksToPlainText(document: unknown): string {
  const lines: string[] = [];
  const walk = (blocks: unknown) => {
    if (!Array.isArray(blocks)) return;
    for (const b of blocks) {
      if (!b || typeof b !== "object") continue;
      const block = b as { content?: unknown; children?: unknown };
      const text = inlineToText(block.content).trim();
      if (text) lines.push(text);
      walk(block.children);
    }
  };
  walk(document);
  return lines.join("\n");
}

const SPANISH_WORDS =
  /\b(que|de|la|el|los|las|una|para|con|como|este|esta|pero|porque|hola|gracias|estoy|tengo|hace|desde|hasta|también|muy|más|este|ese|esto|eso)\b/g;

/** Tiny heuristic so read-aloud picks a matching voice (defaults to en-US). */
export function detectSpokenLang(text: string): string {
  const sample = text.slice(0, 2000).toLowerCase();
  const marks = (sample.match(/[áéíóúñ¿¡]/g) || []).length;
  const words = (sample.match(SPANISH_WORDS) || []).length;
  if (marks >= 3 || words >= 5) return "es-ES";
  return "en-US";
}
