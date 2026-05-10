import { EditorShell } from "@/components/editor/editor-shell";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth } from "@/server/auth";

export default async function InternalWorkspacePage() {
  const { clerkUserId } = await requireInternalAuth();

  const session = await prisma.intakeSession.findFirst({
    where: { createdBy: clerkUserId },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });

  return <EditorShell session={session} />;
}
