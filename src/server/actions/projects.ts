"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireInternalAuth } from "@/server/auth";
import {
  createProject,
  ensureWorkspaceForUser,
} from "@/server/services/projects";

const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  clientName: z.string().trim().max(120).optional(),
});

export async function createProjectAction(formData: FormData) {
  const { clerkUserId } = await requireInternalAuth();

  const parsed = CreateProjectSchema.safeParse({
    name: formData.get("name"),
    clientName: formData.get("clientName") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid project input");
  }

  const workspace = await ensureWorkspaceForUser(clerkUserId);
  const { project } = await createProject({
    workspaceId: workspace.id,
    name: parsed.data.name,
    clientName: parsed.data.clientName,
    createdBy: clerkUserId,
  });

  redirect(`/app?projectId=${project.id}`);
}
