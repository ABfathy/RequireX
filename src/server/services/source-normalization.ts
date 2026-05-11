import type { SourceChunkKind } from "../../../generated/prisma/client";

const MAX_CHUNK_CHARS = 1_800;

export type NormalizedTextChunkInput = {
  kind: SourceChunkKind;
  orderIndex: number;
  text: string;
  locator: {
    kind: "text-range";
    paragraphStart: number;
    paragraphEnd: number;
  };
  chunkLabel: string;
};

function splitParagraphs(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitLongParagraph(paragraph: string) {
  if (paragraph.length <= MAX_CHUNK_CHARS) {
    return [paragraph];
  }

  const chunks: string[] = [];
  let remaining = paragraph;

  while (remaining.length > MAX_CHUNK_CHARS) {
    const slice = remaining.slice(0, MAX_CHUNK_CHARS);
    const splitAt = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(" "));
    const end = splitAt > 400 ? splitAt + 1 : MAX_CHUNK_CHARS;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

export function normalizeTextToChunks(
  text: string,
): NormalizedTextChunkInput[] {
  const paragraphs = splitParagraphs(text);
  const chunks: NormalizedTextChunkInput[] = [];
  let currentText = "";
  let paragraphStart = 0;

  function flush(paragraphEnd: number) {
    if (!currentText.trim()) {
      return;
    }

    const orderIndex = chunks.length;
    chunks.push({
      kind: "TEXT_BLOCK",
      orderIndex,
      text: currentText.trim(),
      locator: {
        kind: "text-range",
        paragraphStart,
        paragraphEnd,
      },
      chunkLabel: `Text ${orderIndex + 1}`,
    });
    currentText = "";
  }

  paragraphs.forEach((paragraph, index) => {
    const paragraphParts = splitLongParagraph(paragraph);

    paragraphParts.forEach((part) => {
      if (!currentText) {
        paragraphStart = index;
      }

      const nextText = currentText ? `${currentText}\n\n${part}` : part;
      if (nextText.length > MAX_CHUNK_CHARS && currentText) {
        flush(index - 1);
        paragraphStart = index;
        currentText = part;
      } else {
        currentText = nextText;
      }
    });
  });

  flush(Math.max(paragraphStart, paragraphs.length - 1));

  return chunks;
}
