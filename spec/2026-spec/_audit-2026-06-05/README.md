# Blind-AI Audit — `spec/2026-spec/` (2026-06-05)

**Composite score: 50.1 / 100** across 228 markdown files. Strongest folder: `03-chrome-ext-features` (81.2). Weakest: `01-prompt-spec` (38.3).

## Contents

- [`00-method.md`](./00-method.md) — rubric (5 dims, 100pt), blind-AI protocol, scoring keys.
- [`01-aggregate-scoreboard.md`](./01-aggregate-scoreboard.md) — one row per file (228 rows).
- [`10-folder-01-prompt-spec.md`](./10-folder-01-prompt-spec.md) — 131 files, mean 38.3.
- [`11-folder-02-ci-cd.md`](./11-folder-02-ci-cd.md) — 20 files, mean 51.3.
- [`12-folder-03-chrome-ext-features.md`](./12-folder-03-chrome-ext-features.md) — 35 files, mean 81.2.
- [`13-folder-03-db-and-sqlite.md`](./13-folder-03-db-and-sqlite.md) — 42 files, mean 60.3.
- [`20-cross-folder-gaps.md`](./20-cross-folder-gaps.md) — duplicated/conflicting rules.
- [`30-remediation-backlog.md`](./30-remediation-backlog.md) — 30 atomic fix-steps with proof hooks.
- [`99-final-score.md`](./99-final-score.md) — composite + fix-to-100 ETA (~5 days).

## How to reproduce

```bash
python3 /tmp/audit_scan.py spec/2026-spec/01-prompt-spec > /tmp/audit/01.json
# … repeat per folder, then:
python3 /tmp/audit_gen.py
```

Heuristic source: `/tmp/audit_scan.py` (regex-based; documented in `00-method.md`).
