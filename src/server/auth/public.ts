type PublicMutationAction = "comment" | "answer" | "confirm";

type PublicMutationRateLimitConfig = {
  limit: number;
  windowMs: number;
};

type PublicRateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, PublicRateLimitEntry>();

const RATE_LIMIT_CONFIG: Record<PublicMutationAction, PublicMutationRateLimitConfig> = {
  comment: { limit: 10, windowMs: 10 * 60 * 1000 },
  answer: { limit: 10, windowMs: 10 * 60 * 1000 },
  confirm: { limit: 3, windowMs: 10 * 60 * 1000 },
};

export class PublicRateLimitError extends Error {
  readonly status = 429;

  constructor(readonly retryAfterSeconds: number) {
    super("Too many public review requests.");
    this.name = "PublicRateLimitError";
  }
}

export function getRequestClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function assertPublicMutationRateLimit(input: {
  action: PublicMutationAction;
  ip: string;
  shareToken: string;
}) {
  const { action, ip, shareToken } = input;
  const config = RATE_LIMIT_CONFIG[action];
  const now = Date.now();
  const key = `${action}:${shareToken}:${ip}`;
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return;
  }

  if (current.count >= config.limit) {
    throw new PublicRateLimitError(
      Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    );
  }

  current.count += 1;
  rateLimitStore.set(key, current);
}
