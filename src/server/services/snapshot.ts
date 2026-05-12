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

export async function getAllSnapshots(sessionId: string) {
  return prisma.briefSnapshot.findMany({
    where: { sessionId },
    orderBy: { version: "desc" },
    select: { id: true, version: true, status: true, createdAt: true },
  });
}

export type SnapshotListItem = Awaited<
  ReturnType<typeof getAllSnapshots>
>[number];

export async function getSnapshotById(snapshotId: string) {
  return prisma.briefSnapshot.findUnique({
    where: { id: snapshotId },
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
