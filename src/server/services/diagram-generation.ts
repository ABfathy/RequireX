import { FinishReason, Type, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { type DiagramType } from "../../../generated/prisma/client";
import {
  getStructuredResponseMetadata,
  getClient,
  MODEL,
  parseStructuredResponse,
  STRUCTURED_OUTPUT_MAX_TOKENS,
} from "./google-genai";

const DiagramOutputSchema = z.object({
  title: z.string().min(1).max(200),
  mermaidCode: z.string().min(10).max(10_000),
  description: z.string().max(500).optional(),
});

const diagramResponseJsonSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    mermaidCode: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ["title", "mermaidCode"],
} as const;

const PREAMBLE = `You are a technical diagram specialist. You will receive a product requirements brief and generate a Mermaid diagram that visually represents the system or flow described.

Rules that apply to ALL diagram types:
- Add logically implied steps, actors, or components that are clearly necessary but not explicitly stated.
- Keep all labels concise (2–6 words for nodes, short phrases for transitions).
- Output ONLY valid Mermaid syntax — no explanations, no markdown fences.
- Return JSON with three fields: title (string), mermaidCode (string), description (string, 1–2 sentences summarising what the diagram shows).`;

const DIAGRAM_SYSTEM_PROMPTS: Record<DiagramType, string> = {
  FLOWCHART: `${PREAMBLE}

Diagram type: FLOWCHART
Syntax: Start with "flowchart TD"
Rules:
- Use rectangular nodes for steps: A[Label]
- Use diamond nodes for decisions: B{Question?}
- Use rounded nodes for start/end: C([Start])
- Group 3+ related nodes with subgraph blocks
- Show the happy path and 1–2 key branches (error state, retry, success redirect)
- Maximum 20 nodes`,

  SEQUENCE: `${PREAMBLE}

Diagram type: SEQUENCE DIAGRAM
Syntax: Start with "sequenceDiagram"
Rules:
- Declare all actors with "participant" at the top
- Use ->> for requests, -->> for responses
- Use "activate/deactivate" around long-running operations
- Use "loop" for retry/polling, "alt/else" for conditional branches
- Identify actors from requirements: user, frontend, backend, services, databases, third-parties
- Maximum 15 messages`,

  ARCHITECTURE: `${PREAMBLE}

Diagram type: ARCHITECTURE DIAGRAM
Syntax: Start with "graph LR"
Rules:
- Rectangular nodes for services/components: A[Service Name]
- Cylindrical nodes for databases: DB[(Database)]
- Rounded nodes for external systems: EXT([External API])
- Group by layer using subgraphs: Frontend, Backend, Data, External
- Label edges with the protocol or data type: A -->|REST| B
- Infer plausible components (auth service, CDN, cache) if clearly implied
- Maximum 16 nodes`,

  ACTIVITY: `${PREAMBLE}

Diagram type: ACTIVITY / STATE DIAGRAM
Syntax: Start with "stateDiagram-v2"
Rules:
- Use [*] for start and end states
- Label each transition with the triggering event or action
- Use composite states ("state StateName { ... }") to group related states
- Use fork/join ("state fork_state <<fork>>") for parallel flows when relevant
- Include implied states: Loading, Error, Authenticated, etc.
- Maximum 12 states`,

  USER_JOURNEY: `${PREAMBLE}

Diagram type: USER JOURNEY
Syntax: Start with "journey"
Rules:
- Add "title <journey name>" on line 2
- Group steps into sections by product phase: "section SectionName:"
- Each step: "  Task description: score: ActorName"
  - Score 1–5 (1 = very frustrated, 5 = delighted) — infer from context
  - Actor names must match roles in the requirements (e.g., User, Admin, Client)
- Map sections to phases like Onboarding, Core Usage, Review, Output
- Maximum 20 steps across all sections`,
};

export type GenerateDiagramInput = {
  snapshotId: string;
  sessionId: string;
  diagramType: DiagramType;
  userContext?: string;
};

export type DiagramGenerationErrorCode =
  | "EMPTY_MODEL_OUTPUT"
  | "NON_STOP_FINISH"
  | "INVALID_JSON"
  | "INVALID_SCHEMA"
  | "INVALID_MERMAID_PARSE"
  | "INVALID_MERMAID_RENDER"
  | "DIAGRAM_TYPE_MISMATCH"
  | "SNAPSHOT_NOT_FOUND";

export class DiagramGenerationError extends Error {
  readonly name = "DiagramGenerationError";

  constructor(
    readonly code: DiagramGenerationErrorCode,
    message: string,
    readonly options?: {
      cause?: unknown;
      userMessage?: string;
      finishReason?: string | null;
      phase?: "request" | "parse" | "render";
      repairAttemptCount?: number;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
  }

  get userMessage() {
    return this.options?.userMessage ?? this.message;
  }
}

export function isDiagramGenerationError(
  error: unknown,
): error is DiagramGenerationError {
  return error instanceof DiagramGenerationError;
}

function serializeSnapshotForDiagram(snapshot: {
  claims: Array<{ section: string; text: string; confidence: string }>;
  questions: Array<{ section: string; text: string; reason: string }>;
}) {
  const lines: string[] = [];
  const claimsBySection = new Map<string, typeof snapshot.claims>();
  const questionsBySection = new Map<string, typeof snapshot.questions>();

  for (const claim of snapshot.claims) {
    const bucket = claimsBySection.get(claim.section) ?? [];
    bucket.push(claim);
    claimsBySection.set(claim.section, bucket);
  }

  for (const question of snapshot.questions) {
    const bucket = questionsBySection.get(question.section) ?? [];
    bucket.push(question);
    questionsBySection.set(question.section, bucket);
  }

  for (const [section, claims] of claimsBySection) {
    lines.push(`${section}:`);
    for (const claim of claims) {
      lines.push(`- [${claim.confidence}] ${claim.text}`);
    }
  }

  for (const [section, questions] of questionsBySection) {
    lines.push(`${section}:`);
    for (const question of questions) {
      lines.push(`- ${question.text} (reason: ${question.reason})`);
    }
  }

  return lines.join("\n");
}

function stripMarkdownFences(code: string) {
  const trimmed = code.trim();
  const fenced = trimmed.match(/^```(?:mermaid)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ? fenced[1].trim() : trimmed;
}

async function validateMermaidCode(code: string) {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    suppressErrorRendering: true,
  });

  try {
    const result = await mermaid.parse(code);
    const diagramType = result.diagramType;

    if (typeof document === "undefined") {
      return { ok: true as const, diagramType };
    }

    try {
      await mermaid.render(
        `mermaid-validate-${Math.random().toString(36).slice(2)}`,
        code,
      );
      return { ok: true as const, diagramType };
    } catch (error) {
      return {
        ok: false as const,
        phase: "render" as const,
        message:
          error instanceof Error
            ? error.message
            : "Unknown Mermaid render error.",
      };
    }
  } catch (error) {
    return {
      ok: false as const,
      phase: "parse" as const,
      message:
        error instanceof Error ? error.message : "Unknown Mermaid parse error.",
    };
  }
}

function matchesRequestedDiagramType(
  requestedType: DiagramType,
  mermaidDiagramType: string | undefined,
) {
  if (!mermaidDiagramType) return false;

  const normalized = mermaidDiagramType.toLowerCase();
  const families: Record<DiagramType, string[]> = {
    FLOWCHART: ["flowchart", "flowchart-v2", "graph"],
    SEQUENCE: ["sequence"],
    ARCHITECTURE: ["architecture", "flowchart", "flowchart-v2", "graph"],
    ACTIVITY: ["state", "statediagram", "statediagram-v2"],
    USER_JOURNEY: ["journey"],
  };

  return families[requestedType].some((candidate) =>
    normalized.includes(candidate),
  );
}

function mapValidationErrorCode(phase: "parse" | "render") {
  return phase === "render"
    ? "INVALID_MERMAID_RENDER"
    : "INVALID_MERMAID_PARSE";
}

function logDiagramFailure(
  error: DiagramGenerationError,
  details: {
    diagramType: DiagramType;
    finishReason?: string | null;
    repairAttemptCount: number;
  },
) {
  console.warn({
    scope: "diagram-generation",
    code: error.code,
    message: error.message,
    phase: error.options?.phase ?? null,
    diagramType: details.diagramType,
    finishReason: error.options?.finishReason ?? details.finishReason ?? null,
    repairAttemptCount:
      error.options?.repairAttemptCount ?? details.repairAttemptCount,
  });
}

function parseDiagramResponse(
  response: GenerateContentResponse,
  repairAttemptCount: number,
) {
  const metadata = getStructuredResponseMetadata(response);

  if (!response.text?.trim()) {
    throw new DiagramGenerationError(
      "EMPTY_MODEL_OUTPUT",
      "Model returned an empty response.",
      {
        userMessage:
          "The diagram model returned an empty response. Please try again.",
        finishReason: metadata.finishReason,
        phase: "request",
        repairAttemptCount,
      },
    );
  }

  if (
    metadata.finishReason &&
    metadata.finishReason !== FinishReason.STOP &&
    metadata.finishReason !== FinishReason.FINISH_REASON_UNSPECIFIED
  ) {
    throw new DiagramGenerationError(
      "NON_STOP_FINISH",
      `Structured output ended with finish reason ${metadata.finishReason}.`,
      {
        userMessage:
          "The diagram model stopped before completing a valid response. Please try again.",
        finishReason: metadata.finishReason,
        phase: "request",
        repairAttemptCount,
      },
    );
  }

  try {
    return {
      parsed: parseStructuredResponse(response, DiagramOutputSchema).parsed,
      finishReason: metadata.finishReason,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new DiagramGenerationError(
        "INVALID_SCHEMA",
        "Diagram response did not match the expected schema.",
        {
          cause: error,
          userMessage:
            "The diagram model returned an unexpected response shape. Please try again.",
          finishReason: metadata.finishReason,
          phase: "parse",
          repairAttemptCount,
        },
      );
    }

    throw new DiagramGenerationError(
      "INVALID_JSON",
      error instanceof Error ? error.message : "Diagram response was not valid JSON.",
      {
        cause: error,
        userMessage:
          "The diagram model returned invalid structured output. Please try again.",
        finishReason: metadata.finishReason,
        phase: "parse",
        repairAttemptCount,
      },
    );
  }
}

async function validateRequestedDiagram(
  diagramType: DiagramType,
  mermaidCode: string,
  repairAttemptCount: number,
) {
  const validation = await validateMermaidCode(mermaidCode);

  if (!validation.ok) {
    throw new DiagramGenerationError(
      mapValidationErrorCode(validation.phase),
      `Generated Mermaid code failed ${validation.phase} validation: ${validation.message}`,
      {
        userMessage:
          validation.phase === "render"
            ? "The generated Mermaid diagram could not be rendered. Please try again."
            : "The generated Mermaid diagram was not valid Mermaid syntax. Please try again.",
        phase: validation.phase,
        repairAttemptCount,
      },
    );
  }

  if (!matchesRequestedDiagramType(diagramType, validation.diagramType)) {
    throw new DiagramGenerationError(
      "DIAGRAM_TYPE_MISMATCH",
      `Expected ${diagramType} Mermaid output, received ${validation.diagramType ?? "unknown"}.`,
      {
        userMessage:
          "The generated diagram did not match the requested diagram type. Please try again.",
        phase: "parse",
        repairAttemptCount,
      },
    );
  }

  return validation;
}

async function requestDiagramJson(input: {
  diagramType: DiagramType;
  userPrompt: string;
  extraRepairInstruction?: string;
  previousRawText?: string;
}) {
  const { diagramType, userPrompt, extraRepairInstruction, previousRawText } =
    input;

  const contents = previousRawText && extraRepairInstruction
    ? [
        { role: "user" as const, parts: [{ text: userPrompt }] },
        { role: "model" as const, parts: [{ text: previousRawText }] },
        { role: "user" as const, parts: [{ text: extraRepairInstruction }] },
      ]
    : [{ role: "user" as const, parts: [{ text: userPrompt }] }];

  return getClient().models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: DIAGRAM_SYSTEM_PROMPTS[diagramType],
      temperature: extraRepairInstruction ? 0.2 : 0.4,
      maxOutputTokens: STRUCTURED_OUTPUT_MAX_TOKENS,
      responseMimeType: "application/json",
      responseJsonSchema: diagramResponseJsonSchema,
    },
  });
}

export async function generateDiagram(input: GenerateDiagramInput) {
  const { snapshotId, sessionId, diagramType, userContext } = input;

  const snapshot = await prisma.briefSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      claims: {
        select: { section: true, text: true, confidence: true },
        orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
      },
      questions: {
        select: { section: true, text: true, reason: true },
        orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
      },
    },
  });

  if (!snapshot) {
    throw new DiagramGenerationError(
      "SNAPSHOT_NOT_FOUND",
      "Snapshot not found.",
      {
        userMessage: "Snapshot not found.",
      },
    );
  }

  const briefSummary = serializeSnapshotForDiagram(snapshot);
  const userPrompt = [
    "Requirements:",
    briefSummary,
    "",
    userContext ? `User context: ${userContext}\n` : "",
    "Generate the diagram now.",
  ]
    .filter(Boolean)
    .join("\n");

  let repairAttemptCount = 0;
  let finishReason: string | null | undefined = null;
  let parsed: z.infer<typeof DiagramOutputSchema>;

  try {
    const result = await requestDiagramJson({
      diagramType,
      userPrompt,
    });
    const firstPass = parseDiagramResponse(result, repairAttemptCount);
    finishReason = firstPass.finishReason;
    parsed = {
      ...firstPass.parsed,
      mermaidCode: stripMarkdownFences(firstPass.parsed.mermaidCode),
    };
  } catch (error) {
    if (!(error instanceof DiagramGenerationError)) throw error;

    repairAttemptCount += 1;
    logDiagramFailure(error, {
      diagramType,
      finishReason,
      repairAttemptCount,
    });

    const retryResult = await requestDiagramJson({
      diagramType,
      userPrompt,
      previousRawText: "",
      extraRepairInstruction:
        error.code === "EMPTY_MODEL_OUTPUT" || error.code === "NON_STOP_FINISH"
          ? "Your previous response was incomplete or empty. Regenerate the full response now as a complete JSON object with title, mermaidCode, and description. Reply with JSON only."
          : 'Your response was not valid JSON or did not match the required schema. Reply with only a JSON object: {"title":"...","mermaidCode":"...","description":"..."}. No markdown fences, no explanation.',
    });
    const retried = parseDiagramResponse(retryResult, repairAttemptCount);
    finishReason = retried.finishReason;
    parsed = {
      ...retried.parsed,
      mermaidCode: stripMarkdownFences(retried.parsed.mermaidCode),
    };
  }

  try {
    await validateRequestedDiagram(
      diagramType,
      parsed.mermaidCode,
      repairAttemptCount,
    );
  } catch (error) {
    if (!(error instanceof DiagramGenerationError)) throw error;

    repairAttemptCount += 1;
    logDiagramFailure(error, {
      diagramType,
      finishReason,
      repairAttemptCount,
    });

    if (
      error.code === "INVALID_MERMAID_PARSE" ||
      error.code === "INVALID_MERMAID_RENDER" ||
      error.code === "DIAGRAM_TYPE_MISMATCH"
    ) {
      const repairResult = await requestDiagramJson({
        diagramType,
        userPrompt,
        previousRawText: JSON.stringify(parsed),
        extraRepairInstruction: `${error.message}
Return the same JSON shape, preserve the diagram intent, preserve title/description unless they are clearly wrong, and fix only mermaidCode so Mermaid validates and matches the requested diagram type. Reply with JSON only and no markdown fences.`,
      });
      const repaired = parseDiagramResponse(repairResult, repairAttemptCount);
      finishReason = repaired.finishReason;
      parsed = {
        ...repaired.parsed,
        mermaidCode: stripMarkdownFences(repaired.parsed.mermaidCode),
      };
      await validateRequestedDiagram(
        diagramType,
        parsed.mermaidCode,
        repairAttemptCount,
      );
    } else {
      throw error;
    }
  }

  await prisma.briefDiagram.deleteMany({ where: { snapshotId, diagramType } });

  return prisma.briefDiagram.create({
    data: {
      snapshotId,
      sessionId,
      diagramType,
      title: parsed.title,
      mermaidCode: parsed.mermaidCode,
      description: parsed.description ?? null,
    },
  });
}
