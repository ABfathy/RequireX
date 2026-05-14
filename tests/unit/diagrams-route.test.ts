import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class HoistedDiagramGenerationError extends Error {
    readonly name = "DiagramGenerationError";

    constructor(
      readonly code:
        | "EMPTY_MODEL_OUTPUT"
        | "NON_STOP_FINISH"
        | "INVALID_JSON"
        | "INVALID_SCHEMA"
        | "INVALID_MERMAID_PARSE"
        | "INVALID_MERMAID_RENDER"
        | "DIAGRAM_TYPE_MISMATCH"
        | "SNAPSHOT_NOT_FOUND",
      message: string,
      readonly userMessage = message,
    ) {
      super(message);
    }
  }

  return {
    requireInternalAuth: vi.fn(),
    isInternalAuthorizationError: vi.fn(() => false),
    intakeSessionFindUnique: vi.fn(),
    briefSnapshotFindUnique: vi.fn(),
    briefDiagramFindMany: vi.fn(),
    generateDiagram: vi.fn(),
    DiagramGenerationError: HoistedDiagramGenerationError,
  };
});

vi.mock("@/server/auth/internal", () => ({
  requireInternalAuth: mocks.requireInternalAuth,
  isInternalAuthorizationError: mocks.isInternalAuthorizationError,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    intakeSession: {
      findUnique: mocks.intakeSessionFindUnique,
    },
    briefSnapshot: {
      findUnique: mocks.briefSnapshotFindUnique,
    },
    briefDiagram: {
      findMany: mocks.briefDiagramFindMany,
    },
  },
}));

vi.mock("@/server/services/diagram-generation", () => ({
  generateDiagram: mocks.generateDiagram,
  isDiagramGenerationError: (error: unknown) =>
    error instanceof mocks.DiagramGenerationError,
}));

import {
  GET,
  POST,
} from "@/app/api/sessions/[sessionId]/diagrams/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("diagrams route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireInternalAuth.mockResolvedValue({
      clerkUserId: "user_123",
    });
    mocks.intakeSessionFindUnique.mockResolvedValue({ id: "session_1" });
    mocks.briefSnapshotFindUnique.mockResolvedValue({
      id: "snapshot_1",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
    });
    mocks.generateDiagram.mockResolvedValue({
      id: "diagram_1",
      snapshotId: "snapshot_1",
      diagramType: "FLOWCHART",
      title: "System Flow",
      mermaidCode: "flowchart TD\nA-->B",
      description: "Shows the flow.",
      createdAt: new Date("2026-05-14T12:00:00.000Z"),
    });
    mocks.briefDiagramFindMany.mockResolvedValue([
      {
        id: "diagram_1",
        snapshotId: "snapshot_1",
        diagramType: "FLOWCHART",
        title: "System Flow",
        mermaidCode: "flowchart TD\nA-->B",
        description: "Shows the flow.",
        createdAt: new Date("2026-05-14T12:00:00.000Z"),
      },
    ]);
  });

  it("returns 404 when the snapshot does not belong to the session", async () => {
    mocks.briefSnapshotFindUnique.mockResolvedValueOnce({
      id: "snapshot_1",
      sessionId: "different-session",
    });

    const response = await POST(buildRequest({
      snapshotId: "550e8400-e29b-41d4-a716-446655440000",
      diagramType: "FLOWCHART",
    }), {
      params: Promise.resolve({
        sessionId: "550e8400-e29b-41d4-a716-446655440001",
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "SNAPSHOT_NOT_FOUND",
      message: "Snapshot not found.",
    });
  });

  it("maps diagram validation failures to stable API errors", async () => {
    mocks.generateDiagram.mockRejectedValueOnce(
      new mocks.DiagramGenerationError(
        "INVALID_MERMAID_RENDER",
        "Render failed",
        "The generated Mermaid diagram could not be rendered. Please try again.",
      ),
    );

    const response = await POST(buildRequest({
      snapshotId: "550e8400-e29b-41d4-a716-446655440000",
      diagramType: "FLOWCHART",
    }), {
      params: Promise.resolve({
        sessionId: "550e8400-e29b-41d4-a716-446655440001",
      }),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "DIAGRAM_MERMAID_RENDER_FAILED",
      message:
        "The generated Mermaid diagram could not be rendered. Please try again.",
    });
  });

  it("keeps the success payload shape unchanged", async () => {
    const response = await POST(buildRequest({
      snapshotId: "550e8400-e29b-41d4-a716-446655440000",
      diagramType: "FLOWCHART",
      userContext: "Show auth and upload flow",
    }), {
      params: Promise.resolve({
        sessionId: "550e8400-e29b-41d4-a716-446655440001",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "diagram_1",
      snapshotId: "snapshot_1",
      diagramType: "FLOWCHART",
      title: "System Flow",
      mermaidCode: "flowchart TD\nA-->B",
      description: "Shows the flow.",
      createdAt: "2026-05-14T12:00:00.000Z",
    });
  });

  it("serializes stored diagrams from GET", async () => {
    const response = await GET(new Request("http://localhost/api/test"), {
      params: Promise.resolve({
        sessionId: "550e8400-e29b-41d4-a716-446655440001",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      diagrams: [
        {
          id: "diagram_1",
          snapshotId: "snapshot_1",
          diagramType: "FLOWCHART",
          title: "System Flow",
          mermaidCode: "flowchart TD\nA-->B",
          description: "Shows the flow.",
          createdAt: "2026-05-14T12:00:00.000Z",
        },
      ],
    });
  });
});
