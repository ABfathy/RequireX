import { prisma } from "@/lib/prisma";
import { transcribeAudioToEnglish } from "@/server/services/google-genai";
import { extractTextFromPdfBytes } from "@/server/services/pdf-text";

import type {
  Prisma,
  SourceAsset,
  SourceChunkKind,
  SourceType,
} from "../../../generated/prisma/client";

const MAX_CHUNK_CHARS = 1_800;
export const PDF_TEXT_PARSER_VERSION = "built-in-pdf-text-v2";

type FileSourceType = Extract<SourceType, "PDF" | "AUDIO">;

type ProcessSourceInput = {
  assetId: string;
  sessionId: string;
  requestedBy?: string;
};

export type SourceProcessingResult = {
  assetId: string;
  sourceType: FileSourceType;
  status: "processed" | "skipped" | "failed";
  textChars?: number;
  chunkCount?: number;
  errorMessage?: string;
};

function logSourceProcessing(
  level: "info" | "warn" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  const payload = {
    scope: "source-processing",
    message,
    ...details,
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

function asMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function errorMessageFromUnknown(error: unknown) {
  return error instanceof Error ? error.message : "Source processing failed.";
}

function sourceUrl(asset: Pick<SourceAsset, "appUrl" | "ufsUrl">) {
  return asset.appUrl ?? asset.ufsUrl;
}

async function downloadAssetBytes(
  asset: Pick<SourceAsset, "id" | "appUrl" | "ufsUrl">,
) {
  const url = sourceUrl(asset);
  if (!url) {
    throw new Error("Source asset does not have a downloadable file URL.");
  }

  const parsed = new URL(url);
  const trusted =
    parsed.hostname === "utfs.io" || parsed.hostname.endsWith(".ufs.sh");
  if (!trusted) {
    throw new Error(`Untrusted asset URL host: ${parsed.hostname}`);
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`Failed to download source asset (${response.status}).`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 100 * 1024 * 1024) {
    throw new Error("Source file exceeds the 100 MB size limit.");
  }

  return Buffer.from(await response.arrayBuffer());
}

function splitLongText(text: string) {
  const chunks: string[] = [];
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n|\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    let remaining = paragraph;
    while (remaining.length > MAX_CHUNK_CHARS) {
      const slice = remaining.slice(0, MAX_CHUNK_CHARS);
      const splitAt = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(" "));
      const end = splitAt > 400 ? splitAt + 1 : MAX_CHUNK_CHARS;
      chunks.push(remaining.slice(0, end).trim());
      remaining = remaining.slice(end).trim();
    }
    if (remaining) chunks.push(remaining);
  }

  return chunks;
}

export function normalizeSourceTextToChunks(input: {
  sourceType: SourceType;
  text: string;
}) {
  const kindBySourceType: Record<"PDF" | "AUDIO", SourceChunkKind> = {
    PDF: "PDF_BLOCK",
    AUDIO: "TRANSCRIPT_SEGMENT",
  };
  const labelBySourceType = {
    PDF: "PDF",
    AUDIO: "Transcript",
  } as const;

  if (input.sourceType !== "PDF" && input.sourceType !== "AUDIO") return [];
  const sourceType = input.sourceType;

  return splitLongText(input.text).map((text, orderIndex) => ({
    kind: kindBySourceType[sourceType],
    orderIndex,
    text,
    locator: {
      kind: sourceType === "PDF" ? "pdf-text" : "transcript",
      chunkIndex: orderIndex,
    },
    chunkLabel: `${labelBySourceType[sourceType]} ${orderIndex + 1}`,
  }));
}

async function replaceAssetChunks(input: {
  assetId: string;
  sourceType: FileSourceType;
  text: string;
}) {
  const chunks = normalizeSourceTextToChunks(input);
  if (chunks.length === 0) {
    throw new Error("Source asset had no usable text to chunk.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.sourceChunk.deleteMany({
      where: { sourceAssetId: input.assetId },
    });
    await tx.sourceChunk.createMany({
      data: chunks.map((chunk) => ({
        sourceAssetId: input.assetId,
        kind: chunk.kind,
        orderIndex: chunk.orderIndex,
        text: chunk.text,
        locator: chunk.locator as Prisma.InputJsonValue,
        chunkLabel: chunk.chunkLabel,
      })),
    });
  });

  return chunks.length;
}

async function markSourceFailed(
  asset: Pick<SourceAsset, "id" | "sourceType">,
  error: unknown,
): Promise<SourceProcessingResult> {
  const errorMessage = errorMessageFromUnknown(error);
  await prisma.sourceAsset.update({
    where: { id: asset.id },
    data: {
      status: "FAILED",
      errorMessage,
    },
  });

  logSourceProcessing("error", "Source processing failed.", {
    assetId: asset.id,
    sourceType: asset.sourceType,
    errorMessage,
  });

  return {
    assetId: asset.id,
    sourceType: asset.sourceType as FileSourceType,
    status: "failed",
    errorMessage,
  };
}

async function loadFileAsset(
  input: ProcessSourceInput,
  sourceType: FileSourceType,
) {
  const asset = await prisma.sourceAsset.findFirst({
    where: {
      id: input.assetId,
      sessionId: input.sessionId,
      sourceType,
    },
    include: {
      chunks: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!asset) {
    throw new Error(`${sourceType} source asset was not found.`);
  }

  return asset;
}

export async function processPdfAsset(
  input: ProcessSourceInput,
): Promise<SourceProcessingResult> {
  const asset = await loadFileAsset(input, "PDF");
  const providerMetadata = asMetadataObject(asset.providerMetadata);

  if (
    asset.status === "PROCESSED" &&
    asset.textContent?.trim() &&
    asset.chunks.length > 0 &&
    providerMetadata.parser === PDF_TEXT_PARSER_VERSION
  ) {
    return {
      assetId: asset.id,
      sourceType: "PDF",
      status: "skipped",
      textChars: asset.textContent.length,
      chunkCount: asset.chunks.length,
    };
  }

  await prisma.sourceAsset.update({
    where: { id: asset.id },
    data: { status: "PROCESSING", errorMessage: null },
  });

  try {
    const bytes = await downloadAssetBytes(asset);
    const text = extractTextFromPdfBytes(bytes);
    if (!text) {
      throw new Error("PDF did not contain extractable text.");
    }

    const chunkCount = await replaceAssetChunks({
      assetId: asset.id,
      sourceType: "PDF",
      text,
    });

    await prisma.sourceAsset.update({
      where: { id: asset.id },
      data: {
        status: "PROCESSED",
        textContent: text,
        processedAt: new Date(),
        errorMessage: null,
        providerMetadata: {
          ...providerMetadata,
          parser: PDF_TEXT_PARSER_VERSION,
          processedBy: input.requestedBy ?? "system",
        } as Prisma.InputJsonValue,
      },
    });

    return {
      assetId: asset.id,
      sourceType: "PDF",
      status: "processed",
      textChars: text.length,
      chunkCount,
    };
  } catch (error) {
    return markSourceFailed(asset, error);
  }
}

export async function processAudioAsset(
  input: ProcessSourceInput,
): Promise<SourceProcessingResult> {
  const asset = await loadFileAsset(input, "AUDIO");

  if (
    asset.status === "PROCESSED" &&
    asset.textContent?.trim() &&
    asset.chunks.length > 0
  ) {
    return {
      assetId: asset.id,
      sourceType: "AUDIO",
      status: "skipped",
      textChars: asset.textContent.length,
      chunkCount: asset.chunks.length,
    };
  }

  await prisma.sourceAsset.update({
    where: { id: asset.id },
    data: { status: "PROCESSING", errorMessage: null },
  });

  try {
    const bytes = await downloadAssetBytes(asset);
    const result = await transcribeAudioToEnglish({
      audioBase64: bytes.toString("base64"),
      mimeType: asset.mimeType ?? "audio/mpeg",
    });
    const text = result.englishTranscript.trim();
    if (!text) {
      throw new Error("Voice note transcription returned no English text.");
    }

    const chunkCount = await replaceAssetChunks({
      assetId: asset.id,
      sourceType: "AUDIO",
      text,
    });

    await prisma.sourceAsset.update({
      where: { id: asset.id },
      data: {
        status: "PROCESSED",
        textContent: text,
        processedAt: new Date(),
        errorMessage: null,
        providerMetadata: {
          ...asMetadataObject(asset.providerMetadata),
          detectedLanguage: result.detectedLanguage ?? null,
          originalTranscript: result.originalTranscript ?? null,
          transcriptionProvider: "vertex-gemini",
          processedBy: input.requestedBy ?? "system",
        } as Prisma.InputJsonValue,
      },
    });

    return {
      assetId: asset.id,
      sourceType: "AUDIO",
      status: "processed",
      textChars: text.length,
      chunkCount,
    };
  } catch (error) {
    return markSourceFailed(asset, error);
  }
}

export async function loadProcessableFileSources(sessionId: string) {
  return prisma.sourceAsset.findMany({
    where: {
      sessionId,
      sourceType: { in: ["PDF", "AUDIO"] },
      status: { in: ["UPLOADED", "FAILED", "PROCESSED"] },
    },
    select: {
      id: true,
      sessionId: true,
      sourceType: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function processSessionFileSources(input: {
  sessionId: string;
  requestedBy: string;
}) {
  const sources = await loadProcessableFileSources(input.sessionId);
  const results: SourceProcessingResult[] = [];

  for (const source of sources) {
    if (source.sourceType === "PDF") {
      results.push(
        await processPdfAsset({
          assetId: source.id,
          sessionId: input.sessionId,
          requestedBy: input.requestedBy,
        }),
      );
    } else if (source.sourceType === "AUDIO") {
      results.push(
        await processAudioAsset({
          assetId: source.id,
          sessionId: input.sessionId,
          requestedBy: input.requestedBy,
        }),
      );
    }
  }

  logSourceProcessing("info", "Completed session file source processing.", {
    sessionId: input.sessionId,
    processed: results.filter((result) => result.status === "processed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
  });

  return results;
}
