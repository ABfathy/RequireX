import { SourceType } from "@prisma/client";
import { z } from "zod";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
] as const;

export const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/x-m4a",
] as const;

export const ACCEPTED_PDF_TYPES = ["application/pdf"] as const;

export const TEXT_MAX_CHARS = 500_000;

export const TextAssetInputSchema = z.object({
  textContent: z.string().min(1).max(TEXT_MAX_CHARS),
  displayLabel: z.string().max(200).optional(),
});

export const UpdateLabelInputSchema = z.object({
  displayLabel: z.string().min(1).max(200),
});

export type TextAssetInput = z.infer<typeof TextAssetInputSchema>;
export type UpdateLabelInput = z.infer<typeof UpdateLabelInputSchema>;

export function isAcceptedImageType(mimeType: string) {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export function isAcceptedAudioType(mimeType: string) {
  return (ACCEPTED_AUDIO_TYPES as readonly string[]).includes(mimeType);
}

export function isAcceptedPdfType(mimeType: string) {
  return (ACCEPTED_PDF_TYPES as readonly string[]).includes(mimeType);
}

export function isAcceptedSourceMimeType(mimeType: string) {
  return (
    isAcceptedImageType(mimeType) ||
    isAcceptedAudioType(mimeType) ||
    isAcceptedPdfType(mimeType)
  );
}

export function detectSourceType(mimeType: string): SourceType {
  if (isAcceptedImageType(mimeType)) {
    return "IMAGE";
  }
  if (isAcceptedAudioType(mimeType)) {
    return "AUDIO";
  }
  if (isAcceptedPdfType(mimeType)) {
    return "PDF";
  }
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}
