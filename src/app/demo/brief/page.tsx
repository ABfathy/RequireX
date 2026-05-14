import { PublicBriefView } from "@/app/brief/[shareToken]/public-brief-view";
import type { PublicBriefViewData } from "@/server/services/public-review";
import type {
  BriefClaimSection,
  BriefConfidence,
  BriefQuestionSection,
  BriefQuestionStatus,
  BriefSnapshotStatus,
  RevisionEventType,
} from "../../../../generated/prisma/client";

const DEMO_DATA: PublicBriefViewData = {
  shareToken: "demo",
  snapshot: {
    id: "demo-snap-2",
    version: 2,
    status: "SHARED" as BriefSnapshotStatus,
    createdAt: new Date("2026-05-14T09:00:00Z"),
  },
  project: {
    id: "demo-proj-1",
    name: "Softworks Retail App",
    clientName: "Softworks",
  },
  claims: [
    {
      id: "demo-claim-1",
      section: "SUMMARY" as BriefClaimSection,
      orderIndex: 1,
      text: "Softworks requires a mobile-first retail ordering application that enables store managers and sales staff to place, track, and fulfil product orders across multiple store locations from a single interface.",
      confidence: "HIGH" as BriefConfidence,
    },
    {
      id: "demo-claim-2",
      section: "SUMMARY" as BriefClaimSection,
      orderIndex: 2,
      text: "The system replaces the current spreadsheet-based workflow and must support offline operation for store staff with intermittent connectivity, synchronising automatically when connectivity is restored.",
      confidence: "HIGH" as BriefConfidence,
    },
    {
      id: "demo-claim-3",
      section: "GOALS" as BriefClaimSection,
      orderIndex: 3,
      text: "Reduce order processing time from an average of 45 minutes to under 5 minutes per order by eliminating manual spreadsheet entry and email-based approval chains.",
      confidence: "HIGH" as BriefConfidence,
    },
    {
      id: "demo-claim-4",
      section: "GOALS" as BriefClaimSection,
      orderIndex: 4,
      text: "Provide real-time inventory visibility across all store locations so that managers can make informed purchasing decisions without contacting head office.",
      confidence: "HIGH" as BriefConfidence,
    },
    {
      id: "demo-claim-5",
      section: "MAIN_FEATURES" as BriefClaimSection,
      orderIndex: 5,
      text: "Order management module: create, edit, and submit purchase orders with product search, quantity entry, and supplier selection; orders route through a configurable approval workflow before dispatch.",
      confidence: "MEDIUM" as BriefConfidence,
    },
    {
      id: "demo-claim-6",
      section: "MAIN_FEATURES" as BriefClaimSection,
      orderIndex: 6,
      text: "Inventory tracking dashboard: real-time stock levels per SKU per store location, low-stock alerts configurable per product category, and one-click reorder from the dashboard.",
      confidence: "MEDIUM" as BriefConfidence,
    },
    {
      id: "demo-claim-7",
      section: "MAIN_FEATURES" as BriefClaimSection,
      orderIndex: 7,
      text: "Reporting and analytics: weekly and monthly sales and order reports exportable to PDF and CSV; regional manager view aggregating data across assigned store clusters.",
      confidence: "MEDIUM" as BriefConfidence,
    },
    {
      id: "demo-claim-8",
      section: "FUNCTIONAL_REQUIREMENTS" as BriefClaimSection,
      orderIndex: 8,
      text: "Role-based access control with four roles — Store Staff, Store Manager, Regional Manager, and Admin — each with distinct permissions for order creation, approval, reporting, and user management.",
      confidence: "MEDIUM" as BriefConfidence,
    },
    {
      id: "demo-claim-9",
      section: "FUNCTIONAL_REQUIREMENTS" as BriefClaimSection,
      orderIndex: 9,
      text: "Offline mode: the application must function without network connectivity for order creation and inventory viewing, queuing changes locally and syncing to the server when connectivity is restored.",
      confidence: "MEDIUM" as BriefConfidence,
    },
    {
      id: "demo-claim-10",
      section: "NON_FUNCTIONAL_REQUIREMENTS" as BriefClaimSection,
      orderIndex: 10,
      text: "All API responses must complete in under 2 seconds at the 95th percentile under a sustained load of 200 concurrent users. The application must achieve 99.5% uptime measured monthly.",
      confidence: "HIGH" as BriefConfidence,
    },
  ],
  questions: [
    {
      id: "demo-q-1",
      section: "AMBIGUITIES" as BriefQuestionSection,
      orderIndex: 1,
      text: "When two store devices modify the same inventory record while offline and then sync simultaneously, which record should take precedence — the most recent timestamp, the higher quantity, or should conflicts be flagged for manual resolution?",
      reason: "The client specified offline sync but provided no conflict resolution strategy. This will affect data integrity for shared inventory across store clusters.",
      status: "OPEN" as BriefQuestionStatus,
      answerText: null,
    },
    {
      id: "demo-q-2",
      section: "AMBIGUITIES" as BriefQuestionSection,
      orderIndex: 2,
      text: "For multi-store inventory, does each store maintain its own independent stock count, or is there a shared pool that individual locations draw from?",
      reason: "The voice note and WhatsApp summary reference both 'store inventory' and 'central warehouse stock' without distinguishing whether these are separate ledgers or the same pool.",
      status: "OPEN" as BriefQuestionStatus,
      answerText: null,
    },
    {
      id: "demo-q-3",
      section: "FOLLOW_UP_QUESTIONS" as BriefQuestionSection,
      orderIndex: 3,
      text: "Beyond PDF and CSV, are there specific BI tools (Power BI, Tableau, Google Looker) that regional managers currently use that the export format should be compatible with?",
      reason: "The requirements deck mentions report exports but does not specify integration targets. Supporting a native connector vs. CSV export is a significant scope difference.",
      status: "OPEN" as BriefQuestionStatus,
      answerText: null,
    },
  ],
  comments: [
    {
      id: "demo-comment-1",
      section: "FUNCTIONAL_REQUIREMENTS",
      anchorType: "SECTION",
      body: "The offline mode requirement is critical for our warehouse locations where WiFi drops frequently. Please ensure this is treated as P0 and not de-scoped.",
      authorName: "James Okafor",
      authorEmail: "james.okafor@softworks.co",
      claimId: null,
      questionId: null,
      createdAt: new Date("2026-05-14T10:30:00Z"),
    },
    {
      id: "demo-comment-2",
      section: "NON_FUNCTIONAL_REQUIREMENTS",
      anchorType: "CLAIM",
      body: "The 2-second SLA is acceptable for most screens but the inventory dashboard may need a longer timeout — it aggregates data from 40+ locations.",
      authorName: "Sarah Chen",
      authorEmail: "s.chen@softworks.co",
      claimId: "demo-claim-10",
      questionId: null,
      createdAt: new Date("2026-05-14T11:15:00Z"),
    },
  ],
  revisions: [
    {
      id: "demo-rev-1",
      type: "GENERATED" as RevisionEventType,
      summary: "Initial brief generated from WhatsApp summary, requirements deck, voice note, and spreadsheet screenshot.",
      createdAt: new Date("2026-05-13T14:00:00Z"),
      snapshotVersion: 1,
    },
    {
      id: "demo-rev-2",
      type: "REGENERATED" as RevisionEventType,
      summary: "Regenerated with updated voice note transcript — expanded offline mode requirements and added SLA target.",
      createdAt: new Date("2026-05-14T09:00:00Z"),
      snapshotVersion: 2,
    },
    {
      id: "demo-rev-3",
      type: "CLIENT_COMMENT_ADDED" as RevisionEventType,
      summary: "James Okafor commented on Functional Requirements — offline mode is P0.",
      createdAt: new Date("2026-05-14T10:30:00Z"),
      snapshotVersion: null,
    },
  ],
  diagrams: [
    {
      id: "demo-diagram-1",
      diagramType: "FLOWCHART",
      title: "Order Processing Flow",
      mermaidCode: `flowchart TD
    A([Store Staff]) -->|Creates order| B[Draft Order]
    B --> C{Submit for approval}
    C -->|Offline| D[(Local Queue)]
    D -->|Sync on reconnect| C
    C -->|Online| E[Manager Review]
    E -->|Approve| F[Order Confirmed]
    E -->|Reject| G[Order Returned]
    G --> B
    F --> H[Dispatch to Supplier]
    H --> I[Delivery Tracked]
    I --> J([Stock Updated])`,
      description: "End-to-end order lifecycle from creation through approval and dispatch, including the offline queue path.",
      createdAt: new Date("2026-05-14T09:00:00Z"),
    },
  ],
};

export default function DemoBriefPage() {
  return <PublicBriefView data={DEMO_DATA} />;
}
