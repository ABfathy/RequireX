# Task List

This task list is meant to be executable by multiple people in parallel. Each workstream is written to be as self-sufficient as possible. Where two streams must meet, a dedicated merge workstream is defined and should be owned by two engineers together.

## Delivery Rules

- each workstream should produce code that can be reviewed independently
- shared contracts must be agreed before parallel implementation starts
- if a stream depends on another stream, the stream should still complete its local scaffolding and mocks first
- merge workstreams are not optional cleanup; they are planned integration tasks

## Workstream 1: Platform and Developer Experience

Objective:
- ~~create the base app shell and developer workflow so the rest of the team can build without blocking~~

Detailed tasks:
- ~~scaffold the `Next.js` App Router project with TypeScript~~
- ~~add `Tailwind CSS` and define initial layout tokens for desktop-first responsive behavior~~
- ~~initialize `shadcn/ui` and set `components/ui` as the shared component baseline~~
- ~~create a shared environment variable module and document required secrets~~
- ~~choose package manager and repo conventions~~
- ~~add linting, formatting, and import conventions~~
- ~~define base folder structure for:~~
  - app routes
  - components
  - components/ui
  - lib
  - server
  - tests
- ~~add placeholder routes for the internal app and public brief page~~
- ~~keep landing page work explicitly optional until the core workflow is stable~~
- ~~add base error and loading boundaries~~
- ~~add CI-ready script placeholders in `package.json`~~

Outputs:
- ~~bootable app scaffold~~
- ~~consistent repo structure~~
- ~~shared DX baseline for the team~~

## Workstream 2: Data Model and Persistence

Objective:
- ~~define the app’s durable backend model so all features can store and query the same entities~~

Detailed tasks:
- ~~define `Prisma` schema for:~~
  - `Workspace`
  - `Project`
  - `IntakeSession`
  - `SourceAsset`
  - `BriefSnapshot`
  - `BriefComment`
  - `FollowUpAnswer`
  - `RevisionEvent`
  - `ShareLink`
- ~~treat `BriefSnapshot` as the immutable parent record for generated brief versions~~
- ~~persist generated brief content in relational child tables:~~
  - `BriefClaim`
  - `BriefQuestion`
  - `EvidenceRef`
- ~~add `SourceChunk` and `ProcessingJob` so evidence provenance and async state are durable from the start~~
- ~~add section and ordering fields so snapshot rendering order is deterministic~~
- ~~keep evidence locator payloads in `Json` fields rather than over-normalizing source-specific locator shapes~~
- ~~define enums for statuses, source types, and revision event types~~
- ~~add unique constraints and indexes for:~~
  - share token lookup
  - snapshot version lookup
  - session timeline queries
  - source asset lookup by session
- ~~define and document invariants that Prisma alone does not fully enforce:~~
  - evidence belongs to either one claim or one question
  - item-targeted comments and answers must reference rows from the same snapshot version
- ~~add seed strategy for local demo data~~
- ~~document naming and deletion behavior for each entity~~
- ~~define immutable snapshot policy and mutable feedback policy~~

Outputs:
- ~~complete first-pass schema~~
- ~~migration plan~~
- ~~domain ownership rules for persistent data~~

## Workstream 3: Authentication and Access Control

Objective:
- secure internal routes while keeping public review frictionless

Detailed tasks:
- ~~configure `Clerk` in the app~~
- ~~protect all internal app routes~~
- ~~define explicit public route exceptions~~
- ~~define server-side authorization helpers for private mutations~~
- define public mutation boundaries for:
  - client comments
  - follow-up answers
  - brief confirmation
- define rate-limit assumptions for public endpoints
- define actor attribution rules for internal vs client actions
- document what the client can never do in v1

Outputs:
- working auth boundary
- clear internal/public permission map

**Status (2026-05-09):** PARTIAL. Clerk is wired, `/app` is protected, the public brief route remains open, and private API helpers exist in `src/server/auth/internal.ts`. Public client mutations, rate limiting, and final internal/public action rules are still not implemented.

## Workstream 4: Intake and Asset Pipeline

Objective:
- make source intake reliable across all supported input types

Detailed tasks:
- ~~build raw text intake flow~~
- ~~build image upload flow~~
- ~~build audio upload flow~~
- ~~build PDF upload flow~~
- ~~build mixed-source folder upload flow~~
- ~~define accepted MIME types and upload size limits~~
- ~~store asset records before generation starts~~
- add upload error states
- ~~add upload validation~~
- ~~add source labels and display names for uploaded assets~~
- ~~define asset lifecycle states:~~
  - uploaded
  - queued
  - processing
  - processed
  - failed
- add progress-state payloads the UI can consume
- document how mixed-source submissions are assembled into one session
- ~~document that one project always represents one client, even when many intake sessions exist~~

Outputs:
- complete intake API surface
- ~~persistent source asset tracking~~
- UI-consumable intake status model
- ~~Some unit tests in /tests/unit to validate functionality~~

**Status (2026-05-09):** PARTIAL. Core intake is in place: UploadThing router wired for image/audio/pdf/mixed uploads, text intake route added, `SourceAsset` persistence implemented, MIME validation added, and unit tests exist in `tests/unit/assets.test.ts` and `tests/unit/validators.test.ts`. Remaining gaps are upload error/progress UX, mixed-source submission assembly, and any status transitions beyond the initial `UPLOADED` write owned by Workstream 5.

## Workstream 5: AI Processing and Brief Generation

Objective:
- turn uploaded source material into validated brief snapshots

Detailed tasks:
- wire `Inngest` job triggers for generation and regeneration
- implement source bundle assembly from stored assets
- implement text normalization
- implement audio transcription integration path
- implement PDF extraction integration path
- implement image interpretation integration path
- define the prompt input format for mixed-source sessions
- call `Vertex AI` through `@google/genai`
- validate AI output against the brief contract
- map model output into a transactional relational write set:
  - one new `BriefSnapshot`
  - ordered `BriefClaim` rows for `summary` and `goals`
  - ordered `BriefQuestion` rows for `ambiguities` and `followUpQuestions`
  - `EvidenceRef` rows attached to exactly one claim or question
- persist snapshots and generation events safely
- define retry behavior and non-retriable error handling
- expose generation progress states to the UI

Outputs:
- durable end-to-end generation pipeline
- contract-safe snapshot persistence

## Workstream 6: Internal Workspace UI

Objective:
- deliver the main internal working surface for project managers and developers

Detailed tasks:
- build authenticated workspace shell
- build left rail for projects and sessions
- build center brief renderer as the dominant reading surface
- build bottom refinement composer
- build right-side inspector for:
  - source assets
  - chat history
  - revision timeline
  - client feedback
- implement desktop-first layout behavior
- implement responsive fallback behavior for smaller screens
- build citation trigger UI and evidence detail panel
- add loading, empty, and failure states for each major panel
- keep workspace visuals calmer than landing-page visuals

Outputs:
- usable internal app shell
- brief-first workspace layout

## Workstream 7: Public Review UI

Objective:
- deliver the client-facing review experience with no-auth access

Detailed tasks:
- build public brief page route
- render the brief cleanly with strong typography and section clarity
- build inline highlighted comment submission
- build section-targeted comment submission
- build follow-up question answering flow with structured controls
- build confirmation action
- add client success and failure states
- optimize public page for mobile support without weakening desktop readability
- ensure citation references remain readable and optional
- define optional lightweight access-code gate as a bonus path, not a core blocker

Outputs:
- complete no-auth review path
- working comment and answer UX

## Workstream 8: Revision, Refinement, and History

Objective:
- support brief evolution without losing trust or rollback capability

Detailed tasks:
- implement selected-section refinement flow
- implement regenerate-from-feedback flow
- create revision timeline rendering rules
- implement revision diff review between consecutive brief snapshots
- define diff categories:
  - added points
  - updated points
  - resolved ambiguities
  - newly introduced questions
- persist revision events with actor attribution
- implement snapshot restore action
- define what creates a new snapshot vs an event-only update
- add concise change summaries for the timeline
- define how comments and answers attach to a specific snapshot version

Outputs:
- stable revision model
- visible change history
- readable snapshot-to-snapshot change review

## Workstream 9: Motion, Haptics, and Demo Polish

Objective:
- add novelty deliberately without harming performance or readability

Detailed tasks:
- integrate `react-bits` only on an optional landing page, empty states, or controlled decorative surfaces
- add `animejs` transitions for:
  - panel changes
  - brief reveal/update
  - share or success states
- add reduced-motion handling
- integrate `web-haptics` only for supported mobile success events
- add haptics capability checks and user toggle behavior
- test animation and haptic behavior on lower-end device assumptions
- define a hard rule for disabling any effect that slows the internal workspace

Outputs:
- polished demo experience
- controlled novelty layer

## Workstream 10: Testing and Release Quality

Objective:
- prove the product is stable enough for demo use

Detailed tasks:
- configure `Vitest`
- configure `React Testing Library`
- configure `@testing-library/jest-dom`
- configure `Playwright`
- wire `axe-core` accessibility checks into e2e flow
- add unit tests for:
  - contract validation
  - evidence mapping
  - share link behavior
  - service-level generation logic
- add component tests for:
  - brief renderer
  - comment form
  - follow-up answer form
  - processing state UI
- add desktop e2e happy path
- add public mobile review e2e happy path
- add auth and permissions tests
- add accessibility smoke tests for critical pages

Outputs:
- working automated quality baseline
- demo-safety confidence on core flows

## Merge Workstream M1: Platform + Data Integration

Owners:
- 2 engineers

Why this exists:
- foundation and persistence can be built separately, but the real app cannot start until both agree on runtime structure

Detailed tasks:
- connect the base app to the real database client
- wire shared domain types to actual persistence calls
- align env handling with database and upload configuration
- validate migration flow on a fresh local environment
- add seed path for demoable local data

Done when:
- a fresh clone can boot, migrate, and talk to the database

## Merge Workstream M2: Auth + Internal Workspace Integration

Owners:
- 2 engineers

Why this exists:
- protected routing and the workspace shell are implemented separately but must meet cleanly

Detailed tasks:
- connect `Clerk` session state to internal app shell
- verify protected route redirects and loading states
- gate private navigation and actions correctly
- ensure internal route layout does not leak on public pages
- test signed-in and signed-out app behavior end to end

Done when:
- internal users can sign in and reach a stable workspace shell

## Merge Workstream M3: Intake + AI Generation Integration

Owners:
- 2 engineers

Why this exists:
- uploads and generation are distinct systems that must handshake through real asset records and job triggers

Detailed tasks:
- connect upload completion to generation job creation
- verify all source asset types are included in normalized source bundles
- test failure states when one source type fails
- ensure session status updates correctly during processing
- surface job progress back into the internal UI

Done when:
- a mixed-source intake session can move from upload to completed brief snapshot

## Merge Workstream M4: Brief Contract + Internal UI Integration

Owners:
- 2 engineers

Why this exists:
- the UI should not drift from the stored contract shape

Detailed tasks:
- bind brief renderer to the real `BriefSnapshot` structure
- connect claims and questions to citation affordances
- verify section targeting for refinement
- validate empty-state rendering for partially complete snapshots or error states
- confirm contract changes do not silently break rendering

Done when:
- the internal workspace renders persisted snapshots accurately

## Merge Workstream M5: Public Review + Revision Integration

Owners:
- 2 engineers

Why this exists:
- client feedback is only valuable if it lands cleanly in the revision system

Detailed tasks:
- connect comments and answers to the correct snapshot and section targets
- connect highlighted comment anchors to the correct snapshot targets
- ensure public submissions create the correct revision events
- make feedback visible in the internal workspace timeline and inspector
- connect “regenerate from feedback” to real snapshot history
- verify old share links still reference the intended snapshot version behavior

Done when:
- client feedback can drive a real new snapshot with visible history

## Merge Workstream M6: Motion + Accessibility + Testing Hardening

Owners:
- 2 engineers

Why this exists:
- polish work often breaks performance, motion preferences, or test stability

Detailed tasks:
- test all added motion against reduced-motion behavior
- ensure haptics never block interaction
- stabilize Playwright selectors around animated surfaces
- run accessibility checks after novelty integration
- remove or reduce any effect that harms workspace performance

Done when:
- polished UI still passes the practical quality bar

## Merge Workstream M7: Final Product Integration

Owners:
- 2 engineers

Why this exists:
- the last failure mode in hackathons is that subsystems work individually but the full story does not

Detailed tasks:
- run the full internal happy path from project creation to brief generation
- run the full public happy path from share link to comment to confirmation
- run the regeneration path from feedback to new snapshot
- verify revision history, citations, and status changes all agree
- produce a final bug list with severity and owner

Done when:
- the full demo flow works without manual patching between steps

## Suggested Team Split

### Track A: Platform and Data

- Workstream 1
- Workstream 2
- Merge M1

Focus:
- repo foundation
- schema ownership
- environment and persistence baseline

### Track B: Auth and Internal Shell

- Workstream 3
- Workstream 6
- Merge M2

Focus:
- route protection
- internal app shell
- signed-in user flow

### Track C: Intake and Generation

- Workstream 4
- Workstream 5
- Merge M3

Focus:
- uploads
- asset pipeline
- AI generation and processing states

### Track D: Public Review and Revisions

- Workstream 7
- Workstream 8
- Merge M4
- Merge M5

Focus:
- client review experience
- snapshot evolution
- brief rendering consistency

### Track E: Quality, Polish, and Final Integration

- Workstream 9
- Workstream 10
- Merge M6
- Merge M7

Focus:
- motion and haptics polish
- automated testing
- accessibility
- full demo-path integration

## Definition of Done

A task is not done until:

- behavior works locally
- data model impact is captured
- error states are handled
- tests are added where appropriate
- integration points are documented
- the result still respects the hackathon scope
