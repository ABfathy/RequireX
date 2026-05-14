# Next Steps

The full product loop is closed. The remaining work is quality and coverage.

---

## 1 — Wire Standalone Chat Send Input

The chat tab in the right pane renders messages correctly but the standalone send input is not connected to `/api/revise`. Currently the only way to trigger a chat revision is by selecting text in the document. Wiring the standalone input is a straightforward addition to `EditorShell`.

---

## 2 — Code Quality (Discovered Enhancements)

Non-blocking but should be done before the next production push:

- **PDF parser ReDoS** — `pdf-text.ts` `STREAM_START_PATTERN`: replace `(?:.|\n|\r)*?` with `[\s\S]*?`
- **Concurrent processing guard** — add optimistic status pre-check in `source-processing.ts` to prevent double-processing
- **Audio version tracking** — add `transcriptionProvider` / version field to `providerMetadata` like PDF does
- **Generation timeout** — wrap the Gemini streaming call in a 10-minute `AbortSignal`
- **SSE stream close on error** — call `controller.close()` after writing an error event in `api/generate/route.ts`

---

## 3 — Test Coverage

- `pnpm test:e2e` — implement with Playwright; cover: sign-in, create project, upload source, generate brief, share link, submit comment, confirm brief
- `pnpm test:a11y` — implement with axe-core or Playwright accessibility checks; cover public brief page and editor shell
- Unit test gaps: download failure, empty PDF/audio text, partial chunk creation failure in `source-processing.test.ts`

---

## Not A Priority

- Revision diff view (side-by-side before/after)
- Internal approval workflow over generated snapshots
- Async generation as default (`BRIEF_GENERATION_ASYNC=1`)
- Latin-1 PDF encoding fix (replace built-in parser with a library like `pdf-parse`)
