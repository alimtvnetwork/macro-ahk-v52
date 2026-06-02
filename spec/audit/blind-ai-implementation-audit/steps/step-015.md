# Step 15 — Verbose logging gate (`Project.VerboseLogging`)

**Time:** ~2 min · **Severity:** Low

- **Sources:** `src/background/recorder/verbose-logging.ts`, `src/components/options/SettingsView.tsx`, `handlers/settings-handler.ts`, tests.
- **Blind-AI likely output:** LLM might leak full HTML always-on; memory says default OFF.
- **Actual:** Gate is implemented end-to-end (toggle UI → handler hydrate → recorder store). Tests exist (`verbose-logging.test.ts`, `settings-handler-verbose.test.ts`).
- **Gap:** Need to verify default is OFF in fresh `StoredProject` shape — spot check required, but no automated migration test.
- **Recommendation:** Add a test that loads a v0 `StoredProject` blob and asserts `verboseLogging === false` after migration.
