import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    intakeSession: {
      findUnique: vi.fn(),
    },
    briefSnapshot: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/google-genai", () => ({
  extractJson: (raw: string) => JSON.parse(raw),
  generateFinalizedDocumentFromBriefs: vi.fn(),
  generateFinalizedDocumentStreamFromBriefs: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  createFinalizedDocument,
  createFinalizedDocumentStream,
} from "@/server/services/finalized-documents";
import {
  generateFinalizedDocumentFromBriefs,
  generateFinalizedDocumentStreamFromBriefs,
} from "@/server/services/google-genai";

const mockPrisma = prisma as unknown as {
  intakeSession: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  briefSnapshot: {
    findMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockGenerateFinalizedDocumentFromBriefs =
  generateFinalizedDocumentFromBriefs as unknown as ReturnType<typeof vi.fn>;
const mockGenerateFinalizedDocumentStreamFromBriefs =
  generateFinalizedDocumentStreamFromBriefs as unknown as ReturnType<
    typeof vi.fn
  >;

function finalizedOutput() {
  const item = (text: string) => ({
    text,
    confidence: "HIGH" as const,
    evidence: [],
  });

  return {
    projectOverview: [item("The project is a dense requirements platform.")],
    projectGoals: [item("Create complete, useful requirement documents.")],
    mainFeatures: [item("Generate briefs and finalized requirements.")],
    functionalRequirements: [item("Users can create finalized documents.")],
    nonFunctionalRequirements: [item("The output should be dense and clear.")],
    userFlows: [item("Analyst creates briefs, then finalizes them.")],
  };
}

function sourceBrief(version: number) {
  return {
    id: `snapshot_${version}`,
    version,
    claims: [
      {
        section: "SUMMARY",
        text: `Summary from brief ${version}.`,
        confidence: "HIGH",
      },
      {
        section: "GOALS",
        text: `Goal from brief ${version}.`,
        confidence: "MEDIUM",
      },
    ],
    questions: [
      {
        section: "FOLLOW_UP_QUESTIONS",
        text: `Open item from brief ${version}.`,
        reason: "Needed for generated brief review.",
        status: "OPEN",
      },
    ],
  };
}

function createTx(finalizedMaxVersion = 1) {
  return {
    briefSnapshot: {
      aggregate: vi
        .fn()
        .mockResolvedValue({ _max: { version: finalizedMaxVersion } }),
      create: vi.fn().mockResolvedValue({
        id: "finalized_2",
        version: finalizedMaxVersion + 1,
        documentType: "FINALIZED_DOCUMENT",
      }),
    },
    briefClaim: {
      createMany: vi.fn().mockResolvedValue({ count: 6 }),
    },
    revisionEvent: {
      create: vi.fn().mockResolvedValue({ id: "revision_1" }),
    },
    intakeSession: {
      update: vi.fn().mockResolvedValue({ id: "session_1" }),
    },
  };
}

async function* chunksFrom(text: string) {
  const midpoint = Math.ceil(text.length / 2);
  yield text.slice(0, midpoint);
  yield text.slice(midpoint);
}

describe("createFinalizedDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.intakeSession.findUnique.mockResolvedValue({
      id: "session_1",
      projectId: "project_1",
    });
    mockPrisma.briefSnapshot.findMany.mockResolvedValue([
      sourceBrief(4),
      sourceBrief(3),
      sourceBrief(2),
    ]);
    mockGenerateFinalizedDocumentFromBriefs.mockResolvedValue(
      finalizedOutput(),
    );
  });

  it("uses the latest three generated briefs and creates a separate finalized version", async () => {
    const tx = createTx(1);
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );

    const result = await createFinalizedDocument({
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    expect(mockPrisma.briefSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sessionId: "session_1",
          documentType: "GENERATED_BRIEF",
        },
        orderBy: { version: "desc" },
        take: 3,
      }),
    );
    expect(mockGenerateFinalizedDocumentFromBriefs).toHaveBeenCalledWith([
      expect.objectContaining({ version: 2 }),
      expect.objectContaining({ version: 3 }),
      expect.objectContaining({ version: 4 }),
    ]);
    expect(tx.briefSnapshot.aggregate).toHaveBeenCalledWith({
      where: {
        sessionId: "session_1",
        documentType: "FINALIZED_DOCUMENT",
      },
      _max: { version: true },
    });
    expect(tx.briefSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "session_1",
        version: 2,
        documentType: "FINALIZED_DOCUMENT",
        sourceBundleVersion: 4,
      }),
    });
    expect(tx.briefClaim.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          snapshotId: "finalized_2",
          section: "PROJECT_OVERVIEW",
          orderIndex: 0,
        }),
        expect.objectContaining({
          snapshotId: "finalized_2",
          section: "USER_FLOWS",
          orderIndex: 0,
        }),
      ]),
    });
    expect(result).toEqual({
      snapshotId: "finalized_2",
      version: 2,
      documentType: "FINALIZED_DOCUMENT",
    });
  });

  it("stores only finalized claim sections and no questions", async () => {
    const tx = createTx(0);
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );

    await createFinalizedDocument({
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    const createManyArg = tx.briefClaim.createMany.mock.calls[0]?.[0];
    expect(
      createManyArg.data.map((row: { section: string }) => row.section),
    ).toEqual([
      "PROJECT_OVERVIEW",
      "PROJECT_GOALS",
      "MAIN_FEATURES",
      "FUNCTIONAL_REQUIREMENTS",
      "NON_FUNCTIONAL_REQUIREMENTS",
      "USER_FLOWS",
    ]);
    expect("briefQuestion" in tx).toBe(false);
  });

  it("rejects sessions without generated briefs", async () => {
    mockPrisma.briefSnapshot.findMany.mockResolvedValueOnce([]);

    await expect(
      createFinalizedDocument({
        sessionId: "session_1",
        requestedBy: "user_1",
      }),
    ).rejects.toMatchObject({
      code: "NO_GENERATED_BRIEFS",
      status: 409,
    });
    expect(mockGenerateFinalizedDocumentFromBriefs).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("streams finalized document tokens and persists the parsed output", async () => {
    const tx = createTx(2);
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    const rawOutput = JSON.stringify(finalizedOutput());
    mockGenerateFinalizedDocumentStreamFromBriefs.mockReturnValueOnce(
      chunksFrom(rawOutput),
    );

    const events = [];
    for await (const event of createFinalizedDocumentStream({
      sessionId: "session_1",
      requestedBy: "user_1",
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: "token",
        text: rawOutput.slice(0, Math.ceil(rawOutput.length / 2)),
      },
      { type: "token", text: rawOutput.slice(Math.ceil(rawOutput.length / 2)) },
      {
        type: "complete",
        snapshotId: "finalized_2",
        version: 3,
        documentType: "FINALIZED_DOCUMENT",
      },
    ]);
    expect(mockGenerateFinalizedDocumentFromBriefs).not.toHaveBeenCalled();
    expect(tx.briefClaim.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          snapshotId: "finalized_2",
          section: "FUNCTIONAL_REQUIREMENTS",
        }),
      ]),
    });
  });
});
