export const INNGEST_EVENTS = {
  BRIEF_GENERATION_REQUESTED: "brief/generation.requested",
  BRIEF_REGENERATION_REQUESTED: "brief/regeneration.requested",
} as const;

export type BriefGenerationRequestedData = {
  jobId: string;
  sessionId: string;
  requestedBy: string;
  requestedAt: string;
};

export type BriefRegenerationRequestedData = BriefGenerationRequestedData & {
  sourceSnapshotId: string;
};

export type BriefGenerationRequestedEvent = {
  name: typeof INNGEST_EVENTS.BRIEF_GENERATION_REQUESTED;
  data: BriefGenerationRequestedData;
};

export type BriefRegenerationRequestedEvent = {
  name: typeof INNGEST_EVENTS.BRIEF_REGENERATION_REQUESTED;
  data: BriefRegenerationRequestedData;
};
