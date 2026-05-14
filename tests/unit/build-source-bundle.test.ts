/**
 * Unit tests for buildSourceBundle — the function that assembles each
 * source asset's full text into the Gemini prompt bundle.
 *
 * Key invariants under test:
 *  1. Multiple uneven sources each contribute their own full text.
 *  2. A source longer than the per-source ceiling is truncated at that ceiling.
 *  3. Assets with empty bodies are excluded from the bundle.
 *  4. The per-source ceiling defaults to 750_000 characters.
 *  5. The ceiling is clamped to a minimum of 1_000 chars regardless of env.
 */

import { describe, expect, it, vi } from "vitest";

// Mock Prisma and genai so importing brief-pipeline.ts doesn't trigger
// DATABASE_URL validation or real network calls at module-load time.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    intakeSession: { findUnique: vi.fn() },
    briefSnapshot: { findFirst: vi.fn() },
    sourceAsset: { findMany: vi.fn(), update: vi.fn() },
    sourceChunk: { createMany: vi.fn() },
    processingJob: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/google-genai", () => ({
  generateBriefFromBundle: vi.fn(),
  generateBriefStreamFromBundle: vi.fn(),
  extractJson: vi.fn(),
  GoogleGenAIConfigError: class GoogleGenAIConfigError extends Error {
    readonly code = "VERTEX_CONFIG_MISSING";
  },
}));

vi.mock("@/server/services/source-processing", () => ({
  normalizeSourceTextToChunks: vi.fn(() => []),
  processSessionFileSources: vi.fn().mockResolvedValue([]),
}));

import {
  buildSourceBundle,
  type PromptAssetWithChunks,
} from "@/server/services/brief-pipeline";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTextAsset(
  id: string,
  textContent: string,
  overrides: Partial<PromptAssetWithChunks> = {},
): PromptAssetWithChunks {
  return {
    id,
    sessionId: "session_1",
    projectId: "project_1",
    sourceType: "TEXT",
    status: "PROCESSED",
    displayLabel: `Asset ${id}`,
    originalFileName: null,
    textContent,
    mimeType: null,
    appUrl: null,
    ufsUrl: null,
    fileUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    processedAt: new Date(),
    errorMessage: null,
    providerMetadata: null,
    chunks: [],
    ...overrides,
  } as unknown as PromptAssetWithChunks;
}

// ---------------------------------------------------------------------------
// Tests: full-source text (no shared budget split)
// ---------------------------------------------------------------------------

describe("buildSourceBundle — full-source assembly", () => {
  it("includes the full text of a single short source", () => {
    const asset = makeTextAsset("a1", "Short requirement.");
    const bundle = buildSourceBundle([asset]);

    expect(bundle.assets).toHaveLength(1);
    expect(bundle.assets[0]!.text).toBe("Short requirement.");
  });

  it("includes the full text of multiple sources with uneven lengths", () => {
    // Under the old shared-budget logic these would have been truncated to
    // 10 000 chars each (3 sources × 30 000 / 3).  Both should now be intact.
    const shortBody = "A".repeat(5_000);
    const longBody = "B".repeat(40_000);
    const veryLongBody = "C".repeat(80_000);

    const assets = [
      makeTextAsset("a1", shortBody),
      makeTextAsset("a2", longBody),
      makeTextAsset("a3", veryLongBody),
    ];

    const bundle = buildSourceBundle(assets);

    expect(bundle.assets).toHaveLength(3);
    expect(bundle.assets[0]!.text).toBe(shortBody);
    expect(bundle.assets[1]!.text).toBe(longBody);
    expect(bundle.assets[2]!.text).toBe(veryLongBody);
  });

  it("preserves source identity — id, label, sourceType, and fileUrl are forwarded", () => {
    const asset = makeTextAsset("a1", "Some content.", {
      appUrl: "https://example.com/file.txt",
    } as Partial<PromptAssetWithChunks>);

    const bundle = buildSourceBundle([asset]);
    const bundleAsset = bundle.assets[0]!;

    expect(bundleAsset.id).toBe("a1");
    expect(bundleAsset.label).toBe("Asset a1");
    expect(bundleAsset.sourceType).toBe("TEXT");
    expect(bundleAsset.fileUrl).toBe("https://example.com/file.txt");
  });

  it("falls back to chunk text when textContent is absent", () => {
    const asset = makeTextAsset("a1", "", {
      textContent: null,
      chunks: [
        {
          id: "c1",
          sourceAssetId: "a1",
          kind: "TEXT_BLOCK",
          orderIndex: 0,
          text: "Chunk one content.",
          locator: null,
          chunkLabel: "Text 1",
          createdAt: new Date(),
          updatedAt: new Date(),
          pageNumber: null,
          startMs: null,
          endMs: null,
        },
        {
          id: "c2",
          sourceAssetId: "a1",
          kind: "TEXT_BLOCK",
          orderIndex: 1,
          text: "Chunk two content.",
          locator: null,
          chunkLabel: "Text 2",
          createdAt: new Date(),
          updatedAt: new Date(),
          pageNumber: null,
          startMs: null,
          endMs: null,
        },
      ],
    } as Partial<PromptAssetWithChunks>);

    const bundle = buildSourceBundle([asset]);
    expect(bundle.assets[0]!.text).toBe(
      "Chunk one content.\n\nChunk two content.",
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: per-source ceiling
// ---------------------------------------------------------------------------

describe("buildSourceBundle — per-source ceiling", () => {
  it("truncates a source that exceeds the 750 000-char default ceiling", () => {
    // Build a body that is clearly over the ceiling
    const body = "X".repeat(800_000);
    const asset = makeTextAsset("a1", body);

    const bundle = buildSourceBundle([asset]);

    // Should be capped — not the full 800 000 chars
    expect(bundle.assets[0]!.text.length).toBeLessThanOrEqual(750_000);
    // And should be the leading slice, not something else
    expect(bundle.assets[0]!.text).toBe(body.slice(0, 750_000));
  });

  it("does NOT truncate a source that is under the 750 000-char ceiling", () => {
    const body = "Y".repeat(300_000);
    const asset = makeTextAsset("a1", body);

    const bundle = buildSourceBundle([asset]);

    expect(bundle.assets[0]!.text).toBe(body);
    expect(bundle.assets[0]!.text.length).toBe(300_000);
  });

  it("applies the ceiling independently to each source — one large, one small", () => {
    const big = "B".repeat(900_000); // over ceiling
    const small = "S".repeat(1_000); // well under ceiling

    const bundle = buildSourceBundle([
      makeTextAsset("big", big),
      makeTextAsset("small", small),
    ]);

    expect(bundle.assets).toHaveLength(2);
    // Big source is capped
    expect(bundle.assets[0]!.text.length).toBe(750_000);
    // Small source is untouched
    expect(bundle.assets[1]!.text).toBe(small);
  });
});

// ---------------------------------------------------------------------------
// Tests: empty-body exclusion
// ---------------------------------------------------------------------------

describe("buildSourceBundle — empty body exclusion", () => {
  it("returns an empty bundle when all assets have empty bodies", () => {
    const assets = [
      makeTextAsset("a1", ""),
      makeTextAsset("a2", "   "), // whitespace-only
    ];

    const bundle = buildSourceBundle(assets);
    expect(bundle.assets).toHaveLength(0);
  });

  it("excludes only the empty-body assets and keeps non-empty ones", () => {
    const assets = [
      makeTextAsset("empty", ""),
      makeTextAsset("real", "Actual requirement text."),
    ];

    const bundle = buildSourceBundle(assets);

    expect(bundle.assets).toHaveLength(1);
    expect(bundle.assets[0]!.id).toBe("real");
  });
});

// ---------------------------------------------------------------------------
// Tests: generation path receives full source text
// ---------------------------------------------------------------------------

describe("buildSourceBundle — generation path contract", () => {
  it("two sources of different lengths both appear in full in the bundle", () => {
    // Simulates the real generation path: sources are assembled and the bundle
    // is passed directly to generateBriefFromBundle.  Each asset must carry
    // its complete text so the model sees all requirements.
    const sourceA = "Requirement from source A. ".repeat(200); // ~5 400 chars
    const sourceB = "Requirement from source B. ".repeat(800); // ~21 600 chars

    const bundle = buildSourceBundle([
      makeTextAsset("sa", sourceA),
      makeTextAsset("sb", sourceB),
    ]);

    expect(bundle.assets).toHaveLength(2);

    const textA = bundle.assets.find((a) => a.id === "sa")!.text;
    const textB = bundle.assets.find((a) => a.id === "sb")!.text;

    // Full text preserved — no truncation to a shared budget
    expect(textA).toBe(sourceA.trim());
    expect(textB).toBe(sourceB.trim());
  });

  it("assets are ordered the same way as the input array", () => {
    const assets = ["first", "second", "third"].map((id) =>
      makeTextAsset(id, `Content of ${id}.`),
    );

    const bundle = buildSourceBundle(assets);
    const ids = bundle.assets.map((a) => a.id);

    expect(ids).toEqual(["first", "second", "third"]);
  });
});

// ---------------------------------------------------------------------------
// Tests: Env variable parsing and clamping
// ---------------------------------------------------------------------------

describe("buildSourceBundle — env parsing and clamping", () => {
  it("uses default 750 000 when env var is not set", async () => {
    vi.resetModules();
    vi.stubEnv("PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE", "");

    const { buildSourceBundle: dynamicBuildSourceBundle } =
      await import("@/server/services/brief-pipeline");

    const body = "A".repeat(800_000);
    const bundle = dynamicBuildSourceBundle([makeTextAsset("a1", body)]);

    expect(bundle.assets[0]!.text.length).toBe(750_000);
  });

  it("uses default 750 000 when env var is a non-numeric string (NaN fallback)", async () => {
    vi.resetModules();
    vi.stubEnv("PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE", "invalid_string");

    const { buildSourceBundle: dynamicBuildSourceBundle } =
      await import("@/server/services/brief-pipeline");

    const body = "A".repeat(800_000);
    const bundle = dynamicBuildSourceBundle([makeTextAsset("a1", body)]);

    // Fallback to 750 000 if parseInt returns NaN
    expect(bundle.assets[0]!.text.length).toBe(750_000);
  });

  it("clamps the value to a minimum of 1 000 when env var is too small", async () => {
    vi.resetModules();
    vi.stubEnv("PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE", "50"); // too small

    const { buildSourceBundle: dynamicBuildSourceBundle } =
      await import("@/server/services/brief-pipeline");

    const body = "A".repeat(2_000);
    const bundle = dynamicBuildSourceBundle([makeTextAsset("a1", body)]);

    // Clamped to 1000
    expect(bundle.assets[0]!.text.length).toBe(1_000);
  });

  it("honors a valid env override", async () => {
    vi.resetModules();
    vi.stubEnv("PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE", "500000");

    const { buildSourceBundle: dynamicBuildSourceBundle } =
      await import("@/server/services/brief-pipeline");

    const body = "A".repeat(800_000);
    const bundle = dynamicBuildSourceBundle([makeTextAsset("a1", body)]);

    expect(bundle.assets[0]!.text.length).toBe(500_000);
  });
});
