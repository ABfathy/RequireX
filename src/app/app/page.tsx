import { EditorShell } from "@/components/editor/editor-shell";
import type { SourceItem, SourceType } from "@/components/editor/right-pane";
import { prisma } from "@/lib/prisma";
import { snapshotToDocLines } from "@/lib/snapshot-to-doclines";
import { requireInternalAuth } from "@/server/auth";
import { getSessionAssets } from "@/server/services/assets";
import {
  ensureWorkspaceForUser,
  listBundledProjectsForUser,
} from "@/server/services/projects";
import { getLatestSnapshot } from "@/server/services/snapshot";

type PageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

function mapSourceType(dbType: string): SourceType {
  if (dbType === "AUDIO") return "AUDIO";
  if (dbType === "TEXT") return "TEXT";
  if (dbType === "IMAGE") return "IMAGE";
  return "PDF";
}

export default async function InternalWorkspacePage({
  searchParams,
}: PageProps) {
  const { clerkUserId } = await requireInternalAuth();
  const { projectId: requestedProjectId } = await searchParams;

  await ensureWorkspaceForUser(clerkUserId);
  const { projects, bundledProjects } = await listBundledProjectsForUser(
    clerkUserId,
    { limit: 5 },
  );

  const activeProject =
    projects.find((p) => p.id === requestedProjectId) ?? projects[0] ?? null;

  const activeBundledProject = activeProject
    ? bundledProjects.find((project) => project.id === activeProject.id) ?? null
    : null;

  const session =
    activeBundledProject?.session ??
    (activeProject
      ? await prisma.intakeSession.findFirst({
          where: { projectId: activeProject.id },
          orderBy: { createdAt: "asc" },
          select: { id: true, title: true },
        })
      : null);

  let initialSources: SourceItem[] = [];
  const latestSnapshot = session ? await getLatestSnapshot(session.id) : null;

  if (activeBundledProject) {
    initialSources = activeBundledProject.assets.map((asset) => ({
      id: asset.id,
      label: asset.displayLabel ?? asset.originalFileName ?? "Untitled source",
      sourceType: mapSourceType(asset.sourceType),
      status: asset.status,
      createdAt: asset.createdAt,
      fileUrl: asset.ufsUrl ?? undefined,
      mimeType: asset.mimeType ?? undefined,
    }));
  } else {
    const dbAssets = session ? await getSessionAssets(session.id) : [];
    initialSources = dbAssets.map((asset) => ({
      id: asset.id,
      label: asset.displayLabel ?? asset.originalFileName ?? "Untitled source",
      sourceType: mapSourceType(asset.sourceType),
      status: asset.status,
      createdAt: asset.createdAt.toISOString(),
      fileUrl: asset.ufsUrl ?? undefined,
      mimeType: asset.mimeType ?? undefined,
    }));
  }

  const lines = snapshotToDocLines(latestSnapshot, session?.title ?? null);

  const initialProjectCache: Record<
    string,
    { session: { id: string; title: string } | null; sources: SourceItem[] }
  > = Object.fromEntries(
    bundledProjects.map((project) => [
      project.id,
      {
        session: project.session,
        sources: project.assets.map((asset) => ({
          id: asset.id,
          label:
            asset.displayLabel ?? asset.originalFileName ?? "Untitled source",
          sourceType: mapSourceType(asset.sourceType),
          status: asset.status,
          createdAt: asset.createdAt,
          fileUrl: asset.ufsUrl ?? undefined,
          mimeType: asset.mimeType ?? undefined,
        })),
      },
    ]),
  );

  if (activeProject && !initialProjectCache[activeProject.id]) {
    initialProjectCache[activeProject.id] = {
      session,
      sources: initialSources,
    };
  }

  return (
    <EditorShell
      key={activeProject?.id ?? "no-project"}
      projects={projects}
      activeProjectId={activeProject?.id ?? null}
      session={session}
      initialSources={initialSources}
      initialProjectCache={initialProjectCache}
      lines={lines}
      hasSnapshot={Boolean(latestSnapshot)}
      initialSnapshotId={latestSnapshot?.id ?? null}
    />
  );
}
