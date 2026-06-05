# Accessibility Matrix

| UI element | Role | Label source | Keyboardable | Notes |
|---|---|---|---|---|
| Dropdown root | `listbox` | `aria-label="Prompt picker"` | ✅ | `aria-activedescendant` reflects selection |
| Dropdown item | `option` | Prompt title | via listbox | `aria-selected` true on highlight |
| Search input | `combobox` | "Search prompts" | ✅ | `aria-expanded` mirrors open state |
| Queue panel | `region` | "Prompt queue" | ✅ | `aria-live="polite"` for status updates |
| Toast | `status` | toast text | n/a | `aria-live="polite"`, 5 s dismiss |
| Error banner | `alert` | error message | ✅ | `aria-live="assertive"` |
| Cancel button | `button` | "Cancel current task" | ✅ | Disabled when no running task |

Color contrast: text ≥ 4.5:1, large text ≥ 3:1. Focus ring: 2 px solid `hsl(var(--ring))`.

## Acceptance

- [ ] The implementation satisfies the `Accessibility Matrix` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [Selector standards](mem://ui/selector-standards) for the authoritative rule backing the MUST/SHALL statements in this file.
