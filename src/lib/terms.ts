// Universal "term" syntax: {término}
// - Renders as a chip/tag wherever card text is shown.
// - TypeIt detects terms on the answer side and shows one input per term.
// - Rules: {…} with non-empty single-line content is a term. An unmatched "{"
//   is literal text. "\{" and "\}" escape to literal braces (e.g. for code).
// - Deliberately avoids markdown ([...], *, _, ~, `, ==) and Anki {{...}}
//   so it stays free for the future notes module.

export interface TextSegment {
  type: "text" | "term";
  /** Raw term content (trimmed) or plain text (escapes resolved). */
  value: string;
}

export function parseSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let buffer = "";
  const pushText = () => {
    if (buffer) {
      segments.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    // Escapes: \{ \} \\
    if (ch === "\\" && i + 1 < text.length && (text[i + 1] === "{" || text[i + 1] === "}" || text[i + 1] === "\\")) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    if (ch === "{") {
      // Look ahead for a closing "}" on the same line with no nested "{".
      let j = i + 1;
      let valid = true;
      while (j < text.length && text[j] !== "}") {
        if (text[j] === "{" || text[j] === "\n" || text[j] === "\r") {
          valid = false;
          break;
        }
        j++;
      }
      if (valid && j < text.length) {
        const content = text.slice(i + 1, j).trim();
        if (content) {
          pushText();
          segments.push({ type: "term", value: content });
          i = j + 1;
          continue;
        }
      }
      // Not a term: literal "{"
      buffer += ch;
      i++;
      continue;
    }

    buffer += ch;
    i++;
  }
  pushText();
  return segments;
}

/** All term contents in order of appearance. */
export function extractTerms(text: string): string[] {
  return parseSegments(text)
    .filter((s) => s.type === "term")
    .map((s) => s.value);
}

export function hasTerms(text: string): boolean {
  return parseSegments(text).some((s) => s.type === "term");
}

/** Plain text: terms unwrapped, escapes resolved. For TTS, alt text, search. */
export function toPlainText(text: string): string {
  return parseSegments(text)
    .map((s) => s.value)
    .join("");
}
