import { describe, expect, it } from "vitest";

import { diffLines } from "@/lib/line-diff";

describe("diffLines", () => {
  it("marks identical lines as unchanged", () => {
    expect(diffLines(["a", "b"], ["a", "b"])).toEqual([
      { kind: "unchanged", text: "a", oldLineNumber: 1, newLineNumber: 1 },
      { kind: "unchanged", text: "b", oldLineNumber: 2, newLineNumber: 2 },
    ]);
  });

  it("marks lines that only exist in the newer version as added", () => {
    expect(diffLines(["a", "c"], ["a", "b", "c"])).toEqual([
      { kind: "unchanged", text: "a", oldLineNumber: 1, newLineNumber: 1 },
      { kind: "added", text: "b", oldLineNumber: null, newLineNumber: 2 },
      { kind: "unchanged", text: "c", oldLineNumber: 2, newLineNumber: 3 },
    ]);
  });

  it("marks lines that only exist in the older version as removed", () => {
    expect(diffLines(["a", "b", "c"], ["a", "c"])).toEqual([
      { kind: "unchanged", text: "a", oldLineNumber: 1, newLineNumber: 1 },
      { kind: "removed", text: "b", oldLineNumber: 2, newLineNumber: null },
      { kind: "unchanged", text: "c", oldLineNumber: 3, newLineNumber: 2 },
    ]);
  });

  it("handles mixed additions and removals", () => {
    expect(
      diffLines(["intro", "old", "keep"], ["intro", "new", "keep"]),
    ).toEqual([
      { kind: "unchanged", text: "intro", oldLineNumber: 1, newLineNumber: 1 },
      { kind: "removed", text: "old", oldLineNumber: 2, newLineNumber: null },
      { kind: "added", text: "new", oldLineNumber: null, newLineNumber: 2 },
      { kind: "unchanged", text: "keep", oldLineNumber: 3, newLineNumber: 3 },
    ]);
  });

  it("handles empty old content", () => {
    expect(diffLines([], ["new"])).toEqual([
      { kind: "added", text: "new", oldLineNumber: null, newLineNumber: 1 },
    ]);
  });

  it("handles empty new content", () => {
    expect(diffLines(["old"], [])).toEqual([
      { kind: "removed", text: "old", oldLineNumber: 1, newLineNumber: null },
    ]);
  });
});
