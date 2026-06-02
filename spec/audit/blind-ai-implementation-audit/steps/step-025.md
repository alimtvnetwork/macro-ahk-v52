# Step 25 — No-Storage-PascalCase-Migration constraint

**Time:** ~2 min · **Severity:** Low

- **Sources:** Core memory rule, `mem://constraints/no-storage-pascalcase-migration`.
- **Blind-AI likely output:** LLM may "tidy up" by renaming `StoredProject` keys. Rule forbids it.
- **Actual:** 63 consumers depend on existing keys; no rename PR detected. Compliant.
- **Gap:** No automated guard — a future LLM session could still attempt the migration.
- **Recommendation:** Add a snapshot test of the canonical `StoredProject` key set in `chrome.storage.local`; fail CI on any drift. Reference the constraint memory in the test message.
