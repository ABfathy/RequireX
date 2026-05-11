import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";
import {
  ensureWorkspaceForUser,
  listProjectsForUser,
} from "@/server/services/projects";

export async function GET() {
  try {
    const { clerkUserId } = await requireInternalAuth();
    await ensureWorkspaceForUser(clerkUserId);
    const projects = await listProjectsForUser(clerkUserId);

    if (projects.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    const projectIds = projects.map((p) => p.id);

    // Fetch sessions for all projects in one query, then dedupe to the
    // earliest session per project — matches /app/page.tsx's findFirst order.
    const sessions = await prisma.intakeSession.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, projectId: true },
    });

    const earliestSessionByProject = new Map<
      string,
      { id: string; title: string }
    >();
    for (const s of sessions) {
      if (!earliestSessionByProject.has(s.projectId)) {
        earliestSessionByProject.set(s.projectId, { id: s.id, title: s.title });
      }
    }

    const sessionIds = Array.from(earliestSessionByProject.values()).map(
      (s) => s.id,
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
              createdAt: true,
            },
          });

    const assetsBySession = new Map<string, typeof assets>();
    for (const a of assets) {
      const bucket = assetsBySession.get(a.sessionId) ?? [];
      bucket.push(a);
      assetsBySession.set(a.sessionId, bucket);
    }

    const bundled = projects.map((p) => {
      const session = earliestSessionByProject.get(p.id) ?? null;
      const sessionAssets = session ? assetsBySession.get(session.id) ?? [] : [];
      return {
        id: p.id,
        name: p.name,
        clientName: p.clientName,
        updatedAt: p.updatedAt.toISOString(),
        session,
        assets: sessionAssets.map((a) => ({
          id: a.id,
          sourceType: a.sourceType,
          status: a.status,
          displayLabel: a.displayLabel,
          originalFileName: a.originalFileName,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({ projects: bundled });
  } catch (err) {
    if (isInternalAuthorizationError(err)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
