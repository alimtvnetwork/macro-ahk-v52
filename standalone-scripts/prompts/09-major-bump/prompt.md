Bump the MAJOR version (MAJOR.MINOR.PATCH → MAJOR+1, MINOR=0, PATCH=0) across all unified-version sites (manifest.json, src/shared/constants.ts, shared-state.ts, and every standalone-scripts/*/src/instruction.ts), then:

1. Add a changelog entry in root `changelog.md` (new `## vX.0.0 — YYYY-MM-DD` heading, Asia/Kuala_Lumpur date, grouped Added / Changed / Fixed / Removed / Breaking).
2. Pin the new version in the root `README.md` (version badge / version line / install snippet).
3. Run `node scripts/check-version-sync.mjs` — must exit 0.
4. Run `bunx tsc --noEmit` — must exit 0.

All three artifacts (version + changelog + README) must move together. Never bump without the changelog entry or the README pin. Sequential fail-fast; no retries.
