import { prisma } from "@/lib/prisma";
import { TEXT_MAX_CHARS } from "@/server/validators/assets";

import {
  SourceAssetStatus,
  SourceType,
} from "../../../generated/prisma/client";

export class AssetNotFoundError extends Error {
  constructor(assetId: string) {
    super(`SourceAsset not found: ${assetId}`);
    this.name = "AssetNotFoundError";
  }
}

export class AssetDeleteForbiddenError extends Error {
  constructor(status: SourceAssetStatus) {
    super(`Cannot delete asset with status: ${status}`);
    this.name = "AssetDeleteForbiddenError";
  }
}

type PersistFileAssetParams = {
  sessionId: string;
  sourceType: SourceType;
  utKey: string;
  ufsUrl: string;
  appUrl?: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFileName: string;
  displayLabel?: string;
  routeSlug?: string;
  folderLabel?: string;
};

export async function persistFileAsset(params: PersistFileAssetParams) {
  return prisma.sourceAsset.create({
    data: {
      sessionId: params.sessionId,
      sourceType: params.sourceType,
      status: "UPLOADED",
      displayLabel: params.displayLabel ?? params.originalFileName,
      originalFileName: params.originalFileName,
      mimeType: params.mimeType,
      fileSizeBytes: params.fileSizeBytes,
      utKey: params.utKey,
      ufsUrl: params.ufsUrl,
      appUrl: params.appUrl ?? params.ufsUrl,
      routeSlug: params.routeSlug,
      folderLabel: params.folderLabel,
    },
  });
}

type PersistTextAssetParams = {
  sessionId: string;
  textContent: string;
  displayLabel?: string;
};

export async function persistTextAsset(params: PersistTextAssetParams) {
  if (params.textContent.length > TEXT_MAX_CHARS) {
    throw new Error(
      `Text content exceeds maximum of ${TEXT_MAX_CHARS} characters`,
    );
  }

  return prisma.sourceAsset.create({
    data: {
      sessionId: params.sessionId,
      sourceType: "TEXT",
      status: "UPLOADED",
      displayLabel: params.displayLabel ?? "Pasted text",
      mimeType: "text/plain",
      textContent: params.textContent,
      providerMetadata: { origin: "pasted-text" },
    },
  });
}

export async function getSessionAssets(sessionId: string) {
  return prisma.sourceAsset.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      sourceType: true,
      status: true,
      displayLabel: true,
      originalFileName: true,
      mimeType: true,
      fileSizeBytes: true,
      errorMessage: true,
      createdAt: true,
    },
  });
}

const DELETABLE_STATUSES: SourceAssetStatus[] = ["UPLOADED", "FAILED"];

export async function deleteAsset(assetId: string) {
  const asset = await prisma.sourceAsset.findUnique({
    where: { id: assetId },
    select: { id: true, status: true },
  });

  if (!asset) {
    throw new AssetNotFoundError(assetId);
  }

  if (!DELETABLE_STATUSES.includes(asset.status)) {
    throw new AssetDeleteForbiddenError(asset.status);
  }

  await prisma.sourceAsset.delete({ where: { id: assetId } });
}

export async function updateAssetLabel(assetId: string, displayLabel: string) {
  const asset = await prisma.sourceAsset.findUnique({
    where: { id: assetId },
    select: { id: true },
  });

  if (!asset) {
    throw new AssetNotFoundError(assetId);
  }

  return prisma.sourceAsset.update({
    where: { id: assetId },
    data: { displayLabel },
  });
}
