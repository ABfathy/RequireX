import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GoogleGenAI, Type } from "@google/genai";

import { serverEnv } from "@/lib/env/server";
import { BriefOutputSchema } from "@/server/validators/brief-output";

const MODEL = "gemini-2.5-flash";
const TEMP_CREDENTIALS_PATH = join(tmpdir(), "requirex-google-service-account.json");

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
};

export type SourceBundle = {
  assets: SourceBundleAsset[];
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

const SYSTEM_PROMPT = `You are a senior product analyst building a structured brief from raw client intake material.

You will receive one or more SOURCE blocks delimited like:
[SOURCE id="<sourceAssetId>" label="<label>"]
<source text>
[/SOURCE]

Produce a JSON object with exactly these top-level keys:
- "summary": array of claim objects
- "goals": array of claim objects
- "ambiguities": array of question objects
- "followUpQuestions": array of question objects

Each claim object has "text", "confidence", and non-empty "evidence".
Each question object has "text", "reason", and "evidence" which may be empty.
Evidence items use { "sourceAssetId": <one of the provided source ids>, "excerpt": <short verbatim quote> }.

Rules:
- Use only sourceAssetId values from the SOURCE blocks.
- Draw evidence from ALL provided SOURCE blocks — do not focus only on the first one or two. Where relevant, every source should appear in at least one evidence reference across the output.
- Cap each section at 5 items.
- Prefer HIGH confidence only when the source material clearly supports it.
- Excerpts must be short and copied from the cited source.
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
      const parsed = JSON.parse(serverEnv.GOOGLE_SERVICE_ACCOUNT_JSON) as Record<
        string,
        unknown
      >;
      writeFileSync(TEMP_CREDENTIALS_PATH, JSON.stringify(parsed), {
        encoding: "utf8",
        mode: 0o600,
      });
      cachedCredentialsPath = TEMP_CREDENTIALS_PATH;
      process.env.GOOGLE_APPLICATION_CREDENTIALS = TEMP_CREDENTIALS_PATH;

      logGoogleGenAI("info", "Materialized Google service account JSON.", {
        path: TEMP_CREDENTIALS_PATH,
        source: serverEnv.NODE_ENV === "production" ? "env-json" : "env-json-local",
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

function buildPrompt(bundle: SourceBundle, retryHint?: string) {
  const sourceText = bundle.assets
    .map(
      (asset) =>
        `[SOURCE id="${asset.id}" label="${asset.label.replace(/"/g, '\\"')}"]\n${asset.text}\n[/SOURCE]`,
    )
    .join("\n\n");

  const validIds = bundle.assets.map((asset) => `- ${asset.id}`).join("\n");
  const retryText = retryHint
    ? `\n\nYour previous response was invalid: ${retryHint}\nReturn only corrected JSON.`
    : "";

  return `Use only these sourceAssetId values in evidence:\n${validIds}\n\n${sourceText}${retryText}`;
}

function extractJson(raw: string) {
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

export async function generateBriefFromBundle(
  bundle: SourceBundle,
  retryHint?: string,
) {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: MODEL,
      contents: buildPrompt(bundle, retryHint),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 4096,
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
      errorMessage: error instanceof Error ? error.message : "Unknown Gemini error.",
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
        error instanceof Error ? error.message : "Failed to parse Gemini output.",
    });
    throw error;
  }
}
