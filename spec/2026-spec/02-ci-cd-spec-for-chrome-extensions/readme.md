# 02 — Chrome Extension CI/CD

> **Audience:** any AI agent or human engineer given **only this folder + an
> extension folder**. The goal: produce a working GitHub-Actions release
> pipeline, downloadable release artifacts, and a one-line installer — with
> zero repository-specific knowledge.

This spec is **generic** and **repo-agnostic**. All paths are relative to the
host repository root. It supports **one or many** Chrome extensions in the same
repo.

---

---

## Spec Layout

This spec is split into focused files. Read them in order on first pass; cross-reference by section number afterwards.

| # | File | Covers | Topic |
|---|---|---|---|
| 01 | [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) | §0 | 40 Planning Steps |
| 02 | [`02-repo-discovery.md`](./02-repo-discovery.md) | §1, §2a | Repo Discovery & Owner/Repo Resolution |
| 03 | [`03-download-and-install-scripts.md`](./03-download-and-install-scripts.md) | §2, §3, §18, §19, §19a | Download & Install Scripts |
| 04 | [`04-probing.md`](./04-probing.md) | §4, §20 | Probing Feature |
| 05 | [`05-workflow-files-and-triggers.md`](./05-workflow-files-and-triggers.md) | §5, §6, §22, §22a, §22b | Workflow Files, Triggers & Runtime Policy |
| 06 | [`06-spec-location-and-extension-shape.md`](./06-spec-location-and-extension-shape.md) | §7, §8, §9, §10, §21 | Spec Location & Extension Folder Shape |
| 07 | [`07-enumeration-build-and-packaging.md`](./07-enumeration-build-and-packaging.md) | §11, §12, §13, §23, §24, §24a | Enumeration, Build, Packaging & Caching |
| 08 | [`08-versioning.md`](./08-versioning.md) | §14 | Versioning |
| 09 | [`09-release-artifacts.md`](./09-release-artifacts.md) | §15, §16, §17, §17a, §28, §32, §33 | Release Artifacts & Verification |
| 10 | [`10-permissions-and-secrets.md`](./10-permissions-and-secrets.md) | §25, §25a | Permissions, Secrets & Token Policy |
| 11 | [`11-no-committed-zips.md`](./11-no-committed-zips.md) | §26, §27 | No-Committed-ZIPs Hard Rule |
| 12 | [`12-readme-and-install-instructions.md`](./12-readme-and-install-instructions.md) | §29, §30, §31 | README Rules, Template & Unpacked-Load Instructions |
| 13 | [`13-operations-and-troubleshooting.md`](./13-operations-and-troubleshooting.md) | §34, §35, §36, §36a, §37, §38 | Failure Handling, Checklists, Rollback & Troubleshooting |
| 14 | [`14-glossary.md`](./14-glossary.md) | §39 | Glossary |
| 15 | [`15-acceptance-criteria.md`](./15-acceptance-criteria.md) | §40 | Acceptance Criteria |
| 16 | [`16-hardening-addenda.md`](./16-hardening-addenda.md) | §41 | Hardening Addenda (G11–G25) |
| 17 | [`17-final-auditor-score.md`](./17-final-auditor-score.md) | §42 | Final Auditor Score |
| — | [`audit.md`](./audit.md) | — | Independent audit report (G1–G25) |
| — | [`99-consistency-report.md`](./99-consistency-report.md) | — | Structural health |

### Direct audit anchors

For agents wiring a specific hardening control, jump straight to the gap audit:

- [G21 — Secrets provisioning checklist](./audit.md#g21-secrets-provisioning) (Step 13)
- [G22 — Branch protection enforced](./audit.md#g22-branch-protection-enforced) (Step 14)
- [G23 — Canonical exit-code table drift](./audit.md#g23-exit-code-table-drift) (Step 15)
- [G24 — Secret preflight YAML fix](./audit.md#g24-secret-preflight-yaml-fix) (Step 16)
- [G25 — Release-watcher self-heal contract](./audit.md#g25-release-watcher-self-heal) (Step 17)

---

## Quick Start

1. Read [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) — the full 40-step outline.
2. Read [`02-repo-discovery.md`](./02-repo-discovery.md) → [`06-spec-location-and-extension-shape.md`](./06-spec-location-and-extension-shape.md) for context.
3. Implement using [`03`](./03-download-and-install-scripts.md), [`05`](./05-workflow-files-and-triggers.md), [`07`](./07-enumeration-build-and-packaging.md), [`09`](./09-release-artifacts.md).
4. Enforce [`11-no-committed-zips.md`](./11-no-committed-zips.md) and [`16-hardening-addenda.md`](./16-hardening-addenda.md).
5. Validate against [`15-acceptance-criteria.md`](./15-acceptance-criteria.md).

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

## Acceptance

- [ ] Every sibling `*.md` listed below this index also declares its own `## Acceptance` block (verified by `scripts/audit/check-acceptance.mjs`).
- [ ] All relative links in this file resolve (verified by `scripts/audit/check-dangling-links.mjs`).
- [ ] No operational numeric constant is hardcoded here without binding to `reference/05-runtime-defaults.md` (verified by `scripts/audit/check-must-constants.mjs --strict`).
- [ ] Composite audit score for this folder is `100 / 100` (verified by `scripts/audit/audit-scan.py`).

