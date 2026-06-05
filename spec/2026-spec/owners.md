# Cross-Folder Rule Owners

Single source of truth for rules that recur across folders. Child specs MUST link to the owner mem:// URL listed here instead of restating the rule. Local deltas are allowed but MUST be additive and MUST cite the owner.

## Owners

| Topic | Owner (authoritative) | Notes |
| --- | --- | --- |
| Verbose logging gate + failure-log schema | `mem://standards/verbose-logging-and-failure-diagnostics` | Per-project `Project.VerboseLogging` (default OFF). Failure logs MUST include `Reason`, `ReasonDetail`, `SelectorAttempts[]`, `VariableContext[]`. |
| Verbose logging settings toggle | `mem://features/verbose-logging-toggle` | Settings → Debugging persists `verboseLogging` and hydrates the recorder store. |
| Webhook delivery (result) — single-attempt, no retry/backoff | `mem://constraints/webhook-fail-fast.md` | Applies to **result** webhook only; not to CI notification webhooks (those are owned by `mem://constraints/no-ci-notifications`). |
| CI notifications ban | `mem://constraints/no-ci-notifications` | Never email/Slack/webhook for CI events. |
| No-retry policy | `mem://constraints/no-retry-policy` | Sequential fail-fast; no recursive retry / exponential backoff. |
| Timezone rendering | `mem://localization/timezone` | Store UTC, render with `Intl.DateTimeFormat().resolvedOptions().timeZone`. |

## Enforcement

`scripts/audit/check-cross-folder-owners.mjs` fails CI when a spec mentions an owned topic without a link to its owner mem:// URL. Run locally with `node scripts/audit/check-cross-folder-owners.mjs`.

## Acceptance

- [ ] Every cross-folder topic named in source specs either appears in this owner table or cites a local owner spec.
- [ ] Verification passes when `node scripts/audit/check-cross-folder-owners.mjs` and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` both pass.

## Pitfalls

- **Pitfall**: A spec restates the verbose-logging rule inline and drifts from the owner over time. **Counter-example**: paste a "MUST gate full payloads with verboseLogging" sentence without a link to `mem://standards/verbose-logging-and-failure-diagnostics` — the cross-folder owners check fails.
- **Pitfall**: Confusing the *result* webhook with CI notification webhooks. **Counter-example**: applying `mem://constraints/webhook-fail-fast.md` to a Slack/email CI hook — wrong owner; CI hooks are owned by `mem://constraints/no-ci-notifications`.
