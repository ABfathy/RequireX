import { describe, expect, it } from "vitest";

import {
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  detectSourceType,
  isAcceptedAudioType,
  isAcceptedImageType,
  isAcceptedPdfType,
  isAcceptedSourceMimeType,
  TEXT_MAX_CHARS,
  TextAssetInputSchema,
  UpdateLabelInputSchema,
} from "@/server/validators/assets";

describe("detectSourceType", () => {
  it.each(ACCEPTED_IMAGE_TYPES)("maps %s to IMAGE", (mime: string) => {
    expect(detectSourceType(mime)).toBe("IMAGE");
  });

  it.each(ACCEPTED_AUDIO_TYPES)("maps %s to AUDIO", (mime: string) => {
    expect(detectSourceType(mime)).toBe("AUDIO");
  });

  it.each(ACCEPTED_PDF_TYPES)("maps %s to PDF", (mime: string) => {
    expect(detectSourceType(mime)).toBe("PDF");
  });

  it("throws on unknown MIME type", () => {
    expect(() => detectSourceType("application/zip")).toThrow(
      "Unsupported MIME type: application/zip",
    );
  });

  it("throws on empty string", () => {
    expect(() => detectSourceType("")).toThrow("Unsupported MIME type:");
  });
});

describe("accepted MIME type helpers", () => {
  it.each(ACCEPTED_IMAGE_TYPES)("accepts image type %s", (mime: string) => {
    expect(isAcceptedImageType(mime)).toBe(true);
    expect(isAcceptedSourceMimeType(mime)).toBe(true);
  });

  it.each(ACCEPTED_AUDIO_TYPES)("accepts audio type %s", (mime: string) => {
    expect(isAcceptedAudioType(mime)).toBe(true);
    expect(isAcceptedSourceMimeType(mime)).toBe(true);
  });

  it.each(ACCEPTED_PDF_TYPES)("accepts pdf type %s", (mime: string) => {
    expect(isAcceptedPdfType(mime)).toBe(true);
    expect(isAcceptedSourceMimeType(mime)).toBe(true);
  });

  it("rejects unsupported types", () => {
    expect(isAcceptedImageType("application/zip")).toBe(false);
    expect(isAcceptedAudioType("application/zip")).toBe(false);
    expect(isAcceptedPdfType("application/zip")).toBe(false);
    expect(isAcceptedSourceMimeType("application/zip")).toBe(false);
  });
});

describe("TextAssetInputSchema", () => {
  it("accepts valid text", () => {
    const result = TextAssetInputSchema.safeParse({ textContent: "hello" });
    expect(result.success).toBe(true);
  });

  it("accepts text with optional displayLabel", () => {
    const result = TextAssetInputSchema.safeParse({
      textContent: "hello",
      displayLabel: "My notes",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty textContent", () => {
    const result = TextAssetInputSchema.safeParse({ textContent: "" });
    expect(result.success).toBe(false);
  });

  it("rejects textContent over limit", () => {
    const result = TextAssetInputSchema.safeParse({
      textContent: "x".repeat(TEXT_MAX_CHARS + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects displayLabel over 200 chars", () => {
    const result = TextAssetInputSchema.safeParse({
      textContent: "hi",
      displayLabel: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateLabelInputSchema", () => {
  it("accepts valid label", () => {
    const result = UpdateLabelInputSchema.safeParse({ displayLabel: "Notes" });
    expect(result.success).toBe(true);
  });

  it("rejects empty displayLabel", () => {
    const result = UpdateLabelInputSchema.safeParse({ displayLabel: "" });
    expect(result.success).toBe(false);
  });

  it("rejects displayLabel over 200 chars", () => {
    const result = UpdateLabelInputSchema.safeParse({
      displayLabel: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});
