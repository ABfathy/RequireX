import { FinishReason, type GenerateContentResponse } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  briefSnapshotFindUnique: vi.fn(),
  briefDiagramDeleteMany: vi.fn(),
  briefDiagramCreate: vi.fn(),
  generateContent: vi.fn(),
  mermaidInitialize: vi.fn(),
  mermaidParse: vi.fn(),
  mermaidRender: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    briefSnapshot: {
      findUnique: mocks.briefSnapshotFindUnique,
    },
    briefDiagram: {
      deleteMany: mocks.briefDiagramDeleteMany,
      create: mocks.briefDiagramCreate,
    },
  },
}));

vi.mock("@/server/services/google-genai", async () => {
  const { z } = await import("zod");

  return {
    MODEL: "gemini-2.5-flash",
    STRUCTURED_OUTPUT_MAX_TOKENS: 16_384,
    getClient: () => ({
      models: {
        generateContent: mocks.generateContent,
      },
    }),
    getStructuredResponseMetadata: (response: GenerateContentResponse) => ({
      finishReason: response.candidates?.[0]?.finishReason ?? null,
      finishMessage: response.candidates?.[0]?.finishMessage ?? null,
      tokenCount: null,
      candidateCount: response.candidates?.length ?? 0,
      totalTokenCount: null,
      candidateTokenCount: null,
    }),
    parseStructuredResponse: <T,>(
      response: GenerateContentResponse,
      schema: { parse: (input: unknown) => T },
    ) => ({
      rawText: response.text ?? "",
      parsed: schema.parse(JSON.parse(response.text ?? "")),
      metadata: {
        finishReason: response.candidates?.[0]?.finishReason ?? null,
      },
    }),
  };
});

vi.mock("mermaid", () => ({
  default: {
    initialize: mocks.mermaidInitialize,
    parse: mocks.mermaidParse,
    render: mocks.mermaidRender,
  },
}));

import {
  DiagramGenerationError,
  generateDiagram,
} from "@/server/services/diagram-generation";

function createResponse(input: {
  text?: string;
  finishReason?: FinishReason;
  finishMessage?: string;
}) {
  return {
    text: input.text,
    candidates: [
      {
        finishReason: input.finishReason ?? FinishReason.STOP,
        finishMessage: input.finishMessage,
      },
    ],
  } as GenerateContentResponse;
}

function createPayload(mermaidCode: string) {
  return JSON.stringify({
    title: "System Flow",
    mermaidCode,
    description: "Shows the system flow.",
  });
}

describe("generateDiagram", () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.briefSnapshotFindUnique.mockResolvedValue({
      claims: [
        { section: "SUMMARY", text: "User signs in", confidence: "HIGH" },
      ],
      questions: [
        { section: "FOLLOW_UP", text: "Need MFA?", reason: "Security gap" },
      ],
    });
    mocks.briefDiagramDeleteMany.mockResolvedValue({ count: 1 });
    mocks.briefDiagramCreate.mockImplementation(async ({ data }) => ({
      id: "diagram_1",
      createdAt: new Date("2026-05-14T12:00:00.000Z"),
      ...data,
    }));
    mocks.mermaidParse.mockResolvedValue({ diagramType: "flowchart-v2" });
    mocks.mermaidRender.mockResolvedValue({ svg: "<svg />" });
    // Node test environment has no DOM, which intentionally skips render validation.
    // Some tests override this to exercise render validation explicitly.
    // @ts-expect-error test cleanup
    delete globalThis.document;
  });

  afterEach(() => {
    if (originalDocument) {
      globalThis.document = originalDocument;
    } else {
      // @ts-expect-error test cleanup
      delete globalThis.document;
    }
  });

  it("persists a valid Mermaid diagram", async () => {
    mocks.generateContent.mockResolvedValueOnce(
      createResponse({
        text: createPayload("flowchart TD\nA[Start]-->B[End]"),
      }),
    );

    const result = await generateDiagram({
      snapshotId: "550e8400-e29b-41d4-a716-446655440000",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      diagramType: "FLOWCHART",
      userContext: "Keep it simple",
    });

    expect(result.title).toBe("System Flow");
    expect(mocks.briefDiagramDeleteMany).toHaveBeenCalledWith({
      where: {
        snapshotId: "550e8400-e29b-41d4-a716-446655440000",
        diagramType: "FLOWCHART",
      },
    });
    expect(mocks.briefDiagramCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mermaidCode: "flowchart TD\nA[Start]-->B[End]",
        }),
      }),
    );
  });

  it("repairs invalid JSON responses", async () => {
    mocks.generateContent
      .mockResolvedValueOnce(
        createResponse({
          text: "{",
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("flowchart TD\nA-->B"),
        }),
      );

    const result = await generateDiagram({
      snapshotId: "550e8400-e29b-41d4-a716-446655440000",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      diagramType: "FLOWCHART",
    });

    expect(result.mermaidCode).toContain("flowchart TD");
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
  });

  it("retries once after an empty model response", async () => {
    mocks.generateContent
      .mockResolvedValueOnce(
        createResponse({
          text: "",
          finishReason: FinishReason.STOP,
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("flowchart TD\nA-->B"),
        }),
      );

    const result = await generateDiagram({
      snapshotId: "550e8400-e29b-41d4-a716-446655440000",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      diagramType: "FLOWCHART",
    });

    expect(result.id).toBe("diagram_1");
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
  });

  it("repairs Mermaid parse failures", async () => {
    mocks.generateContent
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("flowchart TD\nA-->"),
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("flowchart TD\nA-->B"),
        }),
      );
    mocks.mermaidParse
      .mockRejectedValueOnce(new Error("Unexpected end of input"))
      .mockResolvedValueOnce({ diagramType: "flowchart-v2" });

    const result = await generateDiagram({
      snapshotId: "550e8400-e29b-41d4-a716-446655440000",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      diagramType: "FLOWCHART",
    });

    expect(result.mermaidCode).toBe("flowchart TD\nA-->B");
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
  });

  it("repairs Mermaid render failures after parse succeeds", async () => {
    globalThis.document = {} as Document;
    mocks.generateContent
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("flowchart TD\nA-->B"),
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("flowchart TD\nA[Start]-->B[End]"),
        }),
      );
    mocks.mermaidRender
      .mockRejectedValueOnce(new Error("Layout failed"))
      .mockResolvedValueOnce({ svg: "<svg />" });

    const result = await generateDiagram({
      snapshotId: "550e8400-e29b-41d4-a716-446655440000",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      diagramType: "FLOWCHART",
    });

    expect(result.mermaidCode).toContain("A[Start]");
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
  });

  it("throws a typed validation error when Mermaid stays invalid after repair", async () => {
    mocks.generateContent
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("flowchart TD\nA-->"),
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("flowchart TD\nA-->"),
        }),
      );
    mocks.mermaidParse.mockRejectedValue(new Error("Broken Mermaid"));

    await expect(
      generateDiagram({
        snapshotId: "550e8400-e29b-41d4-a716-446655440000",
        sessionId: "550e8400-e29b-41d4-a716-446655440001",
        diagramType: "FLOWCHART",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_MERMAID_PARSE",
    });
  });

  it("throws a typed mismatch error when the diagram family stays wrong", async () => {
    mocks.generateContent
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("sequenceDiagram\nparticipant A\nA->>B: hi"),
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          text: createPayload("sequenceDiagram\nparticipant A\nA->>B: hi again"),
        }),
      );
    mocks.mermaidParse.mockResolvedValue({ diagramType: "sequence" });

    await expect(
      generateDiagram({
        snapshotId: "550e8400-e29b-41d4-a716-446655440000",
        sessionId: "550e8400-e29b-41d4-a716-446655440001",
        diagramType: "FLOWCHART",
      }),
    ).rejects.toMatchObject({
      code: "DIAGRAM_TYPE_MISMATCH",
    });
  });

  it("throws SNAPSHOT_NOT_FOUND when the snapshot is missing", async () => {
    mocks.briefSnapshotFindUnique.mockResolvedValueOnce(null);

    await expect(
      generateDiagram({
        snapshotId: "550e8400-e29b-41d4-a716-446655440000",
        sessionId: "550e8400-e29b-41d4-a716-446655440001",
        diagramType: "FLOWCHART",
      }),
    ).rejects.toMatchObject({
      code: "SNAPSHOT_NOT_FOUND",
    });
  });
});
