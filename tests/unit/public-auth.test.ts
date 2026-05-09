import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertPublicMutationRateLimit,
  getRequestClientIp,
  PublicRateLimitError,
} from "@/server/auth/public";

let tokenCounter = 0;

function nextShareToken() {
  tokenCounter += 1;
  return `share-token-${tokenCounter}`;
}

describe("getRequestClientIp", () => {
  it("uses the first forwarded IP when present", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.1, 10.0.0.1",
    });

    expect(getRequestClientIp(headers)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({
      "x-real-ip": "198.51.100.10",
    });

    expect(getRequestClientIp(headers)).toBe("198.51.100.10");
  });

  it("returns unknown when no IP headers exist", () => {
    expect(getRequestClientIp(new Headers())).toBe("unknown");
  });
});

describe("assertPublicMutationRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the configured comment limit", () => {
    const shareToken = nextShareToken();

    for (let index = 0; index < 10; index += 1) {
      expect(() =>
        assertPublicMutationRateLimit({
          action: "comment",
          ip: "203.0.113.10",
          shareToken,
        }),
      ).not.toThrow();
    }
  });

  it("throws after the configured comment limit is exceeded", () => {
    const shareToken = nextShareToken();

    for (let index = 0; index < 10; index += 1) {
      assertPublicMutationRateLimit({
        action: "comment",
        ip: "203.0.113.11",
        shareToken,
      });
    }

    expect(() =>
      assertPublicMutationRateLimit({
        action: "comment",
        ip: "203.0.113.11",
        shareToken,
      }),
    ).toThrow(PublicRateLimitError);
  });

  it("tracks confirm limits independently from comments", () => {
    const shareToken = nextShareToken();

    for (let index = 0; index < 3; index += 1) {
      assertPublicMutationRateLimit({
        action: "confirm",
        ip: "203.0.113.12",
        shareToken,
      });
    }

    expect(() =>
      assertPublicMutationRateLimit({
        action: "confirm",
        ip: "203.0.113.12",
        shareToken,
      }),
    ).toThrow(PublicRateLimitError);

    expect(() =>
      assertPublicMutationRateLimit({
        action: "comment",
        ip: "203.0.113.12",
        shareToken,
      }),
    ).not.toThrow();
  });

  it("resets the window after enough time passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T19:15:00.000Z"));

    const shareToken = nextShareToken();

    for (let index = 0; index < 10; index += 1) {
      assertPublicMutationRateLimit({
        action: "answer",
        ip: "203.0.113.13",
        shareToken,
      });
    }

    expect(() =>
      assertPublicMutationRateLimit({
        action: "answer",
        ip: "203.0.113.13",
        shareToken,
      }),
    ).toThrow(PublicRateLimitError);

    vi.advanceTimersByTime(10 * 60 * 1000 + 1);

    expect(() =>
      assertPublicMutationRateLimit({
        action: "answer",
        ip: "203.0.113.13",
        shareToken,
      }),
    ).not.toThrow();
  });
});
