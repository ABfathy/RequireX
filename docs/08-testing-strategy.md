# Testing Strategy

## Goal

The app should be demo-safe, not just feature-complete.

Testing must prove:

- the core brief contract is stable
- the internal desktop workflow works
- the public no-auth flow works
- mobile support is real
- accessibility regressions are controlled

## Chosen Test Stack

### Unit and Component

- `Vitest`
- `React Testing Library`
- `@testing-library/jest-dom`

Why:

- fast TypeScript-native feedback
- good fit for utility logic and React components
- low setup friction

References:

- [Vitest docs](https://context7.com/vitest-dev/vitest)
- [React Testing Library docs](https://context7.com/testing-library/react-testing-library)

### End-to-End

- `Playwright`

Why:

- strong desktop coverage
- built-in mobile device emulation
- good auth/state control
- reliable public/private flow coverage

Reference:

- [Playwright docs](https://context7.com/microsoft/playwright)

### Accessibility

- `axe-core` executed inside Playwright tests on critical pages

Why:

- catches obvious regressions early
- supports the desktop and mobile review experience

## Planned Test Commands

Target script set:

```bash
pnpm test
pnpm test:unit
pnpm test:e2e
pnpm test:a11y
```

## What Gets Unit Tested

- brief contract validators
- evidence reference builders
- source normalization helpers
- upload validation helpers
- UploadThing callback persistence and provider metadata mapping
- share-link token helpers
- optional access-code gate helpers if the bonus flow is implemented
- route/service pure logic
- event mapping logic

## What Gets Component Tested

- brief renderer
- citation trigger and evidence preview UI
- public inline comment form
- follow-up answer form
- processing-state indicators
- project/session navigation shell

## What Gets End-to-End Tested

### Desktop Baseline

- internal sign-in
- create project
- create session
- submit text input
- submit mixed-source folder upload
- generate brief
- inspect evidence
- share brief
- receive client feedback
- regenerate brief

### Mobile Support

- public brief route loads on mobile viewport
- inline comments can be submitted
- follow-up answers can be submitted
- confirmation action works
- navigation drawers and sheets do not trap the user

### Auth and Permissions

- protected internal routes redirect correctly
- public share links stay accessible
- optional access-code gate works if implemented
- unauthorized access to private mutations is blocked

## Accessibility Checks

Critical routes:

- internal workspace shell
- public brief page
- landing page only if it is actually implemented

Minimum checks:

- heading structure
- form labels
- button accessibility
- focus visibility
- dialog or sheet semantics
- color contrast review during manual QA

## Manual QA Checklist

- desktop layout works at common laptop widths
- center brief remains dominant and readable
- right panel does not crowd the main reading surface
- mobile public review remains usable
- reduced-motion preference is respected
- decorative animations do not block interaction
- mobile haptics do not fire excessively

## Test Priorities by Day

### Day 2

- wire test frameworks
- create smoke test skeletons

### Day 4

- add contract validation tests
- add first generation happy-path tests

### Day 5

- add public review e2e tests
- add refinement flow tests

### Day 6

- add accessibility checks
- add mobile support tests
- add regression coverage for known bugs

## Acceptance Criteria

Before demo readiness:

- critical unit tests pass
- core desktop e2e path passes
- public mobile review path passes
- accessibility smoke checks pass
- no known blocker bug remains in upload, generation, sharing, or feedback
