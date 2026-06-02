# Step 4 — `readme.md` "For AI Agents" vs `.lovable/what-to-read.md`

**Time:** ~2 min · **Severity:** Low

- **Sources:** `readme.md`, `.lovable/what-to-read.md`, `.lovable/memory/what-to-read.md`.
- **Blind-AI likely output:** Low-grade LLM following the readme will discover the onboarding map. Good.
- **Actual:** Recent session added "For AI Agents" pointing to `.lovable/what-to-read.md`; that file mirrors the memory version.
- **Gap:** Three copies of similar content exist (readme excerpt, `.lovable/what-to-read.md`, `mem://what-to-read`). Risk of drift; no canonical source declared.
- **Recommendation:** Mark `mem://what-to-read` as canonical and have `.lovable/what-to-read.md` regenerate from it (or simply symlink/include).
