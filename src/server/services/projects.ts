import { prisma } from "@/lib/prisma";

import type { SourceAssetStatus } from "../../../generated/prisma/client";

const DEFAULT_WORKSPACE_NAME = "My Workspace";

export type ProjectListItem = {
  id: string;
  name: string;
  clientName: string;
  updatedAt: string;
};

export type ProjectSessionRef = { id: string; title: string } | null;

export type ProjectAssetBundle = {
  id: string;
  sourceType: string;
  status: SourceAssetStatus;
  displayLabel: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  ufsUrl: string | null;
  createdAt: string;
};

export type BundledProject = ProjectListItem & {
  session: ProjectSessionRef;
  assets: ProjectAssetBundle[];
};

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`);
    this.name = "ProjectNotFoundError";
  }
}

function workspaceSlugForUser(clerkUserId: string) {
  return `ws-${clerkUserId.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
}

export async function ensureWorkspaceForUser(clerkUserId: string) {
  const slug = workspaceSlugForUser(clerkUserId);
  return prisma.workspace.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: DEFAULT_WORKSPACE_NAME,
      createdBy: clerkUserId,
    },
  });
}

export async function listProjectsForUser(clerkUserId: string) {
  const projects = await prisma.project.findMany({
    where: {
      createdBy: clerkUserId,
      status: "ACTIVE",
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      clientName: true,
      updatedAt: true,
    },
  });
  return projects;
}

export async function listBundledProjectsForUser(
  clerkUserId: string,
  options: { limit?: number } = {},
) {
  const projects = await listProjectsForUser(clerkUserId);
  const orderedProjects = projects.map((project) => ({
    id: project.id,
    name: project.name,
    clientName: project.clientName,
    updatedAt: project.updatedAt.toISOString(),
  }));

  const bundledProjects = await bundleProjects(
    typeof options.limit === "number"
      ? orderedProjects.slice(0, options.limit)
      : orderedProjects,
  );

  return { projects: orderedProjects, bundledProjects };
}

async function bundleProjects(projects: ProjectListItem[]) {
  if (projects.length === 0) return [] satisfies BundledProject[];

  const projectIds = projects.map((project) => project.id);

  const sessions = await prisma.intakeSession.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, projectId: true },
  });

  const earliestSessionByProject = new Map<string, NonNullable<ProjectSessionRef>>();
  for (const session of sessions) {
    if (!earliestSessionByProject.has(session.projectId)) {
      earliestSessionByProject.set(session.projectId, {
        id: session.id,
        title: session.title,
      });
    }
  }

  const sessionIds = Array.from(earliestSessionByProject.values()).map(
    (session) => session.id,
  );

  const assets =
    sessionIds.length === 0
      ? []
      : await prisma.sourceAsset.findMany({
          where: { sessionId: { in: sessionIds } },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            sessionId: true,
            sourceType: true,
            status: true,
            displayLabel: true,
            originalFileName: true,
            mimeType: true,
            ufsUrl: true,
            createdAt: true,
          },
        });

  const assetsBySession = new Map<string, ProjectAssetBundle[]>();
  for (const asset of assets) {
    const bucket = assetsBySession.get(asset.sessionId) ?? [];
    bucket.push({
      id: asset.id,
      sourceType: asset.sourceType,
      status: asset.status,
      displayLabel: asset.displayLabel,
      originalFileName: asset.originalFileName,
      mimeType: asset.mimeType,
      ufsUrl: asset.ufsUrl,
      createdAt: asset.createdAt.toISOString(),
    });
    assetsBySession.set(asset.sessionId, bucket);
  }

  return projects.map((project) => {
    const session = earliestSessionByProject.get(project.id) ?? null;
    return {
      ...project,
      session,
      assets: session ? assetsBySession.get(session.id) ?? [] : [],
    };
  });
}

type CreateProjectParams = {
  workspaceId: string;
  name: string;
  clientName?: string;
  createdBy: string;
};

export async function createProject(params: CreateProjectParams) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        workspaceId: params.workspaceId,
        name: params.name,
        clientName: params.clientName ?? params.name,
        status: "ACTIVE",
        createdBy: params.createdBy,
      },
    });

    const session = await tx.intakeSession.create({
      data: {
        projectId: project.id,
        title: "Initial intake",
        status: "DRAFT",
        createdBy: params.createdBy,
      },
    });

    return { project, session };
  });
}

export async function deleteProject(projectId: string, clerkUserId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      createdBy: clerkUserId,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new ProjectNotFoundError(projectId);
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });
}
