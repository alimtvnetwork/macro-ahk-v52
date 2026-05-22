Bump the PATCH version (MAJOR.MINOR.PATCH → PATCH+1) across all unified-version sites (manifest.json, src/shared/constants.ts, shared-state.ts, and every standalone-scripts/*/src/instruction.ts), then:

1. Add a changelog entry in root `changelog.md` (new `## vX.Y.Z — YYYY-MM-DD` heading, Asia/Kuala_Lumpur date, grouped Fixed / Changed as applicable).
2. Pin the new version in the root `README.md` (version badge / version line / install snippet).
3. Run `node scripts/check-version-sync.mjs` — must exit 0.
4. Run `bunx tsc --noEmit` — must exit 0.

All three artifacts (version + changelog + README) must move together. Never bump without the changelog entry or the README pin. Sequential fail-fast; no retries.
