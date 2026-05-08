# 7-Day Hackathon Roadmap

## Overall Rule

Days 1 and 2 are for plan confirmation and implementation setup. Core scope should freeze at the end of Day 2.

## Day 1: Decision Lock

- confirm the stack
- confirm brief contract
- confirm route model
- confirm project/session model
- confirm internal vs public permissions
- confirm citation UX
- confirm testing stack

Deliverables:

- approved docs package
- accepted schema outline
- accepted UI layout

## Day 2: Skeleton and Setup

- scaffold app
- configure auth
- configure database and upload/storage provider
- configure job runner
- configure AI client
- configure test frameworks
- scaffold internal and public route shells

Deliverables:

- repo scaffold
- working auth shell
- working database connection
- working upload/storage connection
- working test harness

## Day 3: Intake and Data Layer

- implement project/session flows
- implement upload handling
- implement mixed-source folder upload
- persist source metadata
- implement basic processing states
- implement initial Prisma schema and migrations

Deliverables:

- upload pipeline reachable
- sources stored
- projects and sessions persisted

## Day 4: AI Generation Loop

- implement normalization steps
- implement generation job
- validate output into contract shape
- persist snapshots and revision events
- render first generated brief

Deliverables:

- end-to-end generation from at least text and one file type
- first stable brief rendering

## Day 5: Review and Refinement

- implement citation UX
- implement selected-section refinement
- implement client share links
- implement public inline comment and answer flows
- implement optional access-code gate only if core public review is already stable

Deliverables:

- public review works
- internal refinement works
- evidence references visible

## Day 6: Polish and Quality

- responsive support
- animation and novelty integration
- mobile haptics integration
- regression fixes
- add missing tests
- accessibility fixes

Deliverables:

- stable desktop internal workflow
- stable mobile public review
- polished demo behavior

## Day 7: Hardening and Demo Prep

- bug triage only
- test pass review
- fallback messaging for failure states
- seed data or demo project setup
- prepare demo script
- prepare backup screenshots and flows
- build the landing page only if the core workflow is already complete and stable

Deliverables:

- deployment ready
- demo ready
- low-risk presentation flow

## Scope Freeze Rules

After Day 2:

- no new major product areas
- no new automation channels
- no multi-tenant pivot
- no large schema redesign unless blocked

After Day 5:

- only fixes, polish, and safe enhancements
