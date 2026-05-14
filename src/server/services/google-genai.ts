import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

import { serverEnv } from "@/lib/env/server";
import {
  BriefOutputSchema,
  FinalizedDocumentOutputSchema,
} from "@/server/validators/brief-output";

const MODEL = "gemini-2.5-flash";
const TEMP_CREDENTIALS_PATH = join(
  tmpdir(),
  "requirex-google-service-account.json",
);

let cachedClient: GoogleGenAI | null = null;
let cachedCredentialsPath: string | null = null;

function logGoogleGenAI(
  level: "info" | "warn" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  const payload = {
    scope: "google-genai",
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

export type SourceBundleAsset = {
  id: string;
  label: string;
  text: string;
  sourceType?: string;
  mimeType?: string | null;
  fileUrl?: string | null;
};

export type SourceBundle = {
  assets: SourceBundleAsset[];
  /** Claims from the most-recent snapshot, included in the prompt on regeneration so the model builds on prior work and user-added lines. */
  existingClaims?: Array<{ text: string; section: string }>;
};

export type FinalizedBriefVersion = {
  version: number;
  claims: Array<{
    section: string;
    text: string;
    confidence: string;
  }>;
  questions: Array<{
    section: string;
    text: string;
    reason: string;
    status: string;
  }>;
};

const responseJsonSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          confidence: {
            type: Type.STRING,
            enum: ["LOW", "MEDIUM", "HIGH"],
          },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceAssetId: { type: Type.STRING },
                excerpt: { type: Type.STRING },
              },
              required: ["sourceAssetId", "excerpt"],
            },
          },
        },
        required: ["text", "confidence", "evidence"],
      },
    },
    goals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          confidence: {
            type: Type.STRING,
            enum: ["LOW", "MEDIUM", "HIGH"],
          },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceAssetId: { type: Type.STRING },
                excerpt: { type: Type.STRING },
              },
              required: ["sourceAssetId", "excerpt"],
            },
          },
        },
        required: ["text", "confidence", "evidence"],
      },
    },
    ambiguities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          reason: { type: Type.STRING },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceAssetId: { type: Type.STRING },
                excerpt: { type: Type.STRING },
              },
              required: ["sourceAssetId", "excerpt"],
            },
          },
        },
        required: ["text", "reason", "evidence"],
      },
    },
    followUpQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          reason: { type: Type.STRING },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceAssetId: { type: Type.STRING },
                excerpt: { type: Type.STRING },
              },
              required: ["sourceAssetId", "excerpt"],
            },
          },
        },
        required: ["text", "reason", "evidence"],
      },
    },
  },
  required: ["summary", "goals", "ambiguities", "followUpQuestions"],
} as const;

const finalizedClaimJsonSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    confidence: {
      type: Type.STRING,
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    evidence: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sourceAssetId: { type: Type.STRING },
          excerpt: { type: Type.STRING },
        },
        required: ["sourceAssetId", "excerpt"],
      },
    },
  },
  required: ["text", "confidence", "evidence"],
} as const;

const finalizedDocumentJsonSchema = {
  type: Type.OBJECT,
  properties: {
    projectOverview: {
      type: Type.ARRAY,
      items: finalizedClaimJsonSchema,
    },
    projectGoals: {
      type: Type.ARRAY,
      items: finalizedClaimJsonSchema,
    },
    mainFeatures: {
      type: Type.ARRAY,
      items: finalizedClaimJsonSchema,
    },
    functionalRequirements: {
      type: Type.ARRAY,
      items: finalizedClaimJsonSchema,
    },
    nonFunctionalRequirements: {
      type: Type.ARRAY,
      items: finalizedClaimJsonSchema,
    },
    userFlows: {
      type: Type.ARRAY,
      items: finalizedClaimJsonSchema,
    },
  },
  required: [
    "projectOverview",
    "projectGoals",
    "mainFeatures",
    "functionalRequirements",
    "nonFunctionalRequirements",
    "userFlows",
  ],
} as const;

const audioTranscriptionJsonSchema = {
  type: Type.OBJECT,
  properties: {
    detectedLanguage: { type: Type.STRING },
    originalTranscript: { type: Type.STRING },
    englishTranscript: { type: Type.STRING },
  },
  required: ["englishTranscript"],
} as const;

const AudioTranscriptionResultSchema = z.object({
  detectedLanguage: z.string().optional().nullable(),
  originalTranscript: z.string().optional().nullable(),
  englishTranscript: z.string().min(1),
});

export type AudioTranscriptionResult = z.infer<
  typeof AudioTranscriptionResultSchema
>;

const AUDIO_TRANSCRIPTION_SYSTEM_PROMPT = `You transcribe client voice notes for a product analyst.

Return JSON only with:
- "detectedLanguage": the likely spoken language name or BCP-47 code if clear
- "originalTranscript": the best transcript in the original spoken language
- "englishTranscript": a clear English translation of the full voice note

If the voice note is already English, use the same content for originalTranscript and englishTranscript.
Preserve project requirements, constraints, names, dates, numbers, and open questions.`;

const SYSTEM_PROMPT = `You are a senior product analyst building a structured brief from raw client intake material.

You will receive one or more SOURCE blocks and/or IMAGE_SOURCE blocks delimited like:
[SOURCE id="<sourceAssetId>" label="<label>"]
<source text>
[/SOURCE]

[IMAGE_SOURCE id="<sourceAssetId>" label="<label>"]
<image source note>
[/IMAGE_SOURCE]

Produce a JSON object with exactly these top-level keys:
- "summary": array of claim objects
- "goals": array of claim objects
- "ambiguities": array of question objects
- "followUpQuestions": array of question objects

Each claim object has "text", "confidence", and "evidence" (may be empty if no direct source quote applies).
Each question object has "text", "reason", and "evidence" which may be empty.
Evidence items use { "sourceAssetId": <one of the provided source ids>, "excerpt": <short verbatim quote> }.

Rules:
- Use only sourceAssetId values from the SOURCE or IMAGE_SOURCE blocks.
- Draw evidence from ALL provided sources — do not focus only on the first one or two. Where relevant, every source should appear in at least one evidence reference across the output.
- For IMAGE_SOURCE blocks, inspect the attached image directly. Useful images may include client chat screenshots, UI screenshots, notes, sequence diagrams, architecture diagrams, feature sketches, or other product/project material.
- If an image is unclear or not project-relevant, such as a random selfie or generic photo, do not invent requirements. Add an ambiguity or follow-up question saying that the image source does not provide enough actionable project information.
- Prefer dense, content-rich output. Expand known requirements with concrete scope, constraints, examples, actors, and inferred structure when supported by the intake.
- Cap summary and goals at 12 items each.
- Cap ambiguities and follow-up questions at 4 items each. Only ask questions that are truly unavoidable for continuing the brief; do not ask questions merely because details are incomplete.
- Prefer HIGH confidence only when the source material clearly supports it.
- Excerpts must be short and copied from the cited text source when possible. For image sources, use short visible text from the image or a concise visual description.
- Output JSON only.`;

const FINALIZED_DOCUMENT_SYSTEM_PROMPT = `You are a senior product analyst composing a finalized requirements document from prior generated brief versions.

You will receive the latest generated brief versions. Produce a complete, dense requirements document as JSON with exactly these top-level keys:
- "projectOverview"
- "projectGoals"
- "mainFeatures"
- "functionalRequirements"
- "nonFunctionalRequirements"
- "userFlows"

Each item is a claim object with "text", "confidence", and "evidence". Evidence can be an empty array because this document is composed from brief versions rather than raw source blocks.

Rules:
- Ask no questions of any kind.
- Do not create ambiguity or follow-up question sections.
- Answer everything from the provided brief content.
- Prefer more content over sparse summaries. Write clear, detailed requirement statements with actors, behaviors, constraints, dependencies, and expected outcomes where the brief supports or reasonably implies them.
- Convert missing details into reasonable assumptions or write "To be confirmed later" inside the relevant section text.
- Keep the document internally consistent. Prefer newer brief versions when versions conflict, while preserving useful detail from older versions.
- Output JSON only.`;

export class GoogleGenAIConfigError extends Error {
  readonly code = "VERTEX_CONFIG_MISSING";

  constructor(message: string) {
    super(message);
    this.name = "GoogleGenAIConfigError";
  }
}

function ensureGoogleCredentials() {
  if (
    serverEnv.NODE_ENV !== "production" &&
    serverEnv.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    cachedCredentialsPath = serverEnv.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
      serverEnv.GOOGLE_APPLICATION_CREDENTIALS;
    return serverEnv.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (cachedCredentialsPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = cachedCredentialsPath;
    return cachedCredentialsPath;
  }

  if (serverEnv.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(
        serverEnv.GOOGLE_SERVICE_ACCOUNT_JSON,
      ) as Record<string, unknown>;
      writeFileSync(TEMP_CREDENTIALS_PATH, JSON.stringify(parsed), {
        encoding: "utf8",
        mode: 0o600,
      });
      cachedCredentialsPath = TEMP_CREDENTIALS_PATH;
      process.env.GOOGLE_APPLICATION_CREDENTIALS = TEMP_CREDENTIALS_PATH;

      logGoogleGenAI("info", "Materialized Google service account JSON.", {
        path: TEMP_CREDENTIALS_PATH,
        source:
          serverEnv.NODE_ENV === "production" ? "env-json" : "env-json-local",
      });

      return TEMP_CREDENTIALS_PATH;
    } catch (error) {
      logGoogleGenAI("error", "Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown service account JSON error.",
      });
      throw new GoogleGenAIConfigError(
        "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.",
      );
    }
  }

  if (serverEnv.GOOGLE_APPLICATION_CREDENTIALS) {
    cachedCredentialsPath = serverEnv.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
      serverEnv.GOOGLE_APPLICATION_CREDENTIALS;
    return serverEnv.GOOGLE_APPLICATION_CREDENTIALS;
  }

  return null;
}

function getClient() {
  if (cachedClient) return cachedClient;
  const credentialsPath = ensureGoogleCredentials();
  if (!serverEnv.GOOGLE_CLOUD_PROJECT || !serverEnv.GOOGLE_CLOUD_LOCATION) {
    logGoogleGenAI("error", "Missing Vertex AI configuration.", {
      hasProject: Boolean(serverEnv.GOOGLE_CLOUD_PROJECT),
      hasLocation: Boolean(serverEnv.GOOGLE_CLOUD_LOCATION),
      hasCredentialsPath: Boolean(credentialsPath),
      hasServiceAccountJson: Boolean(serverEnv.GOOGLE_SERVICE_ACCOUNT_JSON),
    });
    throw new GoogleGenAIConfigError(
      "GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are required for brief generation.",
    );
  }

  logGoogleGenAI("info", "Initializing GoogleGenAI Vertex client.", {
    project: serverEnv.GOOGLE_CLOUD_PROJECT,
    location: serverEnv.GOOGLE_CLOUD_LOCATION,
    hasCredentialsPath: Boolean(credentialsPath),
    hasServiceAccountJson: Boolean(serverEnv.GOOGLE_SERVICE_ACCOUNT_JSON),
    credentialsSource:
      credentialsPath === serverEnv.GOOGLE_APPLICATION_CREDENTIALS
        ? "path"
        : credentialsPath
          ? "env-json"
          : "adc",
    model: MODEL,
  });

  cachedClient = new GoogleGenAI({
    vertexai: true,
    project: serverEnv.GOOGLE_CLOUD_PROJECT,
    location: serverEnv.GOOGLE_CLOUD_LOCATION,
  });
  return cachedClient;
}

function formatSourceBlock(asset: SourceBundleAsset) {
  const label = asset.label.replace(/"/g, '\\"');
  if (asset.sourceType === "IMAGE") {
    return `[IMAGE_SOURCE id="${asset.id}" label="${label}"]\n${asset.text}\nThe corresponding image is attached in the request parts.\n[/IMAGE_SOURCE]`;
  }

  return `[SOURCE id="${asset.id}" label="${label}"]\n${asset.text}\n[/SOURCE]`;
}

function buildPromptText(bundle: SourceBundle, retryHint?: string) {
  const sourceText = bundle.assets
    .map((asset) => formatSourceBlock(asset))
    .join("\n\n");

  const validIds = bundle.assets.map((asset) => `- ${asset.id}`).join("\n");
  const retryText = retryHint
    ? `\n\nYour previous response was invalid: ${retryHint}\nReturn only corrected JSON.`
    : "";

  let existingClaimsText = "";
  if (bundle.existingClaims && bundle.existingClaims.length > 0) {
    const bySect = new Map<string, string[]>();
    for (const c of bundle.existingClaims) {
      const bucket = bySect.get(c.section) ?? [];
      bucket.push(c.text);
      bySect.set(c.section, bucket);
    }
    const sections = [...bySect.entries()]
      .map(
        ([sec, texts]) =>
          `[${sec}]\n${texts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
      )
      .join("\n\n");
    existingClaimsText = `\n\nEXISTING REQUIREMENTS (preserve and build upon these — they include both AI-generated and manually added lines; update, refine, or extend them based on the sources above):\n\n${sections}`;
  }

  return `Use only these sourceAssetId values in evidence:\n${validIds}\n\n${sourceText}${existingClaimsText}${retryText}`;
}

async function imageInlinePart(asset: SourceBundleAsset) {
  if (asset.sourceType !== "IMAGE") return null;
  if (!asset.fileUrl || !asset.mimeType?.startsWith("image/")) {
    throw new Error(
      `Image source ${asset.id} is missing a readable image file.`,
    );
  }

  const response = await fetch(asset.fileUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download image source ${asset.id} (${response.status}).`,
    );
  }

  return {
    inlineData: {
      mimeType: asset.mimeType,
      data: Buffer.from(await response.arrayBuffer()).toString("base64"),
    },
  };
}

async function buildPromptContents(bundle: SourceBundle, retryHint?: string) {
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: buildPromptText(bundle, retryHint) }];

  for (const asset of bundle.assets) {
    const imagePart = await imageInlinePart(asset);
    if (imagePart) {
      parts.push({ text: `Attached image for sourceAssetId ${asset.id}.` });
      parts.push(imagePart);
    }
  }

  return parts;
}

function buildFinalizedDocumentPrompt(
  briefVersions: FinalizedBriefVersion[],
  retryHint?: string,
) {
  const versionsText = briefVersions
    .map((brief) => {
      const lines: string[] = [`[BRIEF_VERSION ${brief.version}]`];

      const claimsBySection = new Map<string, typeof brief.claims>();
      for (const claim of brief.claims) {
        const bucket = claimsBySection.get(claim.section) ?? [];
        bucket.push(claim);
        claimsBySection.set(claim.section, bucket);
      }

      for (const [section, claims] of claimsBySection) {
        lines.push(`${section}:`);
        for (const claim of claims) {
          lines.push(`- [${claim.confidence}] ${claim.text}`);
        }
      }

      if (brief.questions.length > 0) {
        lines.push("QUESTIONS_AND_OPEN_ITEMS:");
        for (const question of brief.questions) {
          lines.push(
            `- [${question.section}/${question.status}] ${question.text} Reason: ${question.reason}`,
          );
        }
      }

      lines.push(`[/BRIEF_VERSION ${brief.version}]`);
      return lines.join("\n");
    })
    .join("\n\n");

  const retryText = retryHint
    ? `\n\nYour previous response was invalid: ${retryHint}\nReturn only corrected JSON.`
    : "";

  return `Compose a finalized requirements document from these generated brief versions. Use the latest version as the strongest source when details conflict, but preserve useful detail from earlier versions.\n\n${versionsText}${retryText}`;
}

export function extractJson(raw: string) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
    throw new Error("Model output was not valid JSON.");
  }
}

const REVISION_SYSTEM_PROMPT = `You are a senior product analyst updating an existing structured brief based on an internal user's instruction.

You will receive:
1. The current brief as a JSON object.
2. One or more SOURCE or IMAGE_SOURCE blocks containing the original intake material.
3. The user's instruction for how to update the brief.

Produce an updated JSON object with exactly the same top-level keys as the original brief:
- "summary": array of claim objects
- "goals": array of claim objects
- "ambiguities": array of question objects
- "followUpQuestions": array of question objects

Follow the user's instruction precisely. Only modify what the instruction requires; preserve content that is unaffected.
Each claim object has "text", "confidence", and "evidence" (may be empty if no direct source quote applies).
Each question object has "text", "reason", and "evidence" which may be empty.
Evidence items use { "sourceAssetId": <one of the provided source ids>, "excerpt": <short verbatim quote> }.

Rules:
- Use only sourceAssetId values from the SOURCE or IMAGE_SOURCE blocks.
- For IMAGE_SOURCE blocks, inspect the attached image directly. If an image is unclear or not project-relevant, do not invent requirements; preserve or add an ambiguity/follow-up that says the image does not provide enough actionable project information.
- Cap each section at 5 items.
- Prefer HIGH confidence only when the source material clearly supports it.
- Excerpts must be short and copied from the cited text source when possible. For image sources, use short visible text from the image or a concise visual description.
- Output JSON only.`;

function buildRevisionPrompt(
  bundle: SourceBundle,
  currentBriefSummary: string,
  userMessage: string,
  selectionText?: string,
  retryHint?: string,
) {
  const sourceText = bundle.assets
    .map((asset) => formatSourceBlock(asset))
    .join("\n\n");

  const validIds = bundle.assets.map((asset) => `- ${asset.id}`).join("\n");
  const selectionNote = selectionText
    ? `\nThe user is specifically referring to this text in the brief: "${selectionText.slice(0, 200)}"`
    : "";
  const retryText = retryHint
    ? `\n\nYour previous response was invalid: ${retryHint}\nReturn only corrected JSON.`
    : "";

  return `Use only these sourceAssetId values in evidence:\n${validIds}\n\nCurrent brief:\n${currentBriefSummary}\n\nUser instruction: ${userMessage}${selectionNote}\n\n${sourceText}${retryText}`;
}

async function buildRevisionContents(
  bundle: SourceBundle,
  currentBriefSummary: string,
  userMessage: string,
  selectionText?: string,
  retryHint?: string,
) {
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [
    {
      text: buildRevisionPrompt(
        bundle,
        currentBriefSummary,
        userMessage,
        selectionText,
        retryHint,
      ),
    },
  ];

  for (const asset of bundle.assets) {
    const imagePart = await imageInlinePart(asset);
    if (imagePart) {
      parts.push({ text: `Attached image for sourceAssetId ${asset.id}.` });
      parts.push(imagePart);
    }
  }

  return parts;
}

export async function* generateBriefStreamFromBundle(
  bundle: SourceBundle,
  retryHint?: string,
): AsyncGenerator<string> {
  let stream;
  try {
    stream = await getClient().models.generateContentStream({
      model: MODEL,
      contents: await buildPromptContents(bundle, retryHint),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });
  } catch (error) {
    logGoogleGenAI("error", "Gemini streaming call failed.", {
      project: serverEnv.GOOGLE_CLOUD_PROJECT ?? null,
      location: serverEnv.GOOGLE_CLOUD_LOCATION ?? null,
      sourceAssetCount: bundle.assets.length,
      retry: Boolean(retryHint),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error ? error.message : "Unknown Gemini error.",
    });
    throw error;
  }

  for await (const chunk of stream) {
    const text = chunk.text ?? "";
    if (text) yield text;
  }
}

export async function* reviseBriefStreamFromBundle(
  bundle: SourceBundle,
  currentBriefSummary: string,
  userMessage: string,
  selectionText?: string,
  retryHint?: string,
): AsyncGenerator<string> {
  let stream;
  try {
    stream = await getClient().models.generateContentStream({
      model: MODEL,
      contents: await buildRevisionContents(
        bundle,
        currentBriefSummary,
        userMessage,
        selectionText,
        retryHint,
      ),
      config: {
        systemInstruction: REVISION_SYSTEM_PROMPT,
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });
  } catch (error) {
    logGoogleGenAI("error", "Gemini revision streaming call failed.", {
      project: serverEnv.GOOGLE_CLOUD_PROJECT ?? null,
      location: serverEnv.GOOGLE_CLOUD_LOCATION ?? null,
      sourceAssetCount: bundle.assets.length,
      retry: Boolean(retryHint),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error ? error.message : "Unknown Gemini error.",
    });
    throw error;
  }

  for await (const chunk of stream) {
    const text = chunk.text ?? "";
    if (text) yield text;
  }
}

export async function reviseBriefFromBundle(
  bundle: SourceBundle,
  currentBriefSummary: string,
  userMessage: string,
  selectionText?: string,
  retryHint?: string,
) {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: MODEL,
      contents: await buildRevisionContents(
        bundle,
        currentBriefSummary,
        userMessage,
        selectionText,
        retryHint,
      ),
      config: {
        systemInstruction: REVISION_SYSTEM_PROMPT,
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });
  } catch (error) {
    logGoogleGenAI("error", "Gemini revision call failed.", {
      project: serverEnv.GOOGLE_CLOUD_PROJECT ?? null,
      location: serverEnv.GOOGLE_CLOUD_LOCATION ?? null,
      sourceAssetCount: bundle.assets.length,
      retry: Boolean(retryHint),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error ? error.message : "Unknown Gemini error.",
    });
    throw error;
  }

  const rawText = response.text;
  if (!rawText) {
    logGoogleGenAI("error", "Gemini revision returned an empty response.", {
      sourceAssetCount: bundle.assets.length,
      retry: Boolean(retryHint),
    });
    throw new Error("Model returned an empty response.");
  }

  try {
    return BriefOutputSchema.parse(extractJson(rawText));
  } catch (error) {
    logGoogleGenAI(
      "warn",
      "Gemini revision returned invalid structured output.",
      {
        sourceAssetCount: bundle.assets.length,
        retry: Boolean(retryHint),
        rawPreview: rawText.slice(0, 500),
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to parse Gemini output.",
      },
    );
    throw error;
  }
}

export async function transcribeAudioToEnglish(input: {
  audioBase64: string;
  mimeType: string;
}): Promise<AudioTranscriptionResult> {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: MODEL,
      contents: [
        {
          text: "Transcribe this voice note and translate it to English.",
        },
        {
          inlineData: {
            mimeType: input.mimeType,
            data: input.audioBase64,
          },
        },
      ],
      config: {
        systemInstruction: AUDIO_TRANSCRIPTION_SYSTEM_PROMPT,
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseJsonSchema: audioTranscriptionJsonSchema,
      },
    });
  } catch (error) {
    logGoogleGenAI("error", "Gemini audio transcription call failed.", {
      project: serverEnv.GOOGLE_CLOUD_PROJECT ?? null,
      location: serverEnv.GOOGLE_CLOUD_LOCATION ?? null,
      mimeType: input.mimeType,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error ? error.message : "Unknown Gemini error.",
    });
    throw error;
  }

  const rawText = response.text;
  if (!rawText) {
    logGoogleGenAI("error", "Gemini audio transcription returned empty text.", {
      mimeType: input.mimeType,
    });
    throw new Error("Model returned an empty audio transcription response.");
  }

  try {
    return AudioTranscriptionResultSchema.parse(extractJson(rawText));
  } catch (error) {
    logGoogleGenAI(
      "warn",
      "Gemini audio transcription returned invalid JSON.",
      {
        mimeType: input.mimeType,
        rawPreview: rawText.slice(0, 500),
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to parse Gemini output.",
      },
    );
    throw error;
  }
}

export async function generateBriefFromBundle(
  bundle: SourceBundle,
  retryHint?: string,
) {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: MODEL,
      contents: await buildPromptContents(bundle, retryHint),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });
  } catch (error) {
    logGoogleGenAI("error", "Gemini call failed.", {
      project: serverEnv.GOOGLE_CLOUD_PROJECT ?? null,
      location: serverEnv.GOOGLE_CLOUD_LOCATION ?? null,
      sourceAssetCount: bundle.assets.length,
      retry: Boolean(retryHint),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error ? error.message : "Unknown Gemini error.",
    });
    throw error;
  }

  const rawText = response.text;
  if (!rawText) {
    logGoogleGenAI("error", "Gemini returned an empty response.", {
      sourceAssetCount: bundle.assets.length,
      retry: Boolean(retryHint),
    });
    throw new Error("Model returned an empty response.");
  }

  try {
    return BriefOutputSchema.parse(extractJson(rawText));
  } catch (error) {
    logGoogleGenAI("warn", "Gemini returned invalid structured output.", {
      sourceAssetCount: bundle.assets.length,
      retry: Boolean(retryHint),
      rawPreview: rawText.slice(0, 500),
      errorMessage:
        error instanceof Error
          ? error.message
          : "Failed to parse Gemini output.",
    });
    throw error;
  }
}

export async function generateFinalizedDocumentFromBriefs(
  briefVersions: FinalizedBriefVersion[],
  retryHint?: string,
) {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: MODEL,
      contents: [
        { text: buildFinalizedDocumentPrompt(briefVersions, retryHint) },
      ],
      config: {
        systemInstruction: FINALIZED_DOCUMENT_SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
        responseJsonSchema: finalizedDocumentJsonSchema,
      },
    });
  } catch (error) {
    logGoogleGenAI("error", "Gemini finalized document call failed.", {
      project: serverEnv.GOOGLE_CLOUD_PROJECT ?? null,
      location: serverEnv.GOOGLE_CLOUD_LOCATION ?? null,
      briefVersionCount: briefVersions.length,
      retry: Boolean(retryHint),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error ? error.message : "Unknown Gemini error.",
    });
    throw error;
  }

  const rawText = response.text;
  if (!rawText) {
    logGoogleGenAI("error", "Gemini finalized document returned empty text.", {
      briefVersionCount: briefVersions.length,
      retry: Boolean(retryHint),
    });
    throw new Error("Model returned an empty finalized document response.");
  }

  try {
    return FinalizedDocumentOutputSchema.parse(extractJson(rawText));
  } catch (error) {
    logGoogleGenAI(
      "warn",
      "Gemini finalized document returned invalid structured output.",
      {
        briefVersionCount: briefVersions.length,
        retry: Boolean(retryHint),
        rawPreview: rawText.slice(0, 500),
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to parse Gemini output.",
      },
    );
    throw error;
  }
}

export async function* generateFinalizedDocumentStreamFromBriefs(
  briefVersions: FinalizedBriefVersion[],
  retryHint?: string,
): AsyncGenerator<string> {
  let stream;
  try {
    stream = await getClient().models.generateContentStream({
      model: MODEL,
      contents: [
        { text: buildFinalizedDocumentPrompt(briefVersions, retryHint) },
      ],
      config: {
        systemInstruction: FINALIZED_DOCUMENT_SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
        responseJsonSchema: finalizedDocumentJsonSchema,
      },
    });
  } catch (error) {
    logGoogleGenAI(
      "error",
      "Gemini finalized document streaming call failed.",
      {
        project: serverEnv.GOOGLE_CLOUD_PROJECT ?? null,
        location: serverEnv.GOOGLE_CLOUD_LOCATION ?? null,
        briefVersionCount: briefVersions.length,
        retry: Boolean(retryHint),
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage:
          error instanceof Error ? error.message : "Unknown Gemini error.",
      },
    );
    throw error;
  }

  for await (const chunk of stream) {
    const text = chunk.text ?? "";
    if (text) yield text;
  }
}
