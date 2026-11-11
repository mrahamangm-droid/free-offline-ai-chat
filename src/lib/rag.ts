export interface Chunk {
  index: number;
  text: string;
}

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;

export function chunkText(text: string): Chunk[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    const slice = clean.slice(start, end).trim();
    if (slice) chunks.push({ index: index++, text: slice });
    if (end >= clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
  "to", "of", "in", "on", "for", "with", "as", "this", "that", "it", "at",
  "by", "from", "which", "what", "how", "why", "do", "does", "can", "you",
  "i", "we", "they", "he", "she", "will", "would", "could", "should",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Simple lexical overlap scoring (no embedding model required). */
export function retrieveRelevantChunks(
  query: string,
  documents: { id: string; filename: string; chunks: Chunk[] }[],
  topK = 4
): { filename: string; text: string; score: number }[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];
  const scored: { filename: string; text: string; score: number }[] = [];

  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      const chunkTerms = tokenize(chunk.text);
      if (chunkTerms.length === 0) continue;
      const freq = new Map<string, number>();
      for (const t of chunkTerms) freq.set(t, (freq.get(t) ?? 0) + 1);
      let score = 0;
      for (const qt of queryTerms) {
        if (freq.has(qt)) score += freq.get(qt)!;
      }
      if (score > 0) {
        scored.push({ filename: doc.filename, text: chunk.text, score: score / Math.sqrt(chunkTerms.length) });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function buildRagContext(
  matches: { filename: string; text: string }[]
): string {
  if (matches.length === 0) return "";
  const blocks = matches
    .map((m, i) => `[Source ${i + 1}: ${m.filename}]\n${m.text}`)
    .join("\n\n");
  return `Use the following excerpts from the user's local documents if relevant. Cite sources as [Source N] when you use them. If they don't contain the answer, say so.\n\n${blocks}`;
}
