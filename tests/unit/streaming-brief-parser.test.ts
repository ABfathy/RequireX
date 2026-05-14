import { describe, expect, it } from "vitest";

import { StreamingBriefParser } from "@/lib/streaming-brief-parser";

describe("StreamingBriefParser", () => {
  it("renders finalized document sections while tokens stream", () => {
    const parser = new StreamingBriefParser();

    parser.feed(
      JSON.stringify({
        projectOverview: [
          {
            text: "The platform turns intake sources into requirements.",
            confidence: "HIGH",
            evidence: [],
          },
        ],
        functionalRequirements: [
          {
            text: "Users can create a finalized requirements document.",
            confidence: "HIGH",
            evidence: [],
          },
        ],
      }),
    );

    expect(parser.getSnapshot()).toEqual([
      { lineNum: 1, type: "h2", text: "Project Overview" },
      {
        lineNum: 2,
        type: "body",
        text: "The platform turns intake sources into requirements.",
        reqType: "claim",
        small: false,
      },
      { lineNum: 0, type: "blank" },
      { lineNum: 3, type: "h2", text: "Functional Requirements" },
      {
        lineNum: 4,
        type: "body",
        text: "Users can create a finalized requirements document.",
        reqType: "claim",
        small: false,
      },
    ]);
  });
});
