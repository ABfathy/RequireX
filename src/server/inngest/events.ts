export const INNGEST_EVENTS = {
  TEXT_BRIEF_REQUESTED: "brief/text.requested",
} as const;

export const TEXT_BRIEF_SYSTEM_PROMPT =
  "You are RequireX. Turn messy client intake text into a concise, evidence-backed project brief with summary claims, goals, ambiguities, and follow-up questions.";

export type TextBriefRequestedData = {
  assetId: string;
  sessionId: string;
  requestedBy: string;
  requestedAt: string;
  systemPrompt: string;
  textContent: string;
};

export type TextBriefRequestedEvent = {
  name: typeof INNGEST_EVENTS.TEXT_BRIEF_REQUESTED;
  data: TextBriefRequestedData;
};
