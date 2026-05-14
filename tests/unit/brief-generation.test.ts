import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    processingJob: {
      update: vi.fn(),
    },
    sourceAsset: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

vi.mock("@/server/services/source-processing", () => ({
  loadProcessableFileSources: vi.fn(),
  PDF_TEXT_PARSER_VERSION: "built-in-pdf-text-v2",
  processSessionFileSources: vi.fn(),
}));

import { inngest } from "@/server/inngest/client";
import { processSessionFileSourcesWithInngest } from "@/server/services/brief-generation";
import {
  loadProcessableFileSources,
  processSessionFileSources,
} from "@/server/services/source-processing";

const mockInngestSend = inngest.send as unknown as ReturnType<typeof vi.fn>;
const mockLoadProcessableFileSources =
  loadProcessableFileSources as unknown as ReturnType<typeof vi.fn>;
const mockProcessSessionFileSources =
  processSessionFileSources as unknown as ReturnType<typeof vi.fn>;

describe("processSessionFileSourcesWithInngest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to local file processing when Inngest dispatch fetch fails", async () => {
    const sources = [
      {
        id: "asset_1",
        sessionId: "session_1",
        sourceType: "PDF",
      },
    ];
    mockLoadProcessableFileSources.mockResolvedValueOnce(sources);
    mockInngestSend.mockRejectedValueOnce(new TypeError("fetch failed"));
    mockProcessSessionFileSources.mockResolvedValueOnce([
      {
        assetId: "asset_1",
        sourceType: "PDF",
        status: "processed",
      },
    ]);

    const result = await processSessionFileSourcesWithInngest({
      sessionId: "session_1",
      requestedBy: "user_1",
      requestedAt: "2026-05-14T12:00:00.000Z",
      jobId: "job_1",
    });

    expect(result).toBe(sources);
    expect(mockInngestSend).toHaveBeenCalledTimes(1);
    expect(mockProcessSessionFileSources).toHaveBeenCalledWith({
      sessionId: "session_1",
      requestedBy: "user_1",
    });
  });
});
