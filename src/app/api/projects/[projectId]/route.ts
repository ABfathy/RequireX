import { NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";
import {
  deleteProject,
  ProjectNotFoundError,
} from "@/server/services/projects";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

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

    return NextResponse.json(
      {
        error: "PROJECT_DELETE_FAILED",
        message: "Failed to delete project.",
      },
      { status: 500 },
    );
  }
}
