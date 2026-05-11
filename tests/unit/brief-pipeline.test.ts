import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    intakeSession: {
      findUnique: vi.fn(),
    },
    briefSnapshot: {
      findFirst: vi.fn(),
    },
    sourceAsset: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    sourceChunk: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    processingJob: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/google-genai", () => ({
  generateBriefFromBundle: vi.fn(),
  GoogleGenAIConfigError: class GoogleGenAIConfigError extends Error {
    readonly code = "VERTEX_CONFIG_MISSING";
  },
}));

import { prisma } from "@/lib/prisma";
import { runBriefGeneration } from "@/server/services/brief-pipeline";
import { generateBriefFromBundle } from "@/server/services/google-genai";

const mockPrisma = prisma as unknown as {
  intakeSession: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  briefSnapshot: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  sourceAsset: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  sourceChunk: {
    findMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  processingJob: {
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockGenerateBriefFromBundle =
  generateBriefFromBundle as unknown as ReturnType<typeof vi.fn>;

function createTx() {
  return {
    briefSnapshot: {
      aggregate: vi.fn().mockResolvedValue({ _max: { version: 0 } }),
      create: vi.fn().mockResolvedValue({ id: "snapshot_1", version: 1 }),
    },
    briefClaim: {
      create: vi
        .fn()
        .mockResolvedValueOnce({ id: "claim_1" })
        .mockResolvedValueOnce({ id: "claim_2" }),
    },
    briefQuestion: {
      create: vi.fn().mockResolvedValue({ id: "question_1" }),
    },
    evidenceRef: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    revisionEvent: {
      create: vi.fn().mockResolvedValue({ id: "revision_1" }),
    },
    processingJob: {
      update: vi.fn().mockResolvedValue({ id: "job_1" }),
    },
    intakeSession: {
      update: vi.fn().mockResolvedValue({ id: "session_1" }),
    },
  };
}

describe("runBriefGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.intakeSession.findUnique.mockResolvedValue({
      id: "session_1",
      projectId: "project_1",
    });
    mockPrisma.briefSnapshot.findFirst.mockResolvedValue({ id: "snapshot_0" });
    mockPrisma.processingJob.update.mockResolvedValue({ id: "job_1" });
    mockPrisma.sourceAsset.findMany
      .mockResolvedValueOnce([
        {
          id: "asset_1",
          sessionId: "session_1",
          sourceType: "TEXT",
          status: "UPLOADED",
          displayLabel: "Pasted text",
          originalFileName: null,
          textContent: "Client needs a portal.\n\nThey also need approvals.",
          chunks: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "asset_1",
          sessionId: "session_1",
          sourceType: "TEXT",
          status: "PROCESSED",
          displayLabel: "Pasted text",
          originalFileName: null,
          textContent: "Client needs a portal.\n\nThey also need approvals.",
          chunks: [
            {
              id: "chunk_1",
              sourceAssetId: "asset_1",
              kind: "TEXT_BLOCK",
              orderIndex: 0,
              text: "Client needs a portal.",
              locator: { kind: "text-range", paragraphStart: 0, paragraphEnd: 0 },
              chunkLabel: "Text 1",
              createdAt: new Date(),
              updatedAt: new Date(),
              pageNumber: null,
              startMs: null,
              endMs: null,
            },
          ],
        },
      ]);
    mockPrisma.sourceChunk.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.sourceAsset.update.mockResolvedValue({ id: "asset_1" });
    mockGenerateBriefFromBundle.mockResolvedValue({
      summary: [
        {
          text: "The client needs a portal.",
          confidence: "HIGH",
          evidence: [{ sourceAssetId: "asset_1", excerpt: "Client needs a portal." }],
        },
      ],
      goals: [
        {
          text: "Support approvals.",
          confidence: "MEDIUM",
          evidence: [{ sourceAssetId: "asset_1", excerpt: "They also need approvals." }],
        },
      ],
      ambiguities: [],
      followUpQuestions: [],
    });
  });

  it("creates chunks, persists a snapshot, and marks the job succeeded", async () => {
    const tx = createTx();
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );

    await runBriefGeneration({
      jobId: "job_1",
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    expect(mockPrisma.sourceChunk.createMany).toHaveBeenCalled();
    expect(mockGenerateBriefFromBundle).toHaveBeenCalledWith({
      assets: [
        expect.objectContaining({
          id: "asset_1",
          label: "Pasted text",
        }),
      ],
    });
    expect(tx.briefSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        sessionId: "session_1",
        version: 1,
      }),
    });
    expect(tx.evidenceRef.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          snapshotId: "snapshot_1",
          sourceChunkId: "chunk_1",
        }),
      ],
    });
    expect(mockPrisma.processingJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "SUCCEEDED",
        resultSnapshotId: "snapshot_1",
      }),
    });
  });

  it("fails before model generation when no text sources exist", async () => {
    mockPrisma.sourceAsset.findMany.mockReset();
    mockPrisma.sourceAsset.findMany.mockResolvedValueOnce([]);

    await expect(
      runBriefGeneration({
        jobId: "job_1",
        sessionId: "session_1",
        requestedBy: "user_1",
      }),
    ).rejects.toThrow("No text sources");

    expect(mockGenerateBriefFromBundle).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
