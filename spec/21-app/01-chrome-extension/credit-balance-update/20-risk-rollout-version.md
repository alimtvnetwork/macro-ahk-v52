# 20 — Risk, Rollout, Version Bump

## Risks

| Risk | Mitigation |
|------|------------|
| Lovable adds inline credits to Ktlo/Free in the future, doubling fetches | `hasInlineCredits()` short-circuits before the fetch |
| Slider set too low (500 ms) on slow networks → always Timeout | UI shows cached value + amber dot; user can raise slider |
| 401 storm from expired token | Single auth retry budget, then fail-fast (memory `no-retry-policy`) |
| Cache poisoning from a transient 0-credit response | Negative results cached only for the configured delay (not full TTL) |
| Bundle size growth | New module is < 6 KB gzipped, reuses existing http helpers |

## Rollout

1. Ship behind feature flag `creditBalanceUpdate.enabled` (default ON).
2. Stage 1: dogfood (Riseup Asia accounts).
3. Stage 2: full release after one clean E2E run.

## Version bump (per memory `mem://workflow/versioning-policy`)

Minor bump — credit logic change is user-visible.

- `manifest.json`
- `src/shared/constants.ts`
- All `instruction.ts` manifests
- `standalone-scripts/macro-controller/shared-state.ts`
- Root `readme.md` (pin lines)
- Root `changelog.md`
- `standalone-scripts/macro-controller/changelog.md`

Add entry under **Added**:
`Credit balance API support for Lite (Ktlo), Free, and Cancelled workspaces +
configurable fetch-timeout slider.`

## Done = Merge gate

- All checks green: `lint`, `vitest`, `playwright`, `prebuild-clean-and-verify`.
- Acceptance matrix (file 19) fully ticked.
- Memory file `mem://features/macro-controller/credit-balance-update` created.
