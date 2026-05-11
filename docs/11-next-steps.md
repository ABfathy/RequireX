# Next Steps

## Highest Priority

1. Implement source processing after upload or text ingestion.
2. Create `SourceChunk`, `BriefSnapshot`, `BriefClaim`, `BriefQuestion`, and `EvidenceRef` records from that processing pipeline.
3. Replace placeholder document content in the internal editor with live snapshot data.
4. Replace mock content in `/brief/[shareToken]` with real share-link-backed snapshot data.

## After That

1. Add a share action that creates `ShareLink` rows from the internal workspace.
2. Surface processing-job status and failure messages in the UI.
3. Connect revision UI to `RevisionEvent` and snapshot version data.
4. Replace the placeholder `test:e2e` and `test:a11y` scripts with real coverage.

## Not A Priority Until Core Flow Works

- novelty polish docs
- elaborate roadmap planning
- e2e coverage for flows that still use mock data
