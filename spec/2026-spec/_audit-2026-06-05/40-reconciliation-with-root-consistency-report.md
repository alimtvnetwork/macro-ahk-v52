# Reconciliation with `spec/99-consistency-report.md`

**Date:** 2026-06-05

The root `spec/99-consistency-report.md` (v1.1.0, Health Score 98/100 A+) audits **folder structure** (presence of `00-overview.md` + `99-consistency-report.md` per top-level folder). It is **structural**, not **content-quality**.

This audit (`_audit-2026-06-05/`) is **content-quality** focused (blind-AI implementability). The two are complementary, not contradictory.

## Where they agree

- `2026-spec/` is marked "✅ Dated specs" in the root report — structurally compliant.
- All four 2026-spec subfolders exist with README/00-overview, as expected.

## Where this audit extends the root report

The root report does NOT measure:

1. Per-file `## Acceptance` presence — **181 files fail** (verified by `scripts/audit/check-acceptance.mjs`).
2. Dangling relative links — **106 broken links** (post code-fence strip; was 156) (verified by `scripts/audit/check-dangling-links.mjs`).
3. Numeric-constant SOT binding.
4. Pitfalls / counter-examples coverage.
5. Blind-AI implementability score per file.

→ Root health score (98/100) reflects **folder hygiene**. Content health score (this audit) is **50.1/100** composite.

## Recommended root-report addendum

Add a "Content Quality" column to the root inventory table:

| Folder | Structure | Content Quality (blind-AI) |
| --- | --- | --- |
| `2026-spec/01-prompt-spec` | ✅ | 🔴 38.3 |
| `2026-spec/02-ci-cd-…` | ✅ | 🟡 51.3 |
| `2026-spec/03-chrome-ext-features` | ✅ | 🟢 81.2 |
| `2026-spec/03-db-and-sqlite-…` | ✅ | 🟡 60.3 |

This addendum is **not** auto-applied — root report is owned by the consistency-report maintainer.

## Action items added to `30-remediation-backlog.md`

- Step 26 (this reconciliation) — **done**.
- New machine checks (steps 26–29 in backlog) are landed at `scripts/audit/check-acceptance.mjs`, `scripts/audit/check-dangling-links.mjs`, `scripts/audit/check-must-constants.mjs`, and `.github/workflows/spec-audit.yml`. They report CODE-RED with exact path + missing item + reason per `mem://standards/error-logging-requirements`.
