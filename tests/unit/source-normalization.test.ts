import { describe, expect, it } from "vitest";

import { normalizeTextToChunks } from "@/server/services/source-normalization";

describe("normalizeTextToChunks", () => {
  it("creates ordered text chunks with paragraph locators", () => {
    const chunks = normalizeTextToChunks(
      "First paragraph.\n\nSecond paragraph.",
    );

    expect(chunks).toEqual([
      expect.objectContaining({
        kind: "TEXT_BLOCK",
        orderIndex: 0,
        text: "First paragraph.\n\nSecond paragraph.",
        locator: {
          kind: "text-range",
          paragraphStart: 0,
          paragraphEnd: 1,
        },
        chunkLabel: "Text 1",
      }),
    ]);
  });

  it("splits long content into multiple chunks", () => {
    const chunks = normalizeTextToChunks(
      ["a ".repeat(1_000), "b ".repeat(1_000), "c ".repeat(1_000)].join("\n\n"),
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.orderIndex)).toEqual(
      chunks.map((_, index) => index),
    );
  });
});
