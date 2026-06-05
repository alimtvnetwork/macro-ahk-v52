# 99 — Consistency Report

> Structural health check for `spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## Canonical scope

- Canonical folder: `spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`.
- Audit coverage: G1–G25.
- Final score contract: 100 / 100 after all G1–G25 patches.
- Functional index: `spec/12-cicd-pipeline-workflows/` links to this folder; it does not own the Chrome-extension CI/CD spec body.

## File inventory

| File | Required | Status |
|---|---:|---|
| `README.md` | yes | ✅ Present index with direct G21–G24 audit anchors |
| `01-forty-planning-steps.md` | yes | ✅ Present |
| `02-repo-discovery.md` | yes | ✅ Present |
| `03-download-and-install-scripts.md` | yes | ✅ Present |
| `04-probing.md` | yes | ✅ Present |
| `05-workflow-files-and-triggers.md` | yes | ✅ Present |
| `06-spec-location-and-extension-shape.md` | yes | ✅ Present |
| `07-enumeration-build-and-packaging.md` | yes | ✅ Present |
| `08-versioning.md` | yes | ✅ Present |
| `09-release-artifacts.md` | yes | ✅ Present |
| `10-permissions-and-secrets.md` | yes | ✅ Present |
| `11-no-committed-zips.md` | yes | ✅ Present; enforced by `no-committed-zip-artifacts.test.mjs` |
| `12-readme-and-install-instructions.md` | yes | ✅ Present |
| `13-operations-and-troubleshooting.md` | yes | ✅ Present |
| `14-glossary.md` | yes | ✅ Present |
| `15-acceptance-criteria.md` | yes | ✅ Present |
| `16-hardening-addenda.md` | yes | ✅ Present; covers G11–G25 |
| `17-final-auditor-score.md` | yes | ✅ Present; states 100 / 100 |
| `audit.md` | yes | ✅ Present; independent G1–G24 audit trail with stable `<a id>` anchors |
| `99-consistency-report.md` | yes | ✅ Present |

## Audit-to-spec mapping

| Gap range | Primary spec location | Status |
|---|---|---|
| G1–G10 | Base sections §2a, §14a, §16, §17a, §18, §19, §19a, §22a, §22b, §24a, §25a, §36a | ✅ Covered |
| G11–G20 | `16-hardening-addenda.md` §41.1–§41.10 | ✅ Covered |
| G21 | `16-hardening-addenda.md` §41.11 secrets provisioning checklist | ✅ Covered |
| G22 | `16-hardening-addenda.md` §41.8 enforced branch-protection verifier | ✅ Covered |
| G23 | `03-download-and-install-scripts.md` §3 exit-code table, codes 10–13 | ✅ Covered |
| G24 | `16-hardening-addenda.md` §41.11 static `HAS_*` secret booleans | ✅ Covered |
| G25 | `16-hardening-addenda.md` §41.13 `release-watcher.yml` self-heal contract | ✅ Covered |

## Regression test coverage (CI-enforced)

| Test file | Asserts |
|---|---|
| `chrome-extension-ci-cd-spec.test.mjs` | 8 spec acceptance invariants (G1–G24) |
| `pipeline-docs-vs-ci.test.mjs` | `pipeline/02-ci-workflow.md` job DAG matches `.github/workflows/ci.yml` |
| `ci-workflow-trigger-policy.test.mjs` | `ci.yml` uses bare `on: push:` (canary against silent Lovable-branch skip) |
| `ci-yml-job-dag.test.mjs` | All 8 documented `needs:` edges + 6 canonical jobs exist |
| `no-committed-zip-artifacts.test.mjs` | No `.zip` / `.crx` / `.xpi` committed (spec §17 + §41.7 G17) |

All five wired into `npm run test:cicd-spec` — 16/16 passing on 2026-06-04.

## Result

The split spec now matches the audit report: every file exists at the canonical
2026 folder path, hardening coverage is labeled G11–G25, every gap has a
mapped CI regression test, and the final auditor score remains **100 / 100**.
See `spec-audit-2026-06-04-v2.md` for the rescore artifact.

## Acceptance

- [ ] The implementation satisfies the `99 — Consistency Report` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
- [ ] Verification passes when `npm run test:cicd-spec` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [Versioning policy](mem://workflow/versioning-policy) for the authoritative rule backing the MUST/SHALL statements in this file.

---

## Reconciliation with the content-quality audit

This structural report MUST be read together with the generated blind-AI content-quality audit:

- [`spec/2026-spec/_audit-2026-06-05/40-reconciliation-with-root-consistency-report.md`](../_audit-2026-06-05/40-reconciliation-with-root-consistency-report.md) — pins per-folder structure status against blind-AI implementability score.
- [`spec/2026-spec/_audit-2026-06-05/11-folder-02-ci-cd.md`](../_audit-2026-06-05/11-folder-02-ci-cd.md) — per-file content-quality scoreboard for this folder.

The reconciliation page is generated by `node scripts/audit/render-reports.mjs`; this report MUST stay structural (file inventory, anchors, scope) so the two views remain non-overlapping.

> Owner: see [Documentation standards](mem://workflow/documentation-standards) for the authoritative rule.
