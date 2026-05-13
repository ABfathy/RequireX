import { NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";
import {
  deleteProject,
  ProjectNotFoundError,
  ProjectUploadCleanupError,
  updateProject,
} from "@/server/services/projects";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { clerkUserId } = await requireInternalAuth();
    const { projectId } = await params;
    const body = (await request.json()) as { name?: string; clientName?: string };

    const updated = await updateProject(projectId, clerkUserId, {
      name: body.name?.trim() || undefined,
      clientName: body.clientName?.trim() || undefined,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: "PROJECT_NOT_FOUND", message: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "PROJECT_UPDATE_FAILED", message: "Failed to update project." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { clerkUserId } = await requireInternalAuth();
    const { projectId } = await params;

    await deleteProject(projectId, clerkUserId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json(
        {
          error: "PROJECT_NOT_FOUND",
          message: error.message,
        },
        { status: 404 },
      );
    }

    if (error instanceof ProjectUploadCleanupError) {
      return NextResponse.json(
        {
          error: "PROJECT_UPLOAD_CLEANUP_FAILED",
          message: error.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        error: "PROJECT_DELETE_FAILED",
        message: "Failed to delete project.",
      },
      { status: 500 },
    );
  }
}
