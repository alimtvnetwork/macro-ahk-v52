# C11 (full sweep) — H1 vs Filename Slug Mismatch

**Version:** 0.2.0
**Updated:** 2026-06-02
**Severity:** Low–Medium (was Low; **44 files** is enough to upgrade)
**Files affected:** 44 / 95

---

## Evidence (raw count)

```
$ find spec/21-app/05-prompts -name "*.md" ! -path "*/99-spec-issues/*" \
    | while read f; do
        h1=$(grep -m1 '^# ' "$f")
        slug=$(basename "$f" .md | sed 's/^[0-9]*-//')
        # … compare normalized h1 to slug …
      done | wc -l
44
```

## Top offenders (15 / 44)

| File | Slug | Normalised H1 |
|------|------|---------------|
| `00-all-prompts.md`                       | `all-prompts`               | `index`                          |
| `04-unified-ai-prompt-v4.md`              | `unified-ai-prompt-v4`      | `v4`                             |
| `folder-structure.md`                     | `folder-structure`          | `spec`                           |
| `macros/README.md`                        | `README`                    | `spec-index`                     |
| `macros/00-concept.md`                    | `concept`                   | `concept-canonical`              |
| `macros/01-step-kinds.md`                 | `step-kinds`                | `full-reference`                 |
| `macros/02-run-model.md`                  | `run-model`                 | `lifecycle-runid-resume`         |
| `macros/03-audit-artifacts.md`            | `audit-artifacts`           | `files-written-per-run`          |
| `macros/04-loop-and-score.md`             | `loop-and-score`            | `gating-rules`                   |
| `macros/05-failure-modes.md`              | `failure-modes`             | `every-error-path`               |
| `macros/06-storage-contract.md`           | `storage-contract`          | `chrome.storage.local-keys`      |
| `macros/07-permissions-and-scope.md`      | `permissions-and-scope`     | `allowed-forbidden-writes`       |
| `macros/engine/00-architecture.md`        | `architecture`              | `engine-architecture`            |
| `macros/engine/02-resume-after-sw-restart.md` | `resume-after-sw-restart` | `resume-after-serviceworker-restart` |
| `macros/examples/01-review-and-fix-loop.md` | `review-and-fix-loop`     | `review-and-fix-loop-3-iterations-targetscore-95` |

## Pattern

H1 was written as a marketing/subtitle line ("Lifecycle, RunId, Resume") while the slug stayed terse. Both are valid, but for a blind AI, the breadcrumb generator MUST tie them together.

## Fix outline

For each mismatch, prefer one of:

1. Make H1 the slug-as-title (e.g. `# Run Model`), and move the descriptive subline to a `> tagline` blockquote or front-matter `**Subtitle:**` field.
2. Or rename the file slug to match the H1 (riskier — breaks inbound links).

Recommended: **option 1** for all 44 files.

## Atomic sub-tasks

5 batches of ~9 files = 5 fix tasks.
