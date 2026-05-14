"use client";

import { useTheme } from "next-themes";
import { useState } from "react";

import { ClientDoc } from "@/components/brief/client-doc";
import { ClientHeader } from "@/components/brief/client-header";
import { RevisionPanel } from "@/components/brief/revision-panel";
import { MermaidDiagram } from "@/components/diagram/mermaid-diagram";
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
  isDemo?: boolean;
}

export function PublicBriefView({ data, isDemo = false }: PublicBriefViewProps) {
  const {
    shareToken,
    snapshot,
    project,
    claims,
    questions,
    revisions,
    comments,
    diagrams,
  } = data;
  const isFinalized = snapshot.documentType === "FINALIZED_DOCUMENT";

  const requirements = [
    ...claims.map((claim) =>
      claimToRequirement(claim, { showStatus: !isFinalized }),
    ),
    ...(isFinalized ? [] : questions.map(questionToRequirement)),
  ];

  const revisionItems = revisions.map((rev) =>
    revisionToRevision(rev, snapshot.version, snapshot.documentType),
  );

  const [revOpen, setRevOpen] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [answeredTexts, setAnsweredTexts] = useState<Map<string, string>>(
    new Map(),
  );
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

  const needsInputCount = requirements.filter(
    (r) => r.question && r.questionId && !answeredIds.has(r.questionId),
  ).length;

  const submitComment = async (
    target: {
      section: BriefCommentSection;
      claimId?: string;
      questionId?: string;
    },
    body: string,
  ): Promise<void> => {
    if (isDemo) return;
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
    if (isDemo) return;
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

    setAnsweredIds((prev) => new Set([...prev, questionId]));
    setAnsweredTexts((prev) => new Map([...prev, [questionId, body]]));
  };

  function handleDownloadPdf() {
    const projectTitle = project.clientName || project.name;
    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Build a lookup from questionId → answerText (prefer in-session over server)
    const answerLookup = new Map<string, string>();
    for (const q of questions) {
      if (q.answerText) answerLookup.set(q.id, q.answerText);
    }
    for (const [qId, text] of answeredTexts) {
      answerLookup.set(qId, text);
    }

    const ambiguities = isFinalized
      ? []
      : questions.filter((q) => q.section === "AMBIGUITIES");
    const followUps = isFinalized
      ? []
      : questions.filter((q) => q.section === "FOLLOW_UP_QUESTIONS");

    const renderQuestionSection = (
      label: string,
      qs: typeof questions,
      canAnswer: boolean,
    ) => {
      if (qs.length === 0) return "";
      const rows = qs
        .map((q) => {
          const answerText = canAnswer ? answerLookup.get(q.id) : undefined;
          return `<div class="req-block">
  <p class="req-reason">${escape(q.reason)}</p>
  <div class="question-block">
    <div class="question-label">Question</div>
    <p class="question-text">${escape(q.text)}</p>
    ${
      canAnswer
        ? answerText
          ? `<div class="answer-label">Answer</div><p class="answer-text">${escape(answerText)}</p>`
          : `<p class="answer-empty">No answer provided</p>`
        : ""
    }
  </div>
</div>`;
        })
        .join("\n");
      return `<h2>${escape(label)}</h2>\n${rows}`;
    };

    // Build claims sections
    const claimSectionMap = new Map<string, typeof requirements>();
    for (const req of requirements.filter((r) => !r.question)) {
      const list = claimSectionMap.get(req.section) ?? [];
      list.push(req);
      claimSectionMap.set(req.section, list);
    }

    const claimsHtml = Array.from(claimSectionMap.entries())
      .map(([section, reqs]) => {
        const rows = reqs
          .map((r) => `<p class="req">${escape(r.body)}</p>`)
          .join("\n");
        return `<h2>${escape(section)}</h2>\n${rows}`;
      })
      .join("\n");

    const questionsHtml = [
      renderQuestionSection("Ambiguities", ambiguities, true),
      renderQuestionSection("Follow-up Questions", followUps, true),
    ]
      .filter(Boolean)
      .join("\n");

    // Client comments section
    const commentsHtml = (() => {
      if (!comments || comments.length === 0) return "";
      const rows = comments
        .map((c) => {
          const author = c.authorName ?? c.authorEmail ?? "Anonymous";
          return `<div class="comment-block">
  <div class="comment-meta">${escape(c.section.toLowerCase().replace(/_/g, " "))} · ${escape(author)}</div>
  <p class="comment-body">${escape(c.body)}</p>
</div>`;
        })
        .join("\n");
      return `<h2>Client Comments</h2>\n${rows}`;
    })();

    const bodyHtml = [claimsHtml, questionsHtml, commentsHtml]
      .filter(Boolean)
      .join("\n");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${escape(projectTitle)} — ${isFinalized ? "Finalized Version" : "Brief Version"} ${snapshot.version}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}
  h1{font-size:22px;font-weight:700;margin:0 0 4px}
  .meta{font-size:11px;color:#999;font-family:monospace;margin:0 0 20px}
  h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#666;margin:28px 0 8px;border-top:1px solid #eee;padding-top:16px}
  .req{font-size:14px;margin:0 0 10px}
  .req-block{margin:0 0 16px}
  .req-reason{font-size:14px;margin:0 0 8px}
  .question-block{border-left:3px solid #f59e0b;padding:8px 12px;background:#fefce8;border-radius:0 4px 4px 0;margin-bottom:4px}
  .question-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#d97706;margin-bottom:4px}
  .question-text{font-size:13px;margin:0 0 8px;color:#374151}
  .answer-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#059669;margin-bottom:4px}
  .answer-text{font-size:13px;margin:0;color:#111;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:6px 10px}
  .answer-empty{font-size:12px;color:#9ca3af;font-style:italic;margin:0}
  .comment-block{margin:0 0 12px;border-left:3px solid #6366f1;padding:6px 12px;background:#f5f3ff}
  .comment-meta{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#7c3aed;margin-bottom:4px}
  .comment-body{font-size:13px;margin:0;color:#374151}
  @media print{body{margin:20px}}
</style></head><body>
<h1>${escape(projectTitle)}</h1>
<div class="meta">${escape(project.name)} · ${isFinalized ? "Finalized Version" : "Brief Version"} ${snapshot.version} · ${isFinalized ? "shared finalized document" : "shared for review"}</div>
${bodyHtml}
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  }

  const submitConfirmation = async (): Promise<void> => {
    if (isDemo || !shareToken || isConfirming || isConfirmed) return;

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

  const docTitle = `${project.name} — ${
    isFinalized ? "Finalized Document" : "Brief"
  }`;
  const specVersion = `${
    isFinalized ? "Finalized Version" : "Brief Version"
  } ${snapshot.version}`;

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
        showConfirmationControls={!isFinalized}
        showNeedsInputCount={!isFinalized}
      />

      <div
        className={cn(
          "relative grid min-h-0 overflow-hidden transition-all duration-base ease-out-app",
          revOpen ? "sm:grid-cols-[1fr_240px]" : "grid-cols-[1fr]",
        )}
      >
        <div className="min-w-0 overflow-y-auto">
          <ClientDoc
            title={docTitle}
            meta={{
              project: project.name,
              version: specVersion,
              reqCount: requirements.length,
              label: isFinalized
                ? "shared finalized document"
                : "shared for review",
            }}
            requirements={requirements}
            onSubmitComment={submitComment}
            onSubmitAnswer={isFinalized ? undefined : submitAnswer}
            onDownloadPdf={handleDownloadPdf}
            isConfirming={isConfirming}
            isConfirmed={isConfirmed}
            confirmError={confirmError}
            onSubmitConfirmation={submitConfirmation}
            showConfirmationControls={!isFinalized}
          />

          {diagrams.length > 0 && (
            <div className="max-w-[720px] mx-auto px-4 sm:px-6 pb-12">
              <details className="group mt-8">
                <summary className="flex cursor-pointer select-none list-none items-center gap-2 py-2 text-sm font-semibold">
                  <svg
                    className="size-4 shrink-0 transition-transform duration-150 group-open:rotate-90"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                  Diagrams
                  <span
                    className="inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-[3px] text-[10px] font-medium tabular-nums"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--fg-muted)",
                    }}
                  >
                    {diagrams.length}
                  </span>
                </summary>
                <div className="mt-4 flex flex-col gap-8">
                  {diagrams.map((d) => (
                    <div key={d.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="inline-flex items-center h-[18px] px-[7px] text-[10.5px] font-medium rounded-sm border whitespace-nowrap"
                          style={{
                            background: "var(--surface-2)",
                            color: "var(--fg-tertiary)",
                            borderColor: "var(--border)",
                          }}
                        >
                          {d.diagramType.charAt(0) +
                            d.diagramType
                              .slice(1)
                              .toLowerCase()
                              .replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-medium">{d.title}</span>
                      </div>
                      {d.description && (
                        <p
                          className="text-xs mb-3"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {d.description}
                        </p>
                      )}
                      <MermaidDiagram
                        id={d.id}
                        code={d.mermaidCode}
                        className="rounded-[8px] border overflow-auto p-3"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

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
