import { Type } from "@google/genai";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { type DiagramType } from "../../../generated/prisma/client";
import { serializeCurrentBrief } from "./brief-revision";
import { extractJson, getClient, MODEL } from "./google-genai";

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
    throw new Error("Snapshot not found.");
  }

  const briefSummary = serializeCurrentBrief(snapshot);
  const userPrompt = [
    "Requirements:",
    briefSummary,
    "",
    userContext ? `User context: ${userContext}\n` : "",
    "Generate the diagram now.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await getClient().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: DIAGRAM_SYSTEM_PROMPTS[diagramType],
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseJsonSchema: diagramResponseJsonSchema,
    },
  });

  const rawText = result.text ?? "";
  const parsed = DiagramOutputSchema.parse(extractJson(rawText));

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
