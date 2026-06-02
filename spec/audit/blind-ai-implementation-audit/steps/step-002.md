# Step 2 — `spec/01-spec-authoring-guide` completeness

**Time:** ~3 min · **Severity:** Low

- **Sources:** 18 files in `01-spec-authoring-guide/` (00-overview through 12-root-readme-read-write-spec + 97/98/99).
- **Blind-AI likely output:** Sufficient to author new specs with correct front-matter, naming, and folder layout. Templates 04/05/06 cover CLI, app, and non-CLI modules — a low-grade LLM can clone them.
- **Actual:** Guide is comprehensive; includes acceptance criteria (97), changelog (98), consistency report (99), and a dedicated 10-mandatory-linter-infrastructure rule.
- **Gap:** Two files share the `04-` prefix (`04-ai-onboarding-prompt.md` and `04-cli-module-template.md`) — violates the numeric-naming convention recorded in `mem://workflow/file-naming-convention`. A blind AI cloning this pattern will reproduce the collision.
- **Recommendation:** Rename `04-cli-module-template.md` → `04a-cli-module-template.md` or renumber to free a unique slot.
