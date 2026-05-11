export class BriefGenerationRequestError extends Error {
  constructor(
    message: string,
    readonly status = 410,
    readonly code = "LEGACY_GENERATION_FLOW_DISABLED",
  ) {
    super(message);
    this.name = "BriefGenerationRequestError";
  }
}

export async function requestBriefGeneration(): Promise<never> {
  throw new BriefGenerationRequestError(
    "The legacy generation endpoint is disabled. Submit text through the Sources panel to run the single text brief Inngest event.",
  );
}

export async function requestBriefRegeneration(): Promise<never> {
  throw new BriefGenerationRequestError(
    "The legacy regeneration endpoint is disabled. Submit text through the Sources panel to run the single text brief Inngest event.",
  );
}
