const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;

export function limitFactLength(text: string, maxSentences = 2): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  const sentences = normalized
    .split(SENTENCE_BOUNDARY)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (!sentences.length) {
    return normalized;
  }

  return sentences.slice(0, maxSentences).join(' ').trim();
}