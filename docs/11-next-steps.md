# Next Steps

## 1 — Close the Public Review Loop (blocker)

Everything needed to receive client feedback exists except the path that puts a brief in front of a client.

**a. Share-link creation service**
- Add `createShareLink(snapshotId, createdBy, expiresAt?)` in a new `src/server/services/share-link.ts`
- Returns a `ShareLink` row with a cryptographically random token
- Sets snapshot status to `SHARED`

**b. Share-link creation API**
- `POST /api/snapshots/[snapshotId]/share` — calls the service; returns `{ token, url }`
- Protected by `requireInternalActor()`

**c. Share button in the internal workspace**
- Button in the doc header or right pane that calls the API and shows the resulting URL
- Copy-to-clipboard; show expiry time

**d. Wire `/brief/[shareToken]` to real data**
- Load `ShareLink` → `BriefSnapshot` → `snapshotToDocLines()` on page load
- Replace `MOCK_REQUIREMENTS` and `MOCK_REVISIONS` with data from `BriefClaim`, `BriefQuestion`, and `RevisionEvent`

---

## 2 — Code Quality (from Discovered Enhancements)

Non-blocking but should be done before the next production push:

- **PDF parser ReDoS** — `pdf-text.ts` `STREAM_START_PATTERN`: replace `(?:.|\n|\r)*?` with `[\s\S]*?`
- **Concurrent processing guard** — add optimistic status pre-check in `source-processing.ts` to prevent double-processing
- **Audio version tracking** — add `transcriptionProvider` / version field to `providerMetadata` like PDF does
- **Generation timeout** — wrap the Gemini streaming call in a 10-minute `AbortSignal`
- **SSE stream close on error** — call `controller.close()` after writing an error event in `api/generate/route.ts`
- ~~**Configurable bundle size**~~ — ✅ done: `PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE` (default 750 000); each source now contributes full text, no shared budget split

---

## 3 — Test Coverage

- `pnpm test:e2e` — implement with Playwright; cover: sign-in, create project, upload source, generate brief, share link, submit comment
- `pnpm test:a11y` — implement with axe-core or Playwright accessibility checks; cover public brief page and editor shell
- Unit test gaps: download failure, empty PDF/audio text, partial chunk creation failure in `source-processing.test.ts`

---

## Not A Priority Until 1 Is Done

- Revision diff view (side-by-side before/after)
- Internal approval workflow over generated snapshots
- Async generation as default (`BRIEF_GENERATION_ASYNC=1`)
- Chat tab standalone send input (currently only triggered from document selection)
- Latin-1 PDF encoding fix (replace built-in parser with a library like `pdf-parse`)
