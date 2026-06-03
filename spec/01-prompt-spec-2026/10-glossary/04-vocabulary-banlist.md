# T24 · Vocabulary ban-list

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

To keep this spec genuinely generic, certain product / project / vendor
identifiers from the source codebase MUST NOT appear in any file under
`spec/2026-spec/`. A spec reviewer (human or AI) should grep
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
