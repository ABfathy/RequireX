import { describe, expect, it, vi } from "vitest";

import {
  AssetDeleteForbiddenError,
  AssetNotFoundError,
  deleteAsset,
  getSessionAssets,
  persistFileAsset,
  persistTextAsset,
} from "@/server/services/assets";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sourceAsset: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  sourceAsset: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("persistTextAsset", () => {
  it("creates asset with TEXT sourceType and UPLOADED status", async () => {
    const now = new Date();
    mockPrisma.sourceAsset.create.mockResolvedValueOnce({
      id: "asset_1",
      sourceType: "TEXT",
      status: "UPLOADED",
      sessionId: "session_1",
      createdAt: now,
    });

    const result = await persistTextAsset({
      sessionId: "session_1",
      textContent: "Hello world",
    });

    expect(mockPrisma.sourceAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceType: "TEXT",
        status: "UPLOADED",
        sessionId: "session_1",
        mimeType: "text/plain",
        textContent: "Hello world",
      }),
    });
    expect(result.sourceType).toBe("TEXT");
    expect(result.status).toBe("UPLOADED");
  });

  it("uses provided displayLabel", async () => {
    mockPrisma.sourceAsset.create.mockResolvedValueOnce({ id: "a" });

    await persistTextAsset({
      sessionId: "s1",
      textContent: "hi",
      displayLabel: "My notes",
    });

    expect(mockPrisma.sourceAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ displayLabel: "My notes" }),
    });
  });

  it("falls back to 'Pasted text' when displayLabel omitted", async () => {
    mockPrisma.sourceAsset.create.mockResolvedValueOnce({ id: "a" });

    await persistTextAsset({ sessionId: "s1", textContent: "hi" });

    expect(mockPrisma.sourceAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ displayLabel: "Pasted text" }),
    });
  });

  it("throws when textContent exceeds 500_000 chars", async () => {
    await expect(
      persistTextAsset({
        sessionId: "s1",
        textContent: "x".repeat(500_001),
      }),
    ).rejects.toThrow("500000");
  });
});

describe("persistFileAsset", () => {
  it("maps upload metadata into SourceAsset columns", async () => {
    mockPrisma.sourceAsset.create.mockResolvedValueOnce({ id: "asset_file_1" });

    await persistFileAsset({
      sessionId: "session_1",
      sourceType: "PDF",
      utKey: "ut_key_1",
      ufsUrl: "https://utfs.io/f/ut_key_1",
      mimeType: "application/pdf",
      fileSizeBytes: 2048,
      originalFileName: "scope.pdf",
      displayLabel: "Client scope",
      routeSlug: "pdfUploader",
      folderLabel: "kickoff-batch",
    });

    expect(mockPrisma.sourceAsset.create).toHaveBeenCalledWith({
      data: {
        sessionId: "session_1",
        sourceType: "PDF",
        status: "UPLOADED",
        displayLabel: "Client scope",
        originalFileName: "scope.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 2048,
        utKey: "ut_key_1",
        ufsUrl: "https://utfs.io/f/ut_key_1",
        appUrl: "https://utfs.io/f/ut_key_1",
        routeSlug: "pdfUploader",
        folderLabel: "kickoff-batch",
      },
    });
  });
});

describe("getSessionAssets", () => {
  it("returns assets ordered by createdAt asc", async () => {
    const assets = [{ id: "a1" }, { id: "a2" }];
    mockPrisma.sourceAsset.findMany.mockResolvedValueOnce(assets);

    const result = await getSessionAssets("session_1");

    expect(mockPrisma.sourceAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: "session_1" },
        orderBy: { createdAt: "asc" },
      }),
    );
    expect(result).toEqual(assets);
  });
});

describe("deleteAsset", () => {
  it("deletes asset with UPLOADED status", async () => {
    mockPrisma.sourceAsset.findUnique.mockResolvedValueOnce({
      id: "a1",
      status: "UPLOADED",
    });
    mockPrisma.sourceAsset.delete.mockResolvedValueOnce({ id: "a1" });

    await deleteAsset("a1");

    expect(mockPrisma.sourceAsset.delete).toHaveBeenCalledWith({
      where: { id: "a1" },
    });
  });

  it("deletes asset with FAILED status", async () => {
    mockPrisma.sourceAsset.findUnique.mockResolvedValueOnce({
      id: "a1",
      status: "FAILED",
    });
    mockPrisma.sourceAsset.delete.mockResolvedValueOnce({ id: "a1" });

    await deleteAsset("a1");

    expect(mockPrisma.sourceAsset.delete).toHaveBeenCalled();
  });

  it("throws AssetDeleteForbiddenError when status is PROCESSING", async () => {
    mockPrisma.sourceAsset.findUnique.mockResolvedValueOnce({
      id: "a1",
      status: "PROCESSING",
    });

    await expect(deleteAsset("a1")).rejects.toBeInstanceOf(
      AssetDeleteForbiddenError,
    );
  });

  it("throws AssetDeleteForbiddenError when status is QUEUED", async () => {
    mockPrisma.sourceAsset.findUnique.mockResolvedValueOnce({
      id: "a1",
      status: "QUEUED",
    });

    await expect(deleteAsset("a1")).rejects.toBeInstanceOf(
      AssetDeleteForbiddenError,
    );
  });

  it("throws AssetNotFoundError when asset does not exist", async () => {
    mockPrisma.sourceAsset.findUnique.mockResolvedValueOnce(null);

    await expect(deleteAsset("missing")).rejects.toBeInstanceOf(
      AssetNotFoundError,
    );
  });
});
