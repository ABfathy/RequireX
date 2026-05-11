"use client";

import { useCallback, useEffect, useState } from "react";

import { useTheme } from "@/lib/hooks/use-theme";
import { uploadFiles } from "@/lib/uploadthing-client";

import { CommandPalette } from "./command-palette";
import { type AppState, DocView } from "./doc-view";
import { ProjectSidebar } from "./project-sidebar";
import { RightPane, type SourceItem, type SourceType } from "./right-pane";
import { StatusBar } from "./statusbar";
import { TitleBar } from "./titlebar";

type RightTab = "sources" | "chat" | "revisions";

interface EditorShellProps {
  session?: { id: string; title: string } | null;
}

type ApiSourceAsset = {
  id: string;
  sourceType: "TEXT" | "AUDIO" | "IMAGE" | "PDF";
  status: SourceItem["status"];
  displayLabel: string | null;
  originalFileName: string | null;
  createdAt: string;
};

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as {
      error?: string;
      message?: string;
    };
    return payload.message ?? payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

function mapSourceType(sourceType: ApiSourceAsset["sourceType"]): SourceType {
  return sourceType;
}

function mapAsset(asset: ApiSourceAsset): SourceItem {
  return {
    id: asset.id,
    label: asset.displayLabel ?? asset.originalFileName ?? "Untitled source",
    sourceType: mapSourceType(asset.sourceType),
    status: asset.status,
    createdAt: asset.createdAt,
  };
}

export function EditorShell({ session }: EditorShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("sources");
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | undefined>();
  const [generationState, setGenerationState] = useState<
    "idle" | "requesting" | "failed"
  >("idle");
  const { theme, toggle: toggleTheme } = useTheme();

  const appState: AppState = !session
    ? "no-session"
    : generationState === "requesting"
      ? "generating"
      : generationState === "failed"
        ? "failed"
        : sources.length > 0
          ? "ready"
          : "no-sources";

  const loadSources = useCallback(async () => {
    if (!session) {
      setSources([]);
      setSourcesError(undefined);
      return;
    }

    setSourcesLoading(true);
    setSourcesError(undefined);
    try {
      const response = await fetch(`/api/sessions/${session.id}/assets`);
      if (!response.ok) {
        throw new Error("Failed to load sources.");
      }

      const payload = (await response.json()) as { assets: ApiSourceAsset[] };
      setSources(payload.assets.map(mapAsset));
    } catch (error) {
      setSourcesError(
        error instanceof Error ? error.message : "Failed to load sources.",
      );
    } finally {
      setSourcesLoading(false);
    }
  }, [session]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSources();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSources]);

  function handleSelectReq(id: string) {
    setSelectedReq((cur) => (cur === id ? null : id));
  }

  function handleOpenSources() {
    setRightOpen(true);
    setRightTab("sources");
  }

  async function handleSubmitText(text: string) {
    if (!session) {
      const response = await fetch("/api/preview-messy-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ textContent: text }),
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to send prompt preview event."),
        );
      }

      return;
    }

    const response = await fetch(`/api/sessions/${session.id}/assets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ textContent: text }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Failed to save source."));
    }

    await loadSources();
  }

  async function handleDeleteSource(id: string) {
    const response = await fetch(`/api/assets/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Failed to delete source."));
    }

    await loadSources();
  }

  async function handleRenameSource(id: string, label: string) {
    const response = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayLabel: label }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Failed to rename source."));
    }

    await loadSources();
  }

  async function handleUploadSources(
    files: File[],
    onProgress: (progress: number) => void,
  ) {
    if (!session) {
      throw new Error("No active session.");
    }

    await uploadFiles("mixedUploader", {
      files,
      input: {
        sessionId: session.id,
      },
      onUploadProgress: ({ totalProgress }) => {
        onProgress(
          Math.round(totalProgress <= 1 ? totalProgress * 100 : totalProgress),
        );
      },
    });

    onProgress(100);
    await loadSources();
  }

  async function handleGenerateBrief() {
    if (!session) {
      return;
    }

    setGenerationState("requesting");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to request brief generation.");
      }

      setGenerationState("idle");
    } catch {
      setGenerationState("failed");
    }
  }

  const colTemplate = [
    sidebarOpen ? "220px" : "0px",
    "1fr",
    rightOpen ? "268px" : "0px",
  ].join(" ");

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <TitleBar
        sidebarOpen={sidebarOpen}
        rightOpen={rightOpen}
        theme={theme}
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        onToggleRight={() => setRightOpen((p) => !p)}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <div
        className="flex-1 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: colTemplate,
          transition: "grid-template-columns 200ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <div className="overflow-hidden" style={{ minWidth: 0 }}>
          {sidebarOpen && (
            <ProjectSidebar onOpenPalette={() => setPaletteOpen(true)} />
          )}
        </div>

        <DocView
          appState={appState}
          sessionName={session?.title ?? null}
          selectedReq={selectedReq}
          onSelectReq={handleSelectReq}
          onAddSources={handleOpenSources}
          onGenerateBrief={handleGenerateBrief}
        />

        <div className="overflow-hidden" style={{ minWidth: 0 }}>
          {rightOpen && (
            <RightPane
              activeTab={rightTab}
              onTabChange={setRightTab}
              sessionId={session?.id}
              sources={sources}
              sourcesLoading={sourcesLoading}
              sourcesError={sourcesError}
              onDeleteSource={(id) => {
                void handleDeleteSource(id);
              }}
              onRenameSource={(id, label) => {
                void handleRenameSource(id, label);
              }}
              onSubmitText={handleSubmitText}
              onUploadSources={handleUploadSources}
              onRetrySourceLoad={loadSources}
            />
          )}
        </div>
      </div>

      <StatusBar
        selectedReq={selectedReq}
        sessionName={session?.title ?? null}
      />

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
