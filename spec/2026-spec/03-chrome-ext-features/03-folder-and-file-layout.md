# 03 — Folder and File Layout

## Why this step exists

A predictable source tree lets any LLM open the repo and know where to add a
content script, popup module, background handler, storage helper, or test
without re-learning the project. This file is a **layout contract**, not a
style preference: the import boundaries and output paths below are required by
the injection, reload, storage, logger, and acceptance steps.

## Repo binding

Generic examples in this folder MUST be concretized to this repo's product
namespace: `RiseupAsiaMacroExt`. Forks MAY rename the namespace, but they MUST
keep the same folder boundaries, bridge envelope, sentinel attributes, logging
payload shape, and audit scripts.

For this repo, prefer plain TypeScript UI modules unless an existing React
surface already owns the area. Do not introduce React solely because this
generic tree mentions `.tsx` examples.

## Canonical tree

```text
my-extension/
├── manifest.json                  # source or generated mirror; see manifest mode
├── package.json
├── tsconfig.json
├── vite.config.ts                 # or rollup / webpack — one bundler config
├── README.md
├── CHANGELOG.md
├── public/                        # static assets copied verbatim to dist/
│   ├── icons/{16,48,128}.png
│   └── sql-wasm.wasm              # bundled, never CDN-loaded, only when SQLite exists
├── src/
│   ├── shared/                    # pure cross-context utilities; no chrome/DOM/React
│   │   ├── constants.ts           # ID_/SEL_/ATTR_/CSS_/MSG_/EVT_ constants
│   │   ├── generated/version.ts   # generated VERSION / BUILD_ID mirror (step 04)
│   │   ├── url-utils.ts           # isNewTabOrBlankUrl(), normalizeUrl()
│   │   ├── types.ts               # SqlValue, JsonValue, CaughtError
│   │   └── logger.ts              # namespace logger types only; no runtime chrome.*
│   ├── background/                # service worker entry + handlers
│   │   ├── index.ts               # SW top-level: bind listeners synchronously
│   │   ├── reload.ts              # chrome.runtime.reload wrapper (step 05)
│   │   ├── injection/
│   │   │   ├── lifecycle.ts       # 7-stage state machine (step 08)
│   │   │   ├── sentinel.ts        # idempotency probe (step 09)
│   │   │   └── cache.ts           # build-id-aware IDB cache (step 17)
│   │   ├── handlers/              # one file per message kind
│   │   │   ├── reload-handler.ts
│   │   │   ├── inject-handler.ts
│   │   │   └── error-handler.ts
│   │   └── __tests__/
│   ├── content/                   # ISOLATED-world content scripts
│   │   ├── bridge.ts              # validated postMessage relay to MAIN
│   │   ├── panel/                 # floating in-page panel (step 15)
│   │   │   ├── panel.ts
│   │   │   ├── drag.ts
│   │   │   └── minimize.ts
│   │   └── __tests__/
│   ├── injected/                  # MAIN-world scripts; no chrome.*
│   │   ├── sdk.ts                 # window.RiseupAsiaMacroExt SDK surface
│   │   └── __tests__/
│   ├── popup/                     # browser action popup (HTML + JS)
│   │   ├── popup.html
│   │   ├── popup.ts               # use popup.tsx only when React already owns popup
│   │   ├── lib/extension-env.ts   # chrome.* availability guard
│   │   ├── components/
│   │   │   ├── inject-button.ts
│   │   │   ├── reload-button.ts
│   │   │   ├── version-badge.ts
│   │   │   └── log-panel.ts
│   │   └── __tests__/
│   ├── options/                   # optional; only when manifest declares options_ui
│   │   ├── options.html
│   │   └── options.ts
│   ├── storage/                   # all persistence (see sibling db/sqlite spec)
│   │   ├── sqlite/                # sql.js + per-namespace DBs
│   │   ├── idb/                   # IndexedDB wrappers
│   │   └── kv/                    # chrome.storage.local helpers
│   └── platform/                  # adapter abstracting chrome.* per browser
│       └── index.ts
├── scripts/                       # build/dev/release helpers; never shipped
│   ├── dev-watch-reload.mjs       # file-watcher → SW reload (step 06)
│   ├── compile-instruction.mjs    # manifest/version generators
│   ├── prebuild-clean-and-verify.mjs
│   └── __tests__/
├── spec/                          # this folder hierarchy
└── dist/                          # generated output; do not edit source here
```

`dist/` may exist locally, but source changes MUST NOT be made inside it and it
SHOULD NOT be committed unless a release policy explicitly requires artifacts.

## Manifest source mode

The repo MUST choose exactly one manifest mode and document it in
`scripts/prebuild-clean-and-verify.mjs` or its successor:

| Mode | Source of truth | Required behavior |
|---|---|---|
| Root-manifest mode | root `manifest.json` | Build copies root `manifest.json` into `dist/` without hand-regeneration. |
| Generated-manifest mode | `src/instruction.ts` / instruction manifest source | Build regenerates root or `dist/manifest.json`, then verifies the generated file matches step 02. |

This repo uses **generated-manifest mode** when `scripts/compile-instruction.mjs`
or `src/instruction.ts` is present; otherwise it uses root-manifest mode. A
blind implementation MUST NOT assume both modes at once.

## Required `src/` folders

`src/` MUST contain exactly these required top-level folders:

1. `shared`
2. `background`
3. `content`
4. `injected`
5. `popup`
6. `storage`
7. `platform`

`src/options` MAY exist only when `manifest.json` declares an options page.
Other top-level `src/*` folders require a spec update before they are added.

## Naming rules

1. **kebab-case** for files and folders. `PascalCase.ts` filenames are
   forbidden unless an existing React surface already uses component filenames.
2. **New tests** live in a `__tests__/` folder next to the code they cover.
   Test file name: `<source-basename>.test.ts` or `.test.mjs`. Existing tests
   are not moved unless the feature being edited owns that area and the move is
   part of the same tested change.
3. **Constants** are SCREAMING_SNAKE_CASE with a typed prefix:
   `ID_*`, `SEL_*`, `ATTR_*`, `CSS_*`, `MSG_*`, `EVT_*`.
4. **One responsibility per file.** A non-test background handler MUST NOT
   exceed 300 physical lines. Prefer splitting at 250 lines; audit threshold is
   300.
5. **No deep relative imports** (`../../../`). Use canonical aliases in both
   `tsconfig.json` and the bundler.

## Canonical path aliases

The alias list below is normative. `tsconfig.json` and the bundler config MUST
define the same targets.

| Alias | Target |
|---|---|
| `@shared/*` | `src/shared/*` |
| `@background/*` | `src/background/*` |
| `@content/*` | `src/content/*` |
| `@injected/*` | `src/injected/*` |
| `@popup/*` | `src/popup/*` |
| `@storage/*` | `src/storage/*` |
| `@platform/*` | `src/platform/*` |

## Shared-folder purity

`src/shared/` is framework-free and context-free. It MAY export pure functions,
constants, and types. It MUST NOT import or reference:

- `react`, `react-dom`, JSX runtimes, or UI components.
- `chrome.*`, `browser.*`, `window`, `document`, `localStorage`,
  `sessionStorage`, `navigator.clipboard`, DOM events, or extension pages.
- Storage implementations; shared types may name storage payload shapes only.

Exception: `src/shared/types.ts` may contain explicit type-only ambient
declarations if needed. Runtime use remains forbidden.

Static gate: `scripts/audit-shared-purity.mjs` fails if forbidden imports or
tokens appear under `src/shared/**`.

## Build output (`dist/`)

The bundler must produce a `dist/` folder whose top level matches what the
manifest references:

```text
dist/
├── manifest.json
├── background.js
├── content.js
├── injected/sdk.js
├── popup.html
├── popup.js
├── options.html                 # only when manifest declares options_ui
├── options.js                   # only when options.html exists
├── icons/…
└── sql-wasm.wasm                # only when SQLite/sql.js is enabled
```

Rules:

- `emptyOutDir: false` or equivalent is required for incremental builds so
  generated instruction snapshots and build-id artifacts survive. This does
  **not** permit stale entrypoints.
- `scripts/audit-dist-reachability.mjs` MUST verify:
  - Every file referenced by `dist/manifest.json` exists.
  - Every entry chunk in `dist/` is referenced by the manifest, popup/options
    HTML, or a known asset manifest.
  - Stale previous-build entrypoints are reported with exact path, missing
    manifest/HTML reference, and `ReasonDetail`.
- The zipped artifact uploaded to the store is `dist/` itself, not its parent.

## Cross-context import and communication rules

Direct imports across runtime contexts are forbidden. Use the approved channel
instead.

| Forbidden direct import | Approved communication |
|---|---|
| `popup/` → `background/` | `chrome.runtime.sendMessage` with typed message envelopes. |
| `content/` → `background/` | `chrome.runtime.sendMessage` from ISOLATED world. |
| `background/` → `content/` | `chrome.tabs.sendMessage` or `chrome.scripting.executeScript`. |
| `content/` ↔ `injected/` | Validated `window.postMessage` bridge envelope from step 02. |
| `injected/` → `background/` | MAIN → ISOLATED relay → background; never direct `chrome.*`. |

Allowed imports:

| From → To | Allowed? | Notes |
|---|---:|---|
| any → `shared/` | yes | Only if `shared/` purity holds. |
| same folder/domain → same folder/domain | yes | Keep responsibility boundaries. |

Enforcement:

- `eslint.config.js` MUST include `no-restricted-imports` rules for forbidden
  context imports.
- `scripts/audit-import-boundaries.mjs` MUST scan compiled and source files for
  deep relative imports and forbidden cross-context paths.

## Where new code goes (decision table)

| Need | Folder |
|---|---|
| New message kind handled in the SW | `src/background/handlers/` |
| New popup button / view | `src/popup/components/` or existing popup UI module |
| New DOM interaction in the page (ISOLATED) | `src/content/` |
| New page-global SDK behavior (MAIN) | `src/injected/` |
| New storage table / KV key | `src/storage/<layer>/` |
| New cross-context pure helper | `src/shared/` |
| New browser API wrapper | `src/platform/` |
| New dev/release script | `scripts/` (never ship to `dist/`) |

## Common pitfalls and counter-examples

- Putting a React component in `src/shared/` — `shared/` must be framework-free.
- Importing `chrome.*` from `src/injected/` — MAIN world has no `chrome.*`.
- Adding `@shared/*` to `tsconfig.json` but not `vite.config.ts` — tests may
  pass while bundling fails.
- Leaving `dist/background.old.js` after a rename — `emptyOutDir: false` does
  not excuse stale entrypoints.
- Creating `src/options/` just to satisfy a checklist — options exists only
  when the manifest declares `options_ui`.
- Using `window.MyExt` in examples for this repo — the correct namespace is
  `window.RiseupAsiaMacroExt`.

## Acceptance

A reviewer can answer "yes" to every line:

- [ ] The repo uses exactly one manifest mode: root-manifest mode or
      generated-manifest mode.
- [ ] Repo root contains exactly one `package.json` and no duplicate root
      manifest source outside the chosen manifest mode.
- [ ] `src/` contains exactly the seven required folders: `shared`,
      `background`, `content`, `injected`, `popup`, `storage`, `platform`.
- [ ] `src/options` exists only when `manifest.json` declares an options page.
- [ ] `tsconfig.json` and the bundler config contain the canonical alias table
      with matching targets.
- [ ] No source file uses `../../../` imports.
- [ ] `scripts/audit-shared-purity.mjs` passes for `src/shared/**`.
- [ ] `eslint.config.js` and `scripts/audit-import-boundaries.mjs` reject
      forbidden cross-context imports.
- [ ] No non-test background handler exceeds 300 physical lines.
- [ ] `dist/` after build matches manifest and HTML references; stale
      entrypoints are rejected with exact path and reason detail.

## Tests to ship with this step

- `scripts/__tests__/folder-layout.test.mjs` — asserts the required `src/`
  folders, optional `src/options` rule, and one manifest mode.
- `scripts/__tests__/path-aliases.test.mjs` — asserts `tsconfig.json` and the
  bundler expose the canonical alias table with identical targets.
- `scripts/__tests__/import-boundaries.test.mjs` — fixtures prove
  `popup → background`, `content ↔ injected`, and `injected → chrome.*` direct
  usage fail.
- `scripts/__tests__/shared-purity.test.mjs` — fixtures prove React, DOM,
  chrome/browser APIs, local/session storage, and clipboard usage fail under
  `src/shared/**`.
- `scripts/__tests__/dist-reachability.test.mjs` — fixture build outputs prove
  manifest references exist and stale entrypoints are rejected.
