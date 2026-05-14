import { EditorShell } from "@/components/editor/editor-shell";
import type { DocLineData } from "@/components/editor/doc-view";
import type { ProjectListItem } from "@/components/editor/project-sidebar";
import type { SourceItem } from "@/components/editor/right-pane";

const DEMO_PROJECT: ProjectListItem = {
  id: "demo-proj-1",
  name: "Softworks Retail App",
  clientName: "Softworks",
  updatedAt: "2026-05-14T09:00:00Z",
};

const DEMO_SOURCES: SourceItem[] = [
  {
    id: "demo-src-1",
    label: "Client WhatsApp summary",
    sourceType: "TEXT",
    status: "PROCESSED",
    createdAt: "2026-05-13T13:00:00Z",
  },
  {
    id: "demo-src-2",
    label: "Retail requirements deck",
    sourceType: "PDF",
    status: "PROCESSED",
    createdAt: "2026-05-13T13:05:00Z",
  },
  {
    id: "demo-src-3",
    label: "Voice note from client",
    sourceType: "AUDIO",
    status: "PROCESSED",
    createdAt: "2026-05-13T13:10:00Z",
  },
  {
    id: "demo-src-4",
    label: "Screenshot of current spreadsheet flow",
    sourceType: "IMAGE",
    status: "PROCESSED",
    createdAt: "2026-05-13T13:12:00Z",
  },
];

const DEMO_LINES: DocLineData[] = [
  { lineNum: 1, type: "meta", text: "v2 - generated", small: true },
  { lineNum: 0, type: "blank" },
  { lineNum: 2, type: "h2", text: "Summary" },
  {
    lineNum: 3,
    type: "body",
    text: "Softworks requires a mobile-first retail ordering application that enables store managers and sales staff to place, track, and fulfil product orders across multiple store locations from a single interface.",
    reqId: "demo-claim-1",
    reqType: "claim",
    section: "SUMMARY",
    orderIndex: 1,
    tags: ["high"],
    evidence: [
      {
        sourceId: "demo-src-1",
        ref: "S1",
        quote: "The client wants a retail ordering app with something the store managers can actually use on their phones.",
        sourceName: "Client WhatsApp summary",
      },
    ],
  },
  {
    lineNum: 4,
    type: "body",
    text: "The system replaces the current spreadsheet-based workflow and must support offline operation for store staff with intermittent connectivity, synchronising automatically when connectivity is restored.",
    reqId: "demo-claim-2",
    reqType: "claim",
    section: "SUMMARY",
    orderIndex: 2,
    tags: ["high"],
    evidence: [
      {
        sourceId: "demo-src-4",
        ref: "S4",
        quote: "The screenshot shows a spreadsheet with 12 columns being manually filled in across stores.",
        sourceName: "Screenshot of current spreadsheet flow",
      },
    ],
  },
  { lineNum: 0, type: "blank" },
  { lineNum: 5, type: "h2", text: "Goals" },
  {
    lineNum: 6,
    type: "body",
    text: "Reduce order processing time from an average of 45 minutes to under 5 minutes per order by eliminating manual spreadsheet entry and email-based approval chains.",
    reqId: "demo-claim-3",
    reqType: "claim",
    section: "GOALS",
    orderIndex: 3,
    tags: ["high"],
    evidence: [
      {
        sourceId: "demo-src-3",
        ref: "S3",
        quote: "Right now it takes us almost an hour just to raise a single order — it shouldn't be that way.",
        sourceName: "Voice note from client",
      },
    ],
  },
  {
    lineNum: 7,
    type: "body",
    text: "Provide real-time inventory visibility across all store locations so that managers can make informed purchasing decisions without contacting head office.",
    reqId: "demo-claim-4",
    reqType: "claim",
    section: "GOALS",
    orderIndex: 4,
    tags: ["high"],
    evidence: [
      {
        sourceId: "demo-src-2",
        ref: "S2",
        quote: "The admin panel must include real-time stock reporting across all locations.",
        sourceName: "Retail requirements deck",
      },
    ],
  },
  { lineNum: 0, type: "blank" },
  { lineNum: 8, type: "h2", text: "Ambiguities" },
  {
    lineNum: 9,
    type: "body",
    text: "When two store devices modify the same inventory record while offline and then sync simultaneously, which record should take precedence?",
    reqId: "demo-q-1",
    reqType: "question",
    tags: ["open"],
    evidence: [],
  },
  {
    lineNum: 10,
    type: "body",
    text: "The client specified offline sync but provided no conflict resolution strategy. This will affect data integrity for shared inventory across store clusters.",
    small: true,
  },
  {
    lineNum: 11,
    type: "body",
    text: "For multi-store inventory, does each store maintain its own independent stock count, or is there a shared pool that individual locations draw from?",
    reqId: "demo-q-2",
    reqType: "question",
    tags: ["open"],
    evidence: [],
  },
  {
    lineNum: 12,
    type: "body",
    text: "The voice note and WhatsApp summary reference both 'store inventory' and 'central warehouse stock' without distinguishing whether these are separate ledgers or the same pool.",
    small: true,
  },
  { lineNum: 0, type: "blank" },
];

const DEMO_PROJECT_CACHE = {
  "demo-proj-1": {
    session: { id: "demo-session", title: "Initial Retail Intake" },
    sources: DEMO_SOURCES,
  },
};

export default function DemoWorkspacePage() {
  return (
    <EditorShell
      projects={[DEMO_PROJECT]}
      activeProjectId="demo-proj-1"
      session={{ id: "demo-session", title: "Initial Retail Intake" }}
      initialSources={DEMO_SOURCES}
      initialProjectCache={DEMO_PROJECT_CACHE}
      lines={DEMO_LINES}
      hasSnapshot={true}
      initialSnapshotId="demo-snap-2"
    />
  );
}
