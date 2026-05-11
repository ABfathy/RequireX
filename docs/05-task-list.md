# Task List

## Done

- [x] Clerk auth routes and middleware
- [x] Custom sign-in, sign-up, and SSO callback UI flow
- [x] Per-user workspace bootstrap
- [x] Project listing and active-project selection
- [x] Project creation server action
- [x] Initial intake-session creation for new projects
- [x] `/app` server-side project/session/source bootstrap
- [x] Source list loading
- [x] Pasted-text asset creation
- [x] UploadThing integration for mixed source uploads
- [x] Source rename and delete APIs
- [x] Client-side source upload, refresh, retry, and optimistic updates
- [x] Public review comment route and service
- [x] Public review answer route and service
- [x] Public review confirmation route and service
- [x] Public review rate limiting and read-only snapshot guards
- [x] Unit tests for asset services, validators, public auth, and public review flows

## In Progress / Partially Done

- [ ] Internal document view has the correct shell and state machine, but still renders placeholder lines instead of real snapshot data
- [ ] Public brief page has the real responsive shell and loading state, but still renders `MOCK_REQUIREMENTS` and `MOCK_REVISIONS`
- [ ] Generation and regeneration request APIs create `ProcessingJob` rows and dispatch Inngest events, but the actual processing pipeline is still unimplemented
- [ ] Status UI primitives exist (`AppState`, `StatusBar`, loading/error states), but generation status is not yet driven by real job progression
- [ ] Public review backend mutations are real, but the public page UI still uses local-only submit behavior

## Next Engineering Work

### Backend Work

- [ ] Implement the source-processing pipeline after asset upload or pasted-text creation
- [ ] Move assets beyond `UPLOADED` into real processing states with durable status updates
- [ ] Create `SourceChunk` rows from uploaded and pasted content
- [ ] Define and implement the text normalization/extraction layer that feeds generation
- [ ] Generate `BriefSnapshot`, `BriefClaim`, `BriefQuestion`, and `EvidenceRef`
- [ ] Mark generation and regeneration jobs `SUCCEEDED` or `FAILED` with meaningful error codes and messages
- [ ] Add a read-side query surface for the latest snapshot on an intake session
- [ ] Add a read-side query surface for revision events and public feedback in the internal workspace
- [ ] Implement share-link creation from the internal workspace
- [ ] Implement share-link/snapshot loading for `/brief/[shareToken]`
- [ ] Replace placeholder `test:e2e` and `test:a11y` scripts with real commands and coverage

### Frontend / UI Work

- [ ] Wire the "Generate Brief" action in the internal workspace to `POST /api/generate`
- [ ] Surface queued/running/failed generation state honestly in `DocView` and `StatusBar`
- [ ] Wire `DocView` to live snapshot data instead of placeholder requirement lines
- [ ] Render claims, questions, and evidence in the internal editor using snapshot-backed data
- [ ] Replace public mock brief data with real share-link/snapshot-backed data
-----
- [ ] Wire public comment submission to `/api/public/briefs/[shareToken]/comments`
- [ ] Wire public answer submission to `/api/public/briefs/[shareToken]/answers`
- [ ] Wire public confirmation submission to `/api/public/briefs/[shareToken]/confirm`
- [ ] Surface public mutation success, validation, rate-limit, and read-only errors in the UI
- [ ] Show revision history and public feedback inside the internal workspace once the read models exist
