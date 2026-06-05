# T24 · Vocabulary ban-list

**Created:** 2026-06-02

To keep this spec genuinely generic, certain product / project / vendor
identifiers from the source codebase MUST NOT appear in any file under
`spec/2026-spec/01-prompt-spec/`. A spec reviewer (human or AI) should grep
the folder for any of the forbidden tokens below and reject the change
if hits are found outside this exact file.

## Forbidden tokens

| Token | Replace with |
|---|---|
| `MacroController` / `macro-controller` | `HostApp UI surface` / `Prompts feature` |
| `Marco SDK` / `marco-sdk` / `RiseupAsiaMacroExt` | `the runtime` / generic interface name |
| `Lovable` (product) / `lovable.app` / `lovable.dev` | `HostApp` (the brand is irrelevant) |
| `chrome.*` (`chrome.runtime`, `chrome.storage`, `chrome.tabs`, `chrome.scripting`) | abstract interface (`MessageBus`, `KeyValueStore`, …) |
| `IndexedDB`, `OPFS`, `SQLite`, `localStorage` as the *only* option | name them as **possible** backends behind a store interface |
| `chrome-extension://`, `manifest.json`, `service_worker` | none — extension topology is not part of this spec |
| `Riseup Asia LLC` | author field is integrator's choice |
| Internal file paths (`src/...`, `standalone-scripts/macro-controller/...`) | refer only to `standalone-scripts/prompts/` as a **read-only reference corpus** |
| `pnpm`, `bun`, `vite`, `tsconfig.macro.*` | build system is out of scope |

## Allowed exceptions

- This file itself (the ban-list necessarily names the banned tokens).
- `00-overview.md` § "Source feature" header, which cites the source
  files once for provenance.

## Enforcement recipe

```bash
rg -n -i \
  -e 'MacroController|marco-sdk|RiseupAsiaMacroExt|chrome\.(runtime|storage|tabs|scripting)|lovable\.(app|dev)' \
  spec/2026-spec \
  | rg -v '04-vocabulary-banlist\.md|00-overview\.md'
```

Zero output ⇒ spec is clean.

## Acceptance

- [ ] The implementation satisfies the `T24 · Vocabulary ban-list` contract in this file and the folder-level acceptance target: all downstream terms, actors, states, and banned vocabulary stay defined and consistently named.
- [ ] Verification passes when `LINT-glossary-coverage` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
