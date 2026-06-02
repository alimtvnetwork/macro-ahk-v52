# Observability — Export Bundle Integration

Macro-run artifacts are included in the existing diagnostics ZIP exporter (`mem://features/log-diagnostics-export`).

## What's added to the bundle
For each `spec/audit/<RunId>/` directory under the last 30 days:
```
diagnostics-<ISO8601-KL>.zip
└── macros/
    └── <RunId>/
        ├── _meta.json
        ├── _log.jsonl
        ├── variables-snapshot.json
        ├── step-NN-<Kind>-input.md
        ├── step-NN-<Kind>-output.md
        ├── step-NN-<Kind>-failure.json      # if present
        └── proposed-edits/…                 # if present
```

Plus a top-level rollup:
```
└── macros/
    ├── INDEX.json     # { RunId, MacroSlug, FinalState, FinalScore?, StartedAtKL, DurationMs }[]
    └── METRICS.json   # snapshot of MacroMetrics rows for the same window
```

## Inclusion rules
- Default window: last 30 days. Older runs require explicit "Include all macro runs" checkbox.
- Per-run size cap: 5 MiB. Larger runs included as `MANIFEST.json` (paths + sizes only) with a note in `INDEX.json` (`Truncated: true`).
- Total bundle hard cap: 100 MiB. When exceeded, oldest runs dropped first; dropped RunIds listed in `MANIFEST.json`.

## Redaction
- Sensitive Variables remain masked (already masked at write-time per `engine/05-variable-interpolator.md`).
- No re-redaction needed at export — what's on disk is what ships.
- Verbose-logged HTML/Text remains untruncated only if `Project.VerboseLogging` was ON at capture time.

## CLI equivalent
- `node scripts/diagnostics-export.mjs --include macros --since 30d --out diagnostics.zip`
- Same shape as panel-triggered export; used by support workflows.

## Tests
- `tests/diagnostics/macros-inclusion.test.ts` asserts:
  - Every fixture run appears in `INDEX.json`.
  - `_log.jsonl` is gap-free post-zip-unzip.
  - Size-cap path produces `MANIFEST.json` with correct `Truncated` flag.
  - Drop-oldest behavior is deterministic given fixed timestamps.
