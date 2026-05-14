import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";
import { generateDiagram } from "@/server/services/diagram-generation";

const requestSchema = z.object({
  snapshotId: z.string().uuid(),
  diagramType: z.enum([
    "FLOWCHART",
    "SEQUENCE",
    "ARCHITECTURE",
    "ACTIVITY",
    "USER_JOURNEY",
  ]),
  userContext: z.string().max(1000).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    await requireInternalAuth();
    const { sessionId } = await params;

    const diagrams = await prisma.briefDiagram.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        snapshotId: true,
        diagramType: true,
        title: true,
        mermaidCode: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      diagrams: diagrams.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error({ scope: "api.sessions.diagrams.get", error });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to load diagrams." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    await requireInternalAuth();
    const { sessionId } = await params;

    const session = await prisma.intakeSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json(
        { error: "SESSION_NOT_FOUND", message: "Session not found." },
        { status: 404 },
      );
    }

    const body = requestSchema.parse(await request.json());

    const snapshot = await prisma.briefSnapshot.findUnique({
      where: { id: body.snapshotId },
      select: { id: true, sessionId: true },
    });
    if (!snapshot || snapshot.sessionId !== sessionId) {
      return NextResponse.json(
        { error: "SNAPSHOT_NOT_FOUND", message: "Snapshot not found." },
        { status: 404 },
      );
    }

    const diagram = await generateDiagram({
      snapshotId: body.snapshotId,
      sessionId,
      diagramType: body.diagramType,
      userContext: body.userContext,
    });

    return NextResponse.json({
      id: diagram.id,
      snapshotId: diagram.snapshotId,
      diagramType: diagram.diagramType,
      title: diagram.title,
      mermaidCode: diagram.mermaidCode,
      description: diagram.description,
      createdAt: diagram.createdAt.toISOString(),
    });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Invalid request body." },
        { status: 400 },
      );
    }
    console.error({ scope: "api.sessions.diagrams.post", error });
    return NextResponse.json(
      { error: "DIAGRAM_FAILED", message: "Failed to generate diagram." },
      { status: 500 },
    );
  }
}
