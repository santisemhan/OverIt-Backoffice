/*
 * Article bodies are stored by the API as one markdown-ish string (`Resource.content`). The editor works with blocks
 * and converts both ways:
 *   ## Subtítulo · - **Inicio en negrita** texto · > Cita · párrafos separados por una línea en blanco
 * Anything the parser does not recognise stays as a paragraph, so no text is ever lost.
 */

export type BlockType = "p" | "h2" | "li" | "quote";
export interface Block {
  t: BlockType;
  text: string;
  /** Bold start of a highlighted point ("li"). */
  lead?: string;
}

export const BLOCK_TYPES: { id: BlockType; label: string }[] = [
  { id: "p", label: "Párrafo" },
  { id: "h2", label: "Subtítulo" },
  { id: "li", label: "Punto destacado" },
  { id: "quote", label: "Cita" },
];

export function parseBody(content: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: "p", text: para.join("\n") });
    if (quote.length) blocks.push({ t: "quote", text: quote.join("\n") });
    para = [];
    quote = [];
  };
  for (const raw of content.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    const li = /^\s*[-*•]\s+(.*)$/.exec(line);
    const q = /^>\s?(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ t: "h2", text: h[1] });
    } else if (li) {
      flush();
      const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(li[1]);
      blocks.push(m ? { t: "li", lead: m[1], text: m[2] } : { t: "li", lead: "", text: li[1] });
    } else if (q) {
      if (para.length) flush();
      quote.push(q[1]);
    } else {
      if (quote.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks.length ? blocks : [{ t: "p", text: "" }];
}

export function serializeBody(blocks: Block[]): string {
  return blocks
    .filter((b) => b.text.trim() || b.lead?.trim())
    .map((b) => {
      const text = b.text.trim();
      if (b.t === "h2") return `## ${text.replace(/\n+/g, " ")}`;
      if (b.t === "li") {
        const lead = b.lead?.trim();
        return `- ${lead ? `**${lead}** ` : ""}${text.replace(/\n+/g, " ")}`.trimEnd();
      }
      if (b.t === "quote")
        return text
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n");
      return text;
    })
    .join("\n\n");
}

/** Rough reading time (≈200 words per minute), at least 1 minute. */
export const readingMinutes = (content: string) =>
  Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 200));
