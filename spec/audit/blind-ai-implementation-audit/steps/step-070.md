# Step 70 — Storage PascalCase rewrite ban

**Timestamp:** 2026-06-02
**Core rule:** No Storage PascalCase Migration
**File:** `scripts/check-no-storage-pascalcase-rewrite.mjs`

## Reasoning
A naïve rewrite of `chrome.storage.local` keys breaks ~50 consumers — explicitly banned. Blind LLM would happily "normalize" casing.

## Findings
- ✅ Dedicated CI check; memory entry; constraint memory file.
- 🟢 **Low**: no positive fixture showing the allowed identity-only framework — blind LLM may misinterpret.

## Recommendation
Add a 5-line comment block in the check script showing one allowed pattern + one banned pattern.

---

## Batch 7 summary (steps 61–70)
- ✅ **Strong**: S61 (CI push trigger — 3 layers), S63 (build lock), S68 (release self-heal), S70 (PascalCase ban).
- 🟡 **Med** S62 (no single VERSION SOT), S64 (no comment in vite.config), S65 (no lint for `node:` dynamic imports), S67 (no script registry/README), S69 (validator is fixture-only, not runtime).
- 🟢 **Low** S66.
- **No critical findings this batch.** Build/CI/versioning is the **strongest subsystem** so far, alongside the new-tab guard (S55) and recorder (S41–50).
