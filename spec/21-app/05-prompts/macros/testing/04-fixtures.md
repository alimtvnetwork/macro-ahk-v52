# Fixtures

Location: `tests/fixtures/`. All fixtures are JSON or Markdown files — never inline literals in test bodies.

## Layout
```
tests/fixtures/
├── macros/
│   ├── 001-spec-tighten-cycle.macro.json     # canonical from example 00
│   ├── 002-review-and-fix-loop.macro.json    # canonical from example 01
│   ├── 003-variable-driven-audit.macro.json
│   └── invalid/
│       ├── missing-required-var.macro.json
│       ├── enum-default-out-of-range.macro.json
│       └── unknown-top-level-key.macro.json
├── prompts/
│   ├── audit-spec.prompt.json
│   ├── fix-spec.prompt.json
│   └── summarize-pr.macro-prompt.json
├── bundles/
│   ├── bundle-A.json                          # Profile A snapshot (example 02)
│   ├── bundle-A.expected-checksum.txt
│   ├── bundle-too-large.json                  # >25 MB padded
│   └── bundle-v0-legacy.json                  # migrator input fixture
├── engine/
│   ├── score-parser/
│   │   ├── happy.txt
│   │   ├── multi-match-last-wins.txt
│   │   ├── out-of-range.txt
│   │   └── not-found.txt
│   ├── interpolator/
│   │   ├── tier-1-step.json
│   │   ├── tier-2-macro.json
│   │   ├── tier-3-runcontext.json
│   │   ├── tier-4-default.json
│   │   └── tier-5-unresolved.json
│   └── audit-writer/
│       └── expected-layout.txt                # newline-separated relative paths
└── chrome-storage/
    └── seed.json                              # canned chrome.storage.local seed
```

## Rules
- Every fixture is **canonical**: passes its matching schema, sorted, LF endings, trailing newline.
- Fixtures are loaded via `tests/helpers/load-fixture.ts` (typed, no `unknown` casts).
- Invalid fixtures live under `invalid/` subdir and carry a `// FAILS: <Reason>` first-line comment is **not** allowed (JSON has no comments) — instead a sibling `<name>.expected-failure.json` lists `{ Reason, ReasonDetail }`.
- Fixtures are content-addressable: their `Checksum` is recomputed in `tests/fixtures/__checksums__.test.ts` and asserted byte-stable. Any drift fails CI immediately, surfacing accidental edits.

## Generation
- New fixtures authored by hand OR captured from a real run via `node scripts/capture-fixture.mjs --runId <id> --out tests/fixtures/...`.
- Captured fixtures must be reviewed and committed manually (no auto-commit).

## Forbidden
- Inline JSON literals > 5 lines in any test file.
- Random data — all fixtures deterministic.
- Sensitive real values — placeholders only (`"***REDACTED***"`).
