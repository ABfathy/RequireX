# Testing Strategy

## What Exists Now

`pnpm test` runs the Vitest suite in `tests/unit/`.

Current coverage includes:

- asset persistence and deletion rules
- validator behavior
- public auth/rate-limit behavior
- public review service behavior
- public review route behavior

Representative files:

- [tests/unit/assets.test.ts](/Users/abdallah/repos/EUI-hackathon-2026/tests/unit/assets.test.ts)
- [tests/unit/public-review.test.ts](/Users/abdallah/repos/EUI-hackathon-2026/tests/unit/public-review.test.ts)
- [tests/unit/public-review-routes.test.ts](/Users/abdallah/repos/EUI-hackathon-2026/tests/unit/public-review-routes.test.ts)

## What Does Not Exist Yet

- No Playwright tests
- No browser-level auth flow tests
- No upload flow integration tests
- No UI component tests
- No accessibility automation

## Important Script Reality

- `pnpm test` is real
- `pnpm test:unit` is real
- `pnpm test:e2e` is still a placeholder message
- `pnpm test:a11y` is still a placeholder message

The remaining mismatch is only on the e2e and accessibility side.

## Near-Term Priorities

1. Keep expanding Vitest around services and route handlers as features land.
2. Add tests around generation request flows and project creation flows.
3. Add one end-to-end happy-path flow once live snapshot rendering exists.
4. Add accessibility checks only after the public brief page is data-backed.
