export const INNGEST_EVENTS = {
  PDF_SOURCE_PROCESSING_REQUESTED: "source/pdf.process.requested",
  AUDIO_SOURCE_PROCESSING_REQUESTED: "source/audio.process.requested",
} as const;

export type SourceProcessingRequestedData = {
  assetId: string;
  sessionId: string;
  requestedBy: string;
  requestedAt: string;
  jobId?: string;
};

export type PdfSourceProcessingRequestedEvent = {
  name: typeof INNGEST_EVENTS.PDF_SOURCE_PROCESSING_REQUESTED;
  data: SourceProcessingRequestedData;
};

export type AudioSourceProcessingRequestedEvent = {
  name: typeof INNGEST_EVENTS.AUDIO_SOURCE_PROCESSING_REQUESTED;
  data: SourceProcessingRequestedData;
};
