import { deflateSync } from "node:zlib";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sourceAsset: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/google-genai", () => ({
  transcribeAudioToEnglish: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { transcribeAudioToEnglish } from "@/server/services/google-genai";
import {
  processAudioAsset,
  processPdfAsset,
} from "@/server/services/source-processing";

const mockPrisma = prisma as unknown as {
  sourceAsset: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockTranscribeAudioToEnglish =
  transcribeAudioToEnglish as unknown as ReturnType<typeof vi.fn>;

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

function makePdfWithTextStream(text: string) {
  const stream = deflateSync(Buffer.from(`BT (${text}) Tj ET`, "latin1"));
  return Buffer.concat([
    Buffer.from("%PDF-1.7\n1 0 obj\n", "latin1"),
    Buffer.from(
      `<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`,
      "latin1",
    ),
    stream,
    Buffer.from("\nendstream\nendobj\n%%EOF", "latin1"),
  ]);
}

function createTx() {
  return {
    sourceChunk: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe("source processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.sourceAsset.update.mockResolvedValue({ id: "asset_1" });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(createTx()),
    );
  });

  it("processes a PDF into text and chunks", async () => {
    const pdf = makePdfWithTextStream("Client needs a secure portal.");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => toArrayBuffer(pdf),
      }),
    );
    mockPrisma.sourceAsset.findFirst.mockResolvedValueOnce({
      id: "asset_1",
      sessionId: "session_1",
      sourceType: "PDF",
      status: "UPLOADED",
      textContent: null,
      chunks: [],
      appUrl: "https://utfs.io/f/pdf",
      ufsUrl: "https://utfs.io/f/pdf",
      mimeType: "application/pdf",
      providerMetadata: null,
    });

    const result = await processPdfAsset({
      assetId: "asset_1",
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    expect(result.status).toBe("processed");
    expect(mockPrisma.sourceAsset.update).toHaveBeenLastCalledWith({
      where: { id: "asset_1" },
      data: expect.objectContaining({
        status: "PROCESSED",
        textContent: expect.stringContaining("secure portal"),
      }),
    });
  });

  it("transcribes audio to English text and chunks", async () => {
    const audio = Buffer.from("fake-audio");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => toArrayBuffer(audio),
      }),
    );
    mockPrisma.sourceAsset.findFirst.mockResolvedValueOnce({
      id: "asset_2",
      sessionId: "session_1",
      sourceType: "AUDIO",
      status: "UPLOADED",
      textContent: null,
      chunks: [],
      appUrl: "https://utfs.io/f/audio",
      ufsUrl: "https://utfs.io/f/audio",
      mimeType: "audio/webm",
      providerMetadata: null,
    });
    mockTranscribeAudioToEnglish.mockResolvedValueOnce({
      detectedLanguage: "Spanish",
      originalTranscript: "Necesitamos pagos.",
      englishTranscript: "We need payments.",
    });

    const result = await processAudioAsset({
      assetId: "asset_2",
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    expect(result.status).toBe("processed");
    expect(mockTranscribeAudioToEnglish).toHaveBeenCalledWith({
      audioBase64: audio.toString("base64"),
      mimeType: "audio/webm",
    });
    expect(mockPrisma.sourceAsset.update).toHaveBeenLastCalledWith({
      where: { id: "asset_2" },
      data: expect.objectContaining({
        status: "PROCESSED",
        textContent: "We need payments.",
      }),
    });
  });
});
