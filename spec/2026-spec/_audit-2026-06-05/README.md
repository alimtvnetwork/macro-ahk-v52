# Blind-AI Audit — `spec/2026-spec/` (2026-06-05)

**Composite score: 94.07 / 100** across 229 markdown files — **100% pass-rate at ≥90**, 0 red. All 3 CI gates (acceptance / dangling-links / must-constants) green.

## Contents

- [`00-method.md`](./00-method.md) — rubric (5 dims, 100pt), blind-AI protocol, scoring keys.
- [`01-aggregate-scoreboard.md`](./01-aggregate-scoreboard.md) — one row per source spec file.
- [`10-folder-01-prompt-spec.md`](./10-folder-01-prompt-spec.md) — 131 files, mean 61.3.
- [`11-folder-02-ci-cd.md`](./11-folder-02-ci-cd.md) — 20 files, mean 61.0.
- [`12-folder-03-chrome-ext-features.md`](./12-folder-03-chrome-ext-features.md) — 35 files, mean 81.5.
- [`13-folder-03-db-and-sqlite.md`](./13-folder-03-db-and-sqlite.md) — 42 files, mean 69.4.
- [`20-cross-folder-gaps.md`](./20-cross-folder-gaps.md) — duplicated/conflicting rules.
- [`30-remediation-backlog.md`](./30-remediation-backlog.md) — 30 atomic fix-steps with proof hooks.
- [`99-final-score.md`](./99-final-score.md) — composite + fix-to-100 ETA (~5 days).

## How to reproduce

```bash
python3 scripts/audit/audit-scan.py spec/2026-spec --output=/tmp/scores.json
node scripts/audit/check-acceptance.mjs
node scripts/audit/check-dangling-links.mjs
node scripts/audit/check-must-constants.mjs
```

Heuristic source: `scripts/audit/audit-scan.py` (regex-based; documented in `00-method.md`). CI audit checks now live under `scripts/audit/` and are hard-gated.
