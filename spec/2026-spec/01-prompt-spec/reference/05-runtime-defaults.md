# Runtime Defaults

Single source of truth for every numeric constant in the spec. Implementation MUST import these from one module (e.g. `src/shared/defaults.ts`) — no inline magic numbers.

| Constant | Default | Range | Source |
|---|---:|---|---|
| `TRIGGER_KEY` | `/` | single char | `05-ui-contract/01-trigger.md` |
| `DELAY_MS` | 1500 | 0..600000 | `12-delay-engine/01-default.md` |
| `JITTER_MS` | 250 | 0..60000 | `12-delay-engine/03-jitter.md` |
| `SKIP_FIRST_DELAY` | true | bool | `12-delay-engine/04-skip-first.md` |
| `MAX_RETRIES` | 1 | 0..3 | `11-queue-lifecycle/03-retry-and-hold.md` |
| `QUEUE_CAPACITY` | 100 | 1..1000 | `10-queue-model/04-capacity.md` |
| `SUBMIT_GRACE_MS` | 5000 | 0..30000 | `09-next-overview/03-disabled-button-handling.md` |
| `PASTE_VERIFY_TIMEOUT_MS` | 1000 | 100..5000 | `06-injection-contract/04-paste-verification.md` |
| `TOAST_DISMISS_MS` | 5000 | 1000..15000 | `06-injection-contract/05-paste-toast.md` |
| `DROPDOWN_MAX_ITEMS` | 50 | 10..200 | `05-ui-contract/02-dropdown-shape.md` |
| `PROMPT_BODY_MAX_BYTES` | 65536 | fixed | `schemas/01-prompt.schema.json` |
| `LOADER_CACHE_LRU_SIZE` | 64 | 16..256 | `04-loader-contract/02-cache-rules.md` |
| `LOG_TRUNCATE_HTML` | 120 | when verbose=false | `mem://standards/verbose-logging-and-failure-diagnostics` |
| `LOG_TRUNCATE_TEXT` | 240 | when verbose=false | same |

## Acceptance

- [ ] The implementation satisfies the `Runtime Defaults` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
