# Next Steps

## Highest Priority

1. Add a share action that creates `ShareLink` rows from the internal workspace.
2. Replace mock content in `/brief/[shareToken]` with real share-link-backed snapshot data.
3. Wire regenerate UI on top of the existing job/snapshot model.
4. Expand generation beyond text sources to PDF, audio transcript, and image observations.

## After That

1. Surface processing-job history and durable failure messages in the UI.
2. Connect revision UI to `RevisionEvent` and snapshot version data.
3. Replace the placeholder `test:e2e` and `test:a11y` scripts with real coverage.
4. Add async generation monitoring if `BRIEF_GENERATION_ASYNC=1` becomes the default.

## Not A Priority Until Core Flow Works

- novelty polish docs
- elaborate roadmap planning
- e2e coverage for flows that still use mock data
