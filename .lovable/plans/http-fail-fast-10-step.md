# HTTP Fail-Fast Enforcement — 10-Step Plan

**Goal:** Make every agent-driven and runtime HTTP call obey the HTTP Fail-Fast policy. One 4xx/5xx = stop, report, wait. No retry. No fanout. Prevents Lovable platform throttling/blocks caused by repeated failure storms (e.g., project Git checks returning 405).

**Authoritative rule:** `.lovable/memory/constraints/http-error-fail-fast.md` · `spec/03-error-manage/01-error-resolution/05-http-error-fail-fast.md`

## Steps

1. ✅ **Audit current callers.** Grep `fetch(`, `XMLHttpRequest`, `axios`, `curl`, `marco.fetch`, `gitApiFetch` across `src/`, `standalone-scripts/`, `scripts/`. Produce `.lovable/audits/http-callers-2026-05-22.md` listing every site, its loop context, and current error handling. **No code changes.**
2. ✅ **Classify each caller** in the audit as Compliant / Needs-guard / Loop-fanout-risk. Mark Git/project-scan callers (the 405 source) as P0.
3. ✅ **Create shared `httpFailFast(response, ctx)` helper** in `src/shared/http-fail-fast.ts` (and matching `standalone-scripts/macro-controller/src/shared/http-fail-fast.ts`) that throws `HttpFailFastError` on non-2xx with the spec's report shape. Add unit-style verify script.
4. ✅ **Wrap P0 callers** (project Git checks, dashboard auto-attach probes, repo enumeration) with `httpFailFast`. Replace any `for`/`Promise.all` fanouts with sequential loops that `break` on `HttpFailFastError`.
5. ✅ **Wrap remaining Needs-guard callers** (token probes, member fetch, webhook sender adjacency). Keep `webhook-fail-fast` semantics intact — just route through the shared error type.
6. ✅ **Add repo grep guard** (`scripts/lint/no-bare-fetch.mjs`) that fails build if a `fetch(...)` appears outside `http-fail-fast.ts` without `httpFailFast(` on the next non-comment line. Wire into `prebuild-clean-and-verify.mjs`.
7. ✅ **Surface failure in UI/logs.** `HttpFailFastBanner.tsx` listens for `marco:http-fail-fast` window events, renders a single dismissible banner with status + URL + reason. No toast spam, no re-render loop.
8. ✅ **Add agent-side reminder doc** `.lovable/checklists/http-fail-fast.md` — agent checklist covering hard rules, pre/post-write checklists, quick-reference snippets, and anti-pattern examples.
9. ✅ **Write verification script** `standalone-scripts/macro-controller/scripts/verify-http-fail-fast.mjs` — 11 assertions covering throw shape, sequential loop halting, CustomEvent dispatch, no retry tokens, and `isNetworkError()` discrimination.
10. ✅ **Unified version bump + changelog.** Bumped manifest/constants/instruction versions to **3.5.2**, added `changelog.md` entry covering Steps 1–9, `plan.md` updated.

## Acceptance

- Audit file exists and every P0 caller is wrapped.
- Lint guard fails build when a bare `fetch` is reintroduced.
- Verify script passes (`bun scripts/verify-http-fail-fast.mjs`).
- `bunx tsc --noEmit` clean across `standalone-scripts/macro-controller`.
- Version sync passes (`bun scripts/check-version-sync.mjs`).

## Out of scope

- Browser-extension content-script third-party scripts (e.g., page-owned `fetch`) — only OUR calls.
- Stripe/Paddle SDK internals.
- React Query/SWR retry config tuning (no such usage in this project).
