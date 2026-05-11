import { NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";
import {
  ensureWorkspaceForUser,
  listBundledProjectsForUser,
} from "@/server/services/projects";

export async function GET() {
  try {
    const { clerkUserId } = await requireInternalAuth();
    await ensureWorkspaceForUser(clerkUserId);
    const { bundledProjects } = await listBundledProjectsForUser(clerkUserId);
    return NextResponse.json({ projects: bundledProjects });
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
