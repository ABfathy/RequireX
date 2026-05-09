import {
  createRouteHandler,
  createUploadthing,
  type FileRouter,
} from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";

import { requireInternalAuth } from "@/server/auth";
import { persistFileAsset } from "@/server/services/assets";
import {
  detectSourceType,
  isAcceptedAudioType,
  isAcceptedSourceMimeType,
} from "@/server/validators/assets";

const f = createUploadthing();

const sessionInput = z.object({
  sessionId: z.string().min(1),
  displayLabel: z.string().max(200).optional(),
  folderLabel: z.string().max(200).optional(),
});

function assertAcceptedFiles(
  routeSlug: string,
  files: ReadonlyArray<{ name: string; type: string }>,
  isAcceptedMimeType: (mimeType: string) => boolean,
) {
  const unsupportedFile = files.find((file) => !isAcceptedMimeType(file.type));

  if (unsupportedFile) {
    throw new UploadThingError(
      `${routeSlug} does not accept ${unsupportedFile.type} (${unsupportedFile.name})`,
    );
  }
}

export const uploadRouter = {
  imageUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 10 },
  })
    .input(sessionInput)
    .middleware(async ({ input }) => {
      await requireInternalAuth();
      return {
        sessionId: input.sessionId,
        displayLabel: input.displayLabel,
        folderLabel: input.folderLabel,
        routeSlug: "imageUploader",
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await persistFileAsset({
        sessionId: metadata.sessionId,
        sourceType: "IMAGE",
        utKey: file.key,
        ufsUrl: file.ufsUrl,
        mimeType: file.type,
        fileSizeBytes: file.size,
        originalFileName: file.name,
        displayLabel: metadata.displayLabel,
        routeSlug: metadata.routeSlug,
        folderLabel: metadata.folderLabel,
      });
    }),

  // UploadThing v7 has no "audio" category — blob accepts all binary files.
  // WS6: set accept="audio/*" on the file input to enforce client-side.
  audioUploader: f({
    blob: { maxFileSize: "128MB", maxFileCount: 1 },
  })
    .input(sessionInput)
    .middleware(async ({ input, files }) => {
      await requireInternalAuth();
      assertAcceptedFiles("audioUploader", files, isAcceptedAudioType);
      return {
        sessionId: input.sessionId,
        displayLabel: input.displayLabel,
        folderLabel: input.folderLabel,
        routeSlug: "audioUploader",
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await persistFileAsset({
        sessionId: metadata.sessionId,
        sourceType: "AUDIO",
        utKey: file.key,
        ufsUrl: file.ufsUrl,
        mimeType: file.type,
        fileSizeBytes: file.size,
        originalFileName: file.name,
        displayLabel: metadata.displayLabel,
        routeSlug: metadata.routeSlug,
        folderLabel: metadata.folderLabel,
      });
    }),

  pdfUploader: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
  })
    .input(sessionInput)
    .middleware(async ({ input }) => {
      await requireInternalAuth();
      return {
        sessionId: input.sessionId,
        displayLabel: input.displayLabel,
        folderLabel: input.folderLabel,
        routeSlug: "pdfUploader",
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await persistFileAsset({
        sessionId: metadata.sessionId,
        sourceType: "PDF",
        utKey: file.key,
        ufsUrl: file.ufsUrl,
        mimeType: file.type,
        fileSizeBytes: file.size,
        originalFileName: file.name,
        displayLabel: metadata.displayLabel,
        routeSlug: metadata.routeSlug,
        folderLabel: metadata.folderLabel,
      });
    }),

  // blob handles audio — same caveat as audioUploader. detectSourceType guards non-audio.
  mixedUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 10 },
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
    blob: { maxFileSize: "128MB", maxFileCount: 1 },
  })
    .input(sessionInput)
    .middleware(async ({ input, files }) => {
      await requireInternalAuth();
      assertAcceptedFiles("mixedUploader", files, isAcceptedSourceMimeType);
      return {
        sessionId: input.sessionId,
        displayLabel: input.displayLabel,
        folderLabel: input.folderLabel,
        routeSlug: "mixedUploader",
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const sourceType = detectSourceType(file.type);
      await persistFileAsset({
        sessionId: metadata.sessionId,
        sourceType,
        utKey: file.key,
        ufsUrl: file.ufsUrl,
        mimeType: file.type,
        fileSizeBytes: file.size,
        originalFileName: file.name,
        displayLabel: metadata.displayLabel,
        routeSlug: metadata.routeSlug,
        folderLabel: metadata.folderLabel,
      });
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;

export const handlers = createRouteHandler({ router: uploadRouter });
