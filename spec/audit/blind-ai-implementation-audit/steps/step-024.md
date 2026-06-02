# Step 24 — 4-tier storage usage (`mem://architecture/data-storage-layers`)

**Time:** ~2 min · **Severity:** Med

- **Sources:** Memory entry; grep over `src/`.
- **Blind-AI likely output:** LLM may stuff everything in `chrome.storage.local`. Memory mandates 4-tier split: SQLite, IndexedDB, localStorage, chrome.storage.local.
- **Actual:** 63 files touch `chrome.storage.local` directly — heavy direct coupling.
- **Gap:** No facade enforcing the tier assignment policy. New code can land in any tier without review signal.
- **Recommendation:** Introduce `storage/router.ts` with typed APIs per tier (`storage.session.set`, `storage.config.set`, `storage.bulk.set`); add ESLint `no-restricted-imports` for direct `chrome.storage` outside the router module.
