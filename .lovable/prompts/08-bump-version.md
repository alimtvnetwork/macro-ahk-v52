# 08 — Bump Version (Pre-Bump Checklist)

Captured 2026-05-22. Trigger phrases: `bump version`, `bump minor`,
`pre-bump`, `version bump`, `release bump`.

**Scope:** macro-controller and any sibling standalone-scripts. Apply
the same checklist for every "bump version" prompt across the
macro-controller workstream.

---

## Verbatim

Pre-bumping version — in the prompt, add these few things:

1. Bump the minor version.
2. Add the changelog entry.
3. Pin that version in the root `README.md`.

Do it for all the bump-version prompts in the macro-controller.

---

## Pre-Bump Checklist (mandatory, in order)

1. **Bump minor version** (semver `MAJOR.MINOR.PATCH` → increment `MINOR`, reset `PATCH` to `0`) across all unified-version sites:
   a. `manifest.json` (`version` field)
   b. `src/shared/constants.ts` (`EXTENSION_VERSION` or equivalent)
   c. `standalone-scripts/macro-controller/src/shared-state.ts`
   d. Every `standalone-scripts/*/src/instruction.ts` manifest (`macro-controller`, `xpath`, `marco-sdk`, `lovable-user-add`, `lovable-common`, `lovable-owner-switch`, …)
   e. Run `node scripts/check-version-sync.mjs` and confirm exit 0
2. **Add changelog entry** to root `changelog.md`:
   a. New `## vX.Y.0 — {YYYY-MM-DD}` heading
   b. Bullets grouped by `Added`, `Changed`, `Fixed`, `Removed` as applicable
   c. Reference the workstream / spec / plan section that triggered the bump
3. **Pin version in root `README.md`**:
   a. Update the version badge (or inline `**Version:** vX.Y.0` line) at the top of the README
   b. If a "Latest release" or "Current build" callout exists, update it too
   c. Keep the install snippet's version reference in sync if hard-coded
4. **Verify**:
   a. `bunx tsc --noEmit` (root + macro-controller workspace) — exit 0
   b. `node scripts/check-version-sync.mjs` — exit 0
   c. `rg "vX\.Y\.(Z|0)" README.md changelog.md manifest.json` shows all sites pinned to the new version

## Coding Guidelines Reminder

Read `.lovable/coding-guidelines.md` before any implementation. Honor:
functions ≤ 8 lines, files ≤ 100 lines, no nested/negative ifs, strict
types (no `any` / `unknown` / `interface{}`), no swallowed errors, no
magic strings (use Enum/Constants), `is`/`has` boolean prefixes, DRY.

## Important

1. **All three artifacts must move together**: version sites + changelog + README. Never bump version without the changelog entry or README pin.
2. **Apply to every existing "bump version" prompt** in the macro-controller — this checklist is the canonical template; older bump-version prompts inherit it by reference.
3. Never overwrite a previous changelog entry; always append a new dated section.
4. Dates use UTC storage or bare `YYYY-MM-DD` headings; render local time only in UI.
5. No CI notifications on bump (per project core memory).
6. Sequential fail-fast — if `check-version-sync.mjs` fails, stop and fix; do not retry blindly.

## Acceptance Criteria

1. Minor version incremented and patch reset to 0 across all 6+ unified-version sites.
2. `node scripts/check-version-sync.mjs` exits 0.
3. `changelog.md` has a new dated `## vX.Y.0` section with grouped bullets.
4. Root `README.md` shows the new version in its badge / version line.
5. `bunx tsc --noEmit` passes for root and macro-controller workspace.
6. No CI emails/notifications triggered.

## Finalize

If you have any question or confusion, feel free to ask. If you create
multiple tasks and they are large, structure them so that on `next` you
continue the remaining tasks. Do you understand?
