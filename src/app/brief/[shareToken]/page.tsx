"use client";

import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";

import { ClientDoc } from "@/components/brief/client-doc";
import { ClientHeader } from "@/components/brief/client-header";
import type { Requirement } from "@/components/brief/requirement-card";
import {
  type Revision,
  RevisionPanel,
} from "@/components/brief/revision-panel";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";
import type { BriefCommentSection } from "../../../../generated/prisma/client";

/* ── Mock data (matches design/client.html) ─────────── */

const MOCK_REQUIREMENTS: Requirement[] = [
  {
    id: "REQ-0140",
    section: "Functional requirements",
    commentSection: "SUMMARY",
    title: "Idempotency key required on all POST /payments",
    body: "Every POST to /payments MUST include an Idempotency-Key header. Duplicate keys within a 24-hour window return the original response without re-executing the side effect.",
    status: "approved",
    tags: ["functional", "api"],
  },
  {
    id: "REQ-0141",
    section: "Functional requirements",
    commentSection: "SUMMARY",
    title: "Failed payment retries follow exponential backoff",
    body: "Retries on transient gateway errors (5xx, network) follow exponential backoff with full jitter, capped at 30 s and 6 attempts.",
    status: "approved",
    tags: ["functional", "retry"],
  },
  {
    id: "REQ-0142",
    section: "Performance requirements",
    commentSection: "GOALS",
    title: "Payment latency under 200 ms p99",
    body: "The payments handler must respond within 200 ms at the 99th percentile under nominal load. Breaches escalate to the on-call within one minute.",
    status: "approved",
    tags: ["non-functional", "slo"],
    question:
      "What is the acceptable p99 latency during planned maintenance windows?",
  },
  {
    id: "REQ-0143",
    section: "Compliance requirements",
    commentSection: "GOALS",
    title: "Audit log retains 7 years",
    body: "All payment events are persisted to the audit log for 7 years (regulatory). Deletion is denied for retention-locked rows.",
    status: "in-review",
    tags: ["compliance", "audit"],
    question:
      "Please confirm the 7-year retention period meets your regulatory requirements.",
  },
  {
    id: "REQ-0144",
    section: "Operational requirements",
    commentSection: "AMBIGUITIES",
    title: "Settlement reconciliation runs daily at 03:00 UTC",
    body: "A nightly job reconciles processor statements against the ledger. Discrepancies above $0.01 raise a Sev-3 alert.",
    status: "draft",
    tags: ["ops", "functional"],
  },
  {
    id: "REQ-0145",
    section: "Security requirements",
    commentSection: "AMBIGUITIES",
    title: "PII fields encrypted at rest with KMS-managed keys",
    body: "Cardholder name and last-4 are encrypted using customer-managed KMS keys. Logs MUST scrub PAN entirely.",
    status: "conflict",
    tags: ["security", "compliance"],
  },
];

const MOCK_REVISIONS: Revision[] = [
  {
    id: "r1",
    label: "v2.1.0",
    time: "2m ago",
    msg: "Approved REQ-0140, REQ-0141, REQ-0142",
    current: true,
  },
  {
    id: "r2",
    label: "v2.0.1",
    time: "1h ago",
    msg: "Added REQ-0144 from kickoff notes",
  },
  {
    id: "r3",
    label: "v2.0.0",
    time: "3h ago",
    msg: "Initial draft",
  },
];

/* ── HTTP error message mapping ────────────────────── */

function mapApiError(status: number, fallback?: string): string {
  switch (status) {
    case 404:
      return "This review link is invalid or has expired.";
    case 409:
      return "This brief is no longer open for review.";
    case 429:
      return "Too many attempts — please wait a moment and try again.";
    default:
      return fallback ?? "Something went wrong. Please try again.";
  }
}

/* ── Client Shell ──────────────────────────────────── */

export default function BriefClientShell() {
  const params = useParams<{ shareToken: string }>();
  const shareToken = params?.shareToken ?? "";

  const [revOpen, setRevOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const theme: "dark" | "light" | null = mounted
    ? resolvedTheme === "light"
      ? "light"
      : "dark"
    : null;
  const toggleTheme = () =>
    setTheme((theme ?? "dark") === "dark" ? "light" : "dark");

  const needsInputCount = MOCK_REQUIREMENTS.filter((r) => r.question).length;

  /**
   * Page-level comment submit helper.
   * Owns the fetch call and shareToken.
   * Throws a human-readable string on any error so CommentThread can display it inline.
   */
  const submitComment = async (
    target: {
      section: BriefCommentSection;
      claimId?: string;
      questionId?: string;
    },
    body: string,
  ): Promise<void> => {
    const payload: Record<string, unknown> = {
      section: target.section,
      // Use CLAIM/QUESTION anchor only when we have a real UUID target;
      // otherwise fall back to SECTION for mock/section-level comments.
      anchorType: target.claimId
        ? "CLAIM"
        : target.questionId
          ? "QUESTION"
          : "SECTION",
      body,
    };

    if (target.claimId) payload.claimId = target.claimId;
    if (target.questionId) payload.questionId = target.questionId;

    const res = await fetch(
      `/api/public/briefs/${shareToken}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      let serverMessage: string | undefined;
      try {
        const data = await res.json();
        serverMessage = typeof data?.error === "string" ? data.error : undefined;
      } catch {
        // ignore parse errors
      }
      throw mapApiError(res.status, serverMessage);
    }
  };

  /**
   * Page-level answer submit helper.
   * Owns the fetch call to /answers and shareToken.
   * Throws a human-readable string on error so QuestionBlock can display it inline.
   */
  const submitAnswer = async (
    questionId: string,
    body: string,
  ): Promise<void> => {
    const res = await fetch(
      `/api/public/briefs/${shareToken}/answers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, body }),
      },
    );

    if (!res.ok) {
      let serverMessage: string | undefined;
      try {
        const data = await res.json();
        serverMessage = typeof data?.error === "string" ? data.error : undefined;
      } catch {
        // ignore parse errors
      }
      throw mapApiError(res.status, serverMessage);
    }
  };

  /**
   * Page-level confirmation submit helper.
   * Owns the fetch call to /confirm and shareToken.
   * Modifies isConfirming, isConfirmed, and confirmError states.
   */
  const submitConfirmation = async (): Promise<void> => {
    if (!shareToken || isConfirming || isConfirmed) return;

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await fetch(
        `/api/public/briefs/${shareToken}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const data = await res.json();
          serverMessage = typeof data?.error === "string" ? data.error : undefined;
        } catch {
          // ignore parse errors
        }
        throw new Error(mapApiError(res.status, serverMessage));
      }

      const data = await res.json();
      if (data.snapshot?.status === "CONFIRMED") {
        setIsConfirmed(true);
      }
    } catch (err: any) {
      setConfirmError(err.message || mapApiError(500));
    } finally {
      setIsConfirming(false);
    }
  };


  return (
    <div className="grid grid-rows-[48px_1fr] h-screen overflow-hidden bg-background">
      <ClientHeader
        docName="payments-v2"
        specVersion="spec/v2.1"
        reqCount={MOCK_REQUIREMENTS.length}
        needsInputCount={needsInputCount}
        revOpen={revOpen}
        theme={theme}
        onToggleRev={() => setRevOpen((p) => !p)}
        onToggleTheme={toggleTheme}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        onSubmitConfirmation={submitConfirmation}
      />

      <div
        className={cn(
          "relative grid min-h-0 overflow-hidden transition-all duration-base ease-out-app",
          revOpen ? "sm:grid-cols-[1fr_240px]" : "grid-cols-[1fr]",
        )}
      >
        <ClientDoc
          title="Payment Service v2 — Requirements Specification"
          meta={{
            project: "payments-v2",
            version: "spec/v2.1",
            reqCount: MOCK_REQUIREMENTS.length,
            label: "shared for review",
          }}
          requirements={MOCK_REQUIREMENTS}
          onSubmitComment={submitComment}
          onSubmitAnswer={submitAnswer}
          isConfirming={isConfirming}
          isConfirmed={isConfirmed}
          confirmError={confirmError}
          onSubmitConfirmation={submitConfirmation}
        />

        {revOpen && (
          /* On mobile: full-screen overlay. On sm+: sidebar column */
          <div className="absolute inset-0 z-20 sm:relative sm:inset-auto sm:z-auto">
            <RevisionPanel
              revisions={MOCK_REVISIONS}
              onClose={() => setRevOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
