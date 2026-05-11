import { EditorShell } from "@/components/editor/editor-shell";
import type { SourceItem, SourceType } from "@/components/editor/right-pane";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth } from "@/server/auth";
import { getSessionAssets } from "@/server/services/assets";
import {
  ensureWorkspaceForUser,
  listBundledProjectsForUser,
} from "@/server/services/projects";

type PageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

function mapSourceType(dbType: string): SourceType {
  if (dbType === "AUDIO") return "AUDIO";
  if (dbType === "TEXT") return "TEXT";
  return "FILE";
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
  if (activeBundledProject) {
    initialSources = activeBundledProject.assets.map((asset) => ({
      id: asset.id,
      label: asset.displayLabel ?? asset.originalFileName ?? "Untitled source",
      sourceType: mapSourceType(asset.sourceType),
      status: asset.status,
      createdAt: asset.createdAt,
    }));
  } else {
    const dbAssets = session ? await getSessionAssets(session.id) : [];
    initialSources = dbAssets.map((asset) => ({
      id: asset.id,
      label: asset.displayLabel ?? asset.originalFileName ?? "Untitled source",
      sourceType: mapSourceType(asset.sourceType),
      status: asset.status,
      createdAt: asset.createdAt.toISOString(),
    }));
  }

  const initialProjectCache = Object.fromEntries(
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
    />
  );
}
