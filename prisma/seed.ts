import { createPrismaClient } from "../lib/prisma-client";

const prisma = createPrismaClient();

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: "requirex-demo" },
    update: {
      name: "RequireX Demo Workspace",
      createdBy: "user_demo_admin",
    },
    create: {
      slug: "requirex-demo",
      name: "RequireX Demo Workspace",
      createdBy: "user_demo_admin",
    },
  });

  await prisma.project.deleteMany({
    where: {
      workspaceId: workspace.id,
      name: "Softworks Retail App Brief",
    },
  });

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Softworks Retail App Brief",
      clientName: "Softworks Demo Client",
      description:
        "Demo project showing mixed-source intake, snapshot versioning, and evidence-backed brief generation.",
      status: "ACTIVE",
      createdBy: "user_demo_admin",
    },
  });

  const session = await prisma.intakeSession.create({
    data: {
      projectId: project.id,
      title: "Initial Retail Intake",
      status: "REVIEW_READY",
      createdBy: "user_demo_admin",
    },
  });

  const textAsset = await prisma.sourceAsset.create({
    data: {
      sessionId: session.id,
      sourceType: "TEXT",
      status: "PROCESSED",
      displayLabel: "Client WhatsApp summary",
      mimeType: "text/plain",
      textContent:
        "The client wants a retail ordering app with account creation, inventory sync, order tracking, and Arabic support. They need a first MVP in six weeks and want admin reporting.",
      providerMetadata: {
        origin: "pasted-text",
        messageCount: 4,
      },
      processedAt: new Date(),
    },
  });

  const pdfAsset = await prisma.sourceAsset.create({
    data: {
      sessionId: session.id,
      sourceType: "PDF",
      status: "PROCESSED",
      displayLabel: "Retail requirements deck",
      originalFileName: "requirements-deck.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 1245918,
      routeSlug: "projectDocuments",
      utKey: "ut_pdf_requirex_demo",
      ufsUrl: "https://ufs.sh/f/ut_pdf_requirex_demo",
      appUrl: "https://utfs.io/f/ut_pdf_requirex_demo",
      customId: "asset_requirex_pdf_demo",
      folderLabel: "kickoff-folder",
      providerMetadata: {
        uploadedBy: "user_demo_admin",
      },
      processedAt: new Date(),
    },
  });

  const audioAsset = await prisma.sourceAsset.create({
    data: {
      sessionId: session.id,
      sourceType: "AUDIO",
      status: "PROCESSED",
      displayLabel: "Voice note from client",
      originalFileName: "voice-note.m4a",
      mimeType: "audio/mp4",
      fileSizeBytes: 842114,
      routeSlug: "voiceNotes",
      utKey: "ut_audio_requirex_demo",
      ufsUrl: "https://ufs.sh/f/ut_audio_requirex_demo",
      appUrl: "https://utfs.io/f/ut_audio_requirex_demo",
      customId: "asset_requirex_audio_demo",
      folderLabel: "kickoff-folder",
      providerMetadata: {
        uploadedBy: "user_demo_admin",
      },
      processedAt: new Date(),
    },
  });

  const imageAsset = await prisma.sourceAsset.create({
    data: {
      sessionId: session.id,
      sourceType: "IMAGE",
      status: "PROCESSED",
      displayLabel: "Screenshot of current spreadsheet flow",
      originalFileName: "inventory-sheet.png",
      mimeType: "image/png",
      fileSizeBytes: 315480,
      routeSlug: "projectImages",
      utKey: "ut_image_requirex_demo",
      ufsUrl: "https://ufs.sh/f/ut_image_requirex_demo",
      appUrl: "https://utfs.io/f/ut_image_requirex_demo",
      customId: "asset_requirex_image_demo",
      folderLabel: "kickoff-folder",
      providerMetadata: {
        uploadedBy: "user_demo_admin",
      },
      processedAt: new Date(),
    },
  });

  const textChunk = await prisma.sourceChunk.create({
    data: {
      sourceAssetId: textAsset.id,
      kind: "TEXT_BLOCK",
      orderIndex: 0,
      text: "The client wants account creation, inventory sync, order tracking, Arabic support, and an MVP in six weeks.",
      locator: {
        kind: "text-range",
        messageIndex: 0,
        paragraphStart: 0,
        paragraphEnd: 1,
      },
      chunkLabel: "summary-paragraph",
    },
  });

  const pdfChunk = await prisma.sourceChunk.create({
    data: {
      sourceAssetId: pdfAsset.id,
      kind: "PDF_BLOCK",
      orderIndex: 0,
      text: "The admin panel must include sales reporting, inventory discrepancy alerts, and exportable CSV summaries.",
      locator: {
        kind: "pdf-range",
        page: 4,
        paragraphStart: 1,
        paragraphEnd: 2,
      },
      pageNumber: 4,
      chunkLabel: "reporting-requirements",
    },
  });

  const audioChunk = await prisma.sourceChunk.create({
    data: {
      sourceAssetId: audioAsset.id,
      kind: "TRANSCRIPT_SEGMENT",
      orderIndex: 0,
      text: "We need something the store managers can use quickly on mobile without training.",
      locator: {
        kind: "audio-range",
        startMs: 14000,
        endMs: 21000,
        transcriptChunk: 0,
      },
      startMs: 14000,
      endMs: 21000,
      chunkLabel: "mobile-usability",
    },
  });

  const imageChunk = await prisma.sourceChunk.create({
    data: {
      sourceAssetId: imageAsset.id,
      kind: "IMAGE_OBSERVATION",
      orderIndex: 0,
      text: "The screenshot shows a spreadsheet-based stock workflow with manual color coding for low inventory.",
      locator: {
        kind: "image-note",
        regionLabel: "inventory-table",
        extractedHint: "manual stock workflow",
      },
      chunkLabel: "inventory-workflow",
    },
  });

  const snapshotV1 = await prisma.briefSnapshot.create({
    data: {
      projectId: project.id,
      sessionId: session.id,
      version: 1,
      status: "SUPERSEDED",
      sourceBundleVersion: 1,
      createdBy: "user_demo_admin",
    },
  });

  const summaryClaimV1 = await prisma.briefClaim.create({
    data: {
      snapshotId: snapshotV1.id,
      section: "SUMMARY",
      orderIndex: 0,
      text: "The client wants a retail ordering platform with inventory sync, order tracking, and Arabic-language support.",
      confidence: "HIGH",
    },
  });

  const goalClaimV1 = await prisma.briefClaim.create({
    data: {
      snapshotId: snapshotV1.id,
      section: "GOALS",
      orderIndex: 0,
      text: "Deliver an MVP quickly enough for pilot use while keeping the admin workflow report-friendly.",
      confidence: "MEDIUM",
    },
  });

  const ambiguityQuestionV1 = await prisma.briefQuestion.create({
    data: {
      snapshotId: snapshotV1.id,
      section: "AMBIGUITIES",
      orderIndex: 0,
      text: "Is the first release expected to integrate with an existing ERP or operate standalone?",
      reason: "The uploaded material implies inventory sync but does not confirm the upstream system boundary.",
      status: "OPEN",
    },
  });

  const followUpQuestionV1 = await prisma.briefQuestion.create({
    data: {
      snapshotId: snapshotV1.id,
      section: "FOLLOW_UP_QUESTIONS",
      orderIndex: 0,
      text: "Which manager roles need mobile access in the MVP?",
      reason: "The voice note emphasizes mobile usability but does not identify the exact user roles.",
      status: "OPEN",
    },
  });

  await prisma.evidenceRef.createMany({
    data: [
      {
        snapshotId: snapshotV1.id,
        sourceAssetId: textAsset.id,
        sourceChunkId: textChunk.id,
        claimId: summaryClaimV1.id,
        sourceType: "TEXT",
        label: "Client WhatsApp summary",
        locator: {
          kind: "text-range",
          messageIndex: 0,
          paragraphStart: 0,
          paragraphEnd: 1,
        },
        excerpt:
          "The client wants account creation, inventory sync, order tracking, Arabic support, and an MVP in six weeks.",
      },
      {
        snapshotId: snapshotV1.id,
        sourceAssetId: audioAsset.id,
        sourceChunkId: audioChunk.id,
        claimId: goalClaimV1.id,
        sourceType: "AUDIO",
        label: "Voice note from client",
        locator: {
          kind: "audio-range",
          startMs: 14000,
          endMs: 21000,
          transcriptChunk: 0,
        },
        excerpt:
          "We need something the store managers can use quickly on mobile without training.",
      },
      {
        snapshotId: snapshotV1.id,
        sourceAssetId: imageAsset.id,
        sourceChunkId: imageChunk.id,
        questionId: ambiguityQuestionV1.id,
        sourceType: "IMAGE",
        label: "Inventory workflow screenshot",
        locator: {
          kind: "image-note",
          regionLabel: "inventory-table",
          extractedHint: "manual stock workflow",
        },
        excerpt:
          "The screenshot shows a spreadsheet-based stock workflow with manual color coding for low inventory.",
      },
    ],
  });

  const shareLinkV1 = await prisma.shareLink.create({
    data: {
      snapshotId: snapshotV1.id,
      token: "requirex-demo-v1",
      status: "ACTIVE",
      createdBy: "user_demo_admin",
    },
  });

  await prisma.briefComment.create({
    data: {
      snapshotId: snapshotV1.id,
      section: "SUMMARY",
      anchorType: "CLAIM",
      claimId: summaryClaimV1.id,
      selectionText: "Arabic-language support",
      authorName: "Demo Client",
      authorEmail: "client@example.com",
      body: "Please call out that Arabic must be available from the first release, not later.",
      status: "OPEN",
    },
  });

  await prisma.followUpAnswer.create({
    data: {
      snapshotId: snapshotV1.id,
      questionId: followUpQuestionV1.id,
      body: "Store managers and branch supervisors both need mobile access in the MVP.",
      authorName: "Demo Client",
      authorEmail: "client@example.com",
    },
  });

  await prisma.revisionEvent.createMany({
    data: [
      {
        projectId: project.id,
        sessionId: session.id,
        snapshotId: snapshotV1.id,
        type: "GENERATED",
        actorType: "SYSTEM",
        summary: "Generated the first brief snapshot from mixed-source intake.",
      },
      {
        projectId: project.id,
        sessionId: session.id,
        snapshotId: snapshotV1.id,
        type: "CLIENT_COMMENT_ADDED",
        actorType: "CLIENT",
        actorId: "client@example.com",
        summary: "Client added an inline summary comment about Arabic support priority.",
      },
      {
        projectId: project.id,
        sessionId: session.id,
        snapshotId: snapshotV1.id,
        type: "CLIENT_ANSWER_ADDED",
        actorType: "CLIENT",
        actorId: "client@example.com",
        summary: "Client answered the mobile access follow-up question.",
      },
    ],
  });

  const snapshotV2 = await prisma.briefSnapshot.create({
    data: {
      projectId: project.id,
      sessionId: session.id,
      version: 2,
      status: "DRAFT",
      sourceBundleVersion: 2,
      createdBy: "user_demo_admin",
    },
  });

  const summaryClaimV2 = await prisma.briefClaim.create({
    data: {
      snapshotId: snapshotV2.id,
      section: "SUMMARY",
      orderIndex: 0,
      text: "The client wants a retail ordering platform with first-release Arabic support, inventory sync, and order tracking.",
      confidence: "HIGH",
    },
  });

  const goalClaimV2 = await prisma.briefClaim.create({
    data: {
      snapshotId: snapshotV2.id,
      section: "GOALS",
      orderIndex: 0,
      text: "Deliver a mobile-friendly MVP for store managers and branch supervisors, while keeping reporting usable for admins.",
      confidence: "HIGH",
    },
  });

  const followUpQuestionV2 = await prisma.briefQuestion.create({
    data: {
      snapshotId: snapshotV2.id,
      section: "FOLLOW_UP_QUESTIONS",
      orderIndex: 0,
      text: "Which reports are required in the admin panel for the first release?",
      reason: "The PDF requires reporting, but the exact MVP report set is still incomplete.",
      status: "OPEN",
    },
  });

  await prisma.evidenceRef.createMany({
    data: [
      {
        snapshotId: snapshotV2.id,
        sourceAssetId: textAsset.id,
        sourceChunkId: textChunk.id,
        claimId: summaryClaimV2.id,
        sourceType: "TEXT",
        label: "Client WhatsApp summary",
        locator: {
          kind: "text-range",
          messageIndex: 0,
          paragraphStart: 0,
          paragraphEnd: 1,
        },
        excerpt:
          "The client wants account creation, inventory sync, order tracking, Arabic support, and an MVP in six weeks.",
      },
      {
        snapshotId: snapshotV2.id,
        sourceAssetId: audioAsset.id,
        sourceChunkId: audioChunk.id,
        claimId: goalClaimV2.id,
        sourceType: "AUDIO",
        label: "Voice note from client",
        locator: {
          kind: "audio-range",
          startMs: 14000,
          endMs: 21000,
          transcriptChunk: 0,
        },
        excerpt:
          "We need something the store managers can use quickly on mobile without training.",
      },
      {
        snapshotId: snapshotV2.id,
        sourceAssetId: pdfAsset.id,
        sourceChunkId: pdfChunk.id,
        questionId: followUpQuestionV2.id,
        sourceType: "PDF",
        label: "Retail requirements deck",
        locator: {
          kind: "pdf-range",
          page: 4,
          paragraphStart: 1,
          paragraphEnd: 2,
        },
        excerpt:
          "The admin panel must include sales reporting, inventory discrepancy alerts, and exportable CSV summaries.",
      },
    ],
  });

  await prisma.revisionEvent.create({
    data: {
      projectId: project.id,
      sessionId: session.id,
      snapshotId: snapshotV2.id,
      type: "REGENERATED",
      actorType: "SYSTEM",
      summary:
        "Created a second snapshot after applying client feedback and follow-up answers.",
    },
  });

  await prisma.processingJob.createMany({
    data: [
      {
        sessionId: session.id,
        resultSnapshotId: snapshotV1.id,
        type: "GENERATION",
        status: "SUCCEEDED",
        attemptCount: 1,
        startedAt: new Date("2026-05-08T09:00:00.000Z"),
        completedAt: new Date("2026-05-08T09:02:00.000Z"),
        payload: {
          inputSources: [textAsset.id, pdfAsset.id, audioAsset.id, imageAsset.id],
        },
      },
      {
        sessionId: session.id,
        sourceSnapshotId: snapshotV1.id,
        resultSnapshotId: snapshotV2.id,
        type: "REGENERATION",
        status: "SUCCEEDED",
        attemptCount: 1,
        startedAt: new Date("2026-05-08T11:00:00.000Z"),
        completedAt: new Date("2026-05-08T11:01:30.000Z"),
        payload: {
          shareLinkId: shareLinkV1.id,
          appliedCommentCount: 1,
          appliedAnswerCount: 1,
        },
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        workspaceId: workspace.id,
        projectId: project.id,
        sessionId: session.id,
        shareToken: shareLinkV1.token,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
