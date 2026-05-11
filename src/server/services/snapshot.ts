import { prisma } from "@/lib/prisma";

export async function getLatestSnapshot(sessionId: string) {
  return prisma.briefSnapshot.findFirst({
    where: { sessionId },
    orderBy: { version: "desc" },
    include: {
      claims: {
        orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
        include: {
          evidenceRefs: {
            orderBy: { createdAt: "asc" },
            include: {
              sourceAsset: {
                select: {
                  id: true,
                  displayLabel: true,
                  originalFileName: true,
                },
              },
            },
          },
        },
      },
      questions: {
        orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
        include: {
          evidenceRefs: {
            orderBy: { createdAt: "asc" },
            include: {
              sourceAsset: {
                select: {
                  id: true,
                  displayLabel: true,
                  originalFileName: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export type SnapshotWithDetails = NonNullable<
  Awaited<ReturnType<typeof getLatestSnapshot>>
>;
