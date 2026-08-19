<!--
Thanks for contributing! Keep this short — a focused PR gets reviewed faster.
See CONTRIBUTING.md if this is your first one.
-->

## What does this change?

<!-- One or two sentences. What is different after this PR? -->

Closes #

## Why?

<!-- The problem being solved. Link the issue if there is one. -->

## Type of change

- [ ] Bug fix
- [ ] New tool
- [ ] Improvement to an existing tool
- [ ] Documentation
- [ ] Translation
- [ ] Chore (deps, config, tooling)

## How did you verify it?

<!-- Commands you ran, cases you tried, what you clicked through. -->

## Screenshots

<!-- For UI changes: before/after, or a short clip. Delete if not applicable. -->

## Checklist

- [ ] `pnpm lint` passes
- [ ] Tests pass (`cd apps/desktop-ui && pnpm test`), and logic changes have a test
- [ ] User-visible strings go through `useTranslations("<Namespace>")` — nothing hardcoded
- [ ] New/changed keys added to `messages/en.json`, then `pnpm i18n:sync` run
- [ ] Async mutations that can fail are wrapped in `try/catch` with `toast.error(message)`
- [ ] No new mandatory network call, sign-in, sync or backend — the app still works fully offline
- [ ] No secrets, tokens or personal data in the diff

### New tool only

- [ ] Registered in all six registries (`metadata.ts`, `route-config.ts`, `tab-registry.tsx`, `tool-categories.ts`, `tool-i18n.ts`, `sidebar-data.ts`)
- [ ] Logic lives in `src/lib/<slug>.ts` with a test in `src/lib/__tests__/`
- [ ] Uses `ToolPageHeader` with the category accent, like the other tools

## Anything reviewers should know?

<!-- Trade-offs, follow-up work, parts you are unsure about. -->
