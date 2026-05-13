"use client";

import { useTheme } from "next-themes";
import { useState } from "react";

import { ClientDoc } from "@/components/brief/client-doc";
import { ClientHeader } from "@/components/brief/client-header";
import { RevisionPanel } from "@/components/brief/revision-panel";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";
import type { PublicBriefViewData } from "@/server/services/public-review";

import type { BriefCommentSection } from "../../../../generated/prisma/client";
import {
  claimToRequirement,
  questionToRequirement,
  revisionToRevision,
} from "./_lib/adapters";

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

interface PublicBriefViewProps {
  data: PublicBriefViewData;
}

export function PublicBriefView({ data }: PublicBriefViewProps) {
  const { shareToken, snapshot, project, claims, questions, revisions } = data;

  const requirements = [
    ...claims.map(claimToRequirement),
    ...questions.map(questionToRequirement),
  ];

  const revisionItems = revisions.map((rev) =>
    revisionToRevision(rev, snapshot.version),
  );

  const [revOpen, setRevOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(
    snapshot.status === "CONFIRMED",
  );
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

  const needsInputCount = requirements.filter((r) => r.question).length;

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
      anchorType: target.claimId
        ? "CLAIM"
        : target.questionId
          ? "QUESTION"
          : "SECTION",
      body,
    };

    if (target.claimId) payload.claimId = target.claimId;
    if (target.questionId) payload.questionId = target.questionId;

    const res = await fetch(`/api/public/briefs/${shareToken}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let serverMessage: string | undefined;
      try {
        const data = await res.json();
        serverMessage =
          typeof data?.error === "string" ? data.error : undefined;
      } catch {
        // ignore parse errors
      }
      throw mapApiError(res.status, serverMessage);
    }
  };

  const submitAnswer = async (
    questionId: string,
    body: string,
  ): Promise<void> => {
    const res = await fetch(`/api/public/briefs/${shareToken}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, body }),
    });

    if (!res.ok) {
      let serverMessage: string | undefined;
      try {
        const data = await res.json();
        serverMessage =
          typeof data?.error === "string" ? data.error : undefined;
      } catch {
        // ignore parse errors
      }
      throw mapApiError(res.status, serverMessage);
    }
  };

  const submitConfirmation = async (): Promise<void> => {
    if (!shareToken || isConfirming || isConfirmed) return;

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await fetch(`/api/public/briefs/${shareToken}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const jsonData = await res.json();
          serverMessage =
            typeof jsonData?.error === "string" ? jsonData.error : undefined;
        } catch {
          // ignore parse errors
        }
        throw new Error(mapApiError(res.status, serverMessage));
      }

      const jsonData = await res.json();
      if (jsonData.snapshot?.status === "CONFIRMED") {
        setIsConfirmed(true);
      }
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : mapApiError(500));
    } finally {
      setIsConfirming(false);
    }
  };

  const docTitle = `${project.name} — Brief v${snapshot.version}`;
  const specVersion = `v${snapshot.version}`;

  return (
    <div className="grid grid-rows-[48px_1fr] h-screen overflow-hidden bg-background">
      <ClientHeader
        docName={project.clientName || project.name}
        specVersion={specVersion}
        reqCount={requirements.length}
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
          title={docTitle}
          meta={{
            project: project.name,
            version: specVersion,
            reqCount: requirements.length,
            label: "shared for review",
          }}
          requirements={requirements}
          onSubmitComment={submitComment}
          onSubmitAnswer={submitAnswer}
          isConfirming={isConfirming}
          isConfirmed={isConfirmed}
          confirmError={confirmError}
          onSubmitConfirmation={submitConfirmation}
        />

        {revOpen && (
          <div className="absolute inset-0 z-20 sm:relative sm:inset-auto sm:z-auto">
            <RevisionPanel
              revisions={revisionItems}
              onClose={() => setRevOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
