# T23 · Non-goals

**Created:** 2026-06-02

Things this spec deliberately does **not** cover. If a future task
proposes one of these, push back and link this file.

| # | Non-goal | Why excluded |
|---|---|---|
| NG1 | User auth / login for prompt sync | Out of scope; assume HostApp already authenticates the user. |
| NG2 | Multi-user prompt sharing / cloud sync | Single-user, single-device baseline. A `RemotePromptStore` is allowed as an *implementation* of `PromptStore` but not specified here. |
| NG3 | Prompt versioning UI (history, diff, rollback) | `Prompt.version` is a string field only; UI is future work. |
| NG4 | Telemetry transport (Sentry/OTLP/etc.) | `130-observability/` defines event *shape*; sending wire is integrator's choice. |
| NG5 | LLM provider abstraction | The HostApp owns its chatbot; we only paste text into its ChatBox. |
| NG6 | Authoring AI-generated prompts inside the dropdown | Create/Edit flows accept human input only. |
| NG7 | Mobile-specific gesture handling | Desktop / pointer-first; mobile is a future spec. |
| NG8 | Internationalisation of the dropdown chrome | English-only baseline; prompt **bodies** can be in any language. |
| NG9 | Rich-media prompts (images, files, audio) | Text-only `prompt.md` bodies. |
| NG10 | Recovery from HostApp DOM redesigns | Selector drift is the Integrator's responsibility, surfaced via `100-failure-handling/`. |

## Acceptance

- [ ] The implementation satisfies the `T23 · Non-goals` contract in this file and the folder-level acceptance target: all downstream terms, actors, states, and banned vocabulary stay defined and consistently named.
- [ ] Verification passes when `LINT-glossary-coverage` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md` (e.g. `DELAY_MS = 5000 ms`, `MAX_RETRIES = 3`).
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

