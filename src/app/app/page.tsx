import { EditorShell } from "@/components/editor/editor-shell";
import type { SourceItem, SourceType } from "@/components/editor/right-pane";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth } from "@/server/auth";
import { getSessionAssets } from "@/server/services/assets";
import {
  ensureWorkspaceForUser,
  listProjectsForUser,
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
  const projects = await listProjectsForUser(clerkUserId);

  const activeProject =
    projects.find((p) => p.id === requestedProjectId) ?? projects[0] ?? null;

  const session = activeProject
    ? await prisma.intakeSession.findFirst({
        where: { projectId: activeProject.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true },
      })
    : null;

  const dbAssets = session ? await getSessionAssets(session.id) : [];
  const initialSources: SourceItem[] = dbAssets.map((a) => ({
    id: a.id,
    label: a.displayLabel ?? a.originalFileName ?? "Untitled source",
    sourceType: mapSourceType(a.sourceType),
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  }));

  const projectsForClient = projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.clientName,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <EditorShell
      key={activeProject?.id ?? "no-project"}
      projects={projectsForClient}
      activeProjectId={activeProject?.id ?? null}
      session={session}
      initialSources={initialSources}
    />
  );
}
