# Step 28 — `chrome.storage.local` key audit

**Time:** ~2 min · **Severity:** Med

- **Sources:** 63 consumer files identified by grep.
- **Blind-AI likely output:** LLM picks arbitrary key names; collisions accumulate.
- **Actual:** No central registry of allowed keys; key strings spread across the 63 consumers.
- **Gap:** No single source of truth for storage keys. Risk of typos, duplicates, orphaned keys after refactor.
- **Recommendation:** Create `src/shared/storage-keys.ts` exporting a frozen `STORAGE_KEYS` map; codemod the 63 consumers to import from it; add ESLint rule banning string literals matching the known key shape outside that file.
