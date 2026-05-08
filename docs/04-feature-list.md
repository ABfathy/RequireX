# Feature List

## Core V1 Features

### Internal Workspace

- internal sign-in for team members
- shared workspace for the hackathon team
- project creation
- one client per project
- intake session creation inside a project
- project/session sidebar history

### Source Intake

- raw text input or pasted messages
- image upload
- audio upload
- PDF upload
- mixed-source folder upload
- mixed-source intake in the same session
- upload status and processing states

### AI Brief Generation

- asynchronous generation flow
- plain-language summary output
- goals and success criteria output
- ambiguities output
- follow-up questions output
- claim-level evidence references
- confidence tagging on generated claims

### Internal Review and Refinement

- read structured brief in the center workspace
- inspect evidence for each claim or question
- select a section or claim for refinement
- AI-assisted rewrite or clarification flow
- new snapshot creation after regeneration
- revision timeline

### Public Client Review

- unique public share link
- no mandatory client account
- readable public brief layout
- inline comments on highlighted sections or targeted brief areas
- follow-up question answers through structured inputs
- brief confirmation action

### Persistence

- save projects
- save sessions
- save assets and metadata
- save snapshots
- save revision events
- save comments and answers

## Important UX Features

- desktop-first internal authoring flow
- mobile support for public review
- light mobile support for internal access
- compact citation affordance
- clean loading and async progress states
- reduced-motion compatibility

## Novelty Features That Still Fit Scope

- revision diff review between brief versions
- tasteful landing background treatment with `react-bits`
- subtle workspace transitions with `animejs`
- mobile success haptics with `web-haptics`
- codex-like brief-first workspace shell

## Stretch Features

- optional access-code gate before viewing the brief
- client display name capture
- source asset preview thumbnails
- confidence-based highlighting
- templated AI refinement prompts

## Deferred Features

- broad document format support beyond text, image, audio, and PDF
- direct client inline editing of brief text
- multi-tenant SaaS workspace model
- task management or PM boards
- invoicing, proposals, or contracts
- deep CRM functionality
- third-party intake automation like `n8n` during the hackathon build

## Explicit Non-Goals

- generic AI chat app
- project management platform
- omnichannel CRM
- no-code automation suite
- heavy analytics dashboard

## Acceptance Bar

V1 is successful only if:

- all core source types work
- a valid brief snapshot is generated
- evidence references are visible
- the public review flow works without auth
- revisions create stable history
