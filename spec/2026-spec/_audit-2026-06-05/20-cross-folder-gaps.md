# Cross-Folder Gaps

Synthesised from `01-aggregate-scoreboard.md`. Numbers are heuristic (see `00-method.md`).

## Repo-wide signal

| Folder | Files | Mean Score | <60 | ≥90 |
| --- | --- | --- | --- | --- |
| `01-prompt-spec` | 131 | 38.3 | 121 | 0 |
| `02-ci-cd-spec-for-chrome-extensions` | 20 | 51.3 | 15 | 0 |
| `03-chrome-ext-features` | 35 | 81.2 | 0 | 7 |
| `03-db-and-sqlite-integration-with-chrome-extension` | 42 | 60.3 | 25 | 1 |
| **Repo composite** | **228** | **50.1** | **161** | **8** |

`03-chrome-ext-features` is the only folder near the 90 pass bar; `01-prompt-spec` is the strongest drag on the composite.

## Pattern-level gaps (apply across folders)

1. **Acceptance gap** — most low-scoring files do not have a machine-checkable `## Acceptance` block. Files with `- [ ]` checklists score 20pts higher on average.
2. **Numeric-constant drift** — timeouts/caps/budgets appear in prose without a single source-of-truth file. Risk: cross-folder conflict (already a Core rule in `mem://index.md`).
3. **Dangling relative links** — see per-folder reports; a blind AI cannot follow them and will fail-fast.
4. **Thin index files** — README/00-overview files often <80 words; they should at minimum link every NN-* file with a one-line summary.
5. **Missing pitfalls/counter-examples** — only `03-chrome-ext-features` consistently includes "Pitfall" sections. Add to every contract file.

## Conflicting / duplicated rules to reconcile

- **Verbose logging gate** referenced in both `01-prompt-spec/16-observability` and `03-chrome-ext-features` — pick a single owner (Core rule already names `mem://standards/verbose-logging-and-failure-diagnostics`).
- **Failure-log schema** appears in `01-prompt-spec/13-failure-handling/05-mandatory-failure-log.md` and `03-chrome-ext-features` recorder docs — confirm both reference the same TS type, do not redefine.
- **Webhook fail-fast** (`mem://constraints/webhook-fail-fast`) — verify `02-ci-cd` and `03-chrome-ext-features` both cite the memory instead of restating.

## Memory cross-references

All findings are consistent with Core memory rules (no contradictions detected). New memory candidates:
- "Spec files MUST include `## Acceptance` with `- [ ]` bullets" — consider promoting to Core.
