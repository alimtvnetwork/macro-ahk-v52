# What To Read — AI Onboarding Map (top-level pointer)

> **Purpose:** Tell the next AI exactly which files to open to understand the
> project's folder structure, the canonical JSON shapes, and how to add a new
> prompt / instruction / config entry / unit test / spec / feature without guessing.
>
> Read this file first on every fresh session, then the targeted files below.
>
> **Note:** This is the top-level discovery copy. The authoritative canonical
> version lives at [`.lovable/memory/what-to-read.md`](./memory/what-to-read.md)
> and is mirrored here so a fresh AI session that lists `.lovable/` finds it
> immediately. Keep the two in sync when editing.

---



## 1. Project Orientation (read in order)

| # | Path | What it tells you |
|---|------|--------------------|
| 1 | `readme.md` § Project Structure | Monorepo tree (src/, standalone-scripts/, spec/, scripts/, .lovable/) and tech stack |
| 2 | `.lovable/memory/index.md` | Always-loaded core rules + index of every project memory file |
| 3 | `.lovable/strictly-avoid.md` | Hard prohibitions — never violate |
| 4 | `.lovable/coding-guidelines.md` | Function size, naming, error handling, Boolean/Enum rules |
| 5 | `.lovable/plan.md` | Active prioritized backlog (authoritative) |
| 6 | `.lovable/suggestions.md` | Open/closed Lovable suggestions tracker |
| 7 | `spec/00-overview.md` | Master index of the spec tree (slots 01–20 foundations, 21+ app tier) |
| 8 | `spec/26-macro-controller/` | Macro Controller architecture, lifecycle, JSON contracts |
| 9 | `changelog.md` + `standalone-scripts/macro-controller/changelog.md` | What shipped, when, and why |

---

## 2. JSON Structure — Canonical Files

All runtime JSON consumed by the Macro Controller is **generated** from
TypeScript / Markdown sources. Edit the **source**, not the JSON.

### 2.1 Controller config — `02-macro-controller-config.json`

- **Path:** `standalone-scripts/macro-controller/02-macro-controller-config.json`
- **Shape:** `{ schemaVersion, description, comboSwitch{xpaths, fallbacks}, … }`
- **Source of truth:** `standalone-scripts/macro-controller/src/config-validator.ts`
  (defaults + validation) and `src/instruction.ts` (manifest)
- **Schema reference:** `spec/06-seedable-config-architecture/` + the
  `config-validator.ts` type guards
- **How it's loaded:** `config-validator.ts` reads it through
  `RiseupAsiaMacroExt.Config.get()` (storage layer: `chrome.storage.local`)

### 2.2 Prompts — `03-macro-prompts.json`

- **Path:** `standalone-scripts/macro-controller/03-macro-prompts.json`
- **Shape:**
  ```json
  {
    "prompts": [
      { "name": "...", "text": "...", "id": "default-<slug>",
        "slug": "...", "version": "1.0.0", "order": N,
        "isDefault": true, "category": "onboarding" }
    ]
  }
  ```
- **Source of truth:** `standalone-scripts/prompts/<NN-slug>/prompt.md` +
  `info.json` (per-prompt folder)
- **Generator:** `scripts/aggregate-prompts.mjs` — walks `standalone-scripts/prompts/`,
  reads each `prompt.md` + `info.json`, emits the consolidated JSON
- **Casing guard:** `scripts/check-prompt-info-casing.mjs` (CI preflight)

### 2.3 Theme — `04-macro-theme.json`

- **Path:** `standalone-scripts/macro-controller/04-macro-theme.json`
- **Shape:** Dark-only theme tokens (colors, spacing, typography)
- **Source of truth:** `standalone-scripts/macro-controller/less/` + `config-validator.ts`
- **Rule:** Dark theme is **enforced** — never add light-mode variants

### 2.4 Instruction manifest — `instruction.json` (per script)

- **Path (built):** `standalone-scripts/<script>/dist/instruction.json`
- **Source of truth:** `standalone-scripts/<script>/src/instruction.ts`
- **Generator:** `scripts/compile-instruction.mjs` — emits PascalCase canonical
  + camelCase compat snapshot (Phase 2b dual-emit, see
  `mem://architecture/instruction-dual-emit-phase-2b`)
- **Validators:** `scripts/validate-instruction-schema.mjs`,
  `scripts/check-instruction-json-casing.mjs`,
  `scripts/check-pascalcase-instruction-migration.mjs`

### 2.5 Templates — `templates.json`

- **Path (built):** `standalone-scripts/macro-controller/dist/templates.json`
- **Source of truth:** `standalone-scripts/macro-controller/templates/*.html`
- **Generator:** `scripts/compile-templates.mjs`

---

## 3. How To Create A New Prompt ("slide")

1. Pick the next free numeric prefix in `standalone-scripts/prompts/` (e.g. `21-`).
2. Create the folder: `standalone-scripts/prompts/21-<slug>/`
3. Add **two** files:
   - `prompt.md` — the full prompt body (verbatim, what the user will see)
   - `info.json` — metadata:
     ```json
     {
       "name": "Human Title",
       "slug": "kebab-slug",
       "id": "default-<slug>",
       "version": "1.0.0",
       "order": 21,
       "isDefault": true,
       "category": "onboarding | maintenance | testing | release | docs"
     }
     ```
4. Run `node scripts/aggregate-prompts.mjs` (also wired into the build).
   Output: `standalone-scripts/macro-controller/03-macro-prompts.json` regenerated.
5. CI guard `check-prompt-info-casing.mjs` validates key casing.
6. Ship: bump patch version (`manifest.json`, `src/shared/constants.ts`,
   `standalone-scripts/macro-controller/src/instruction.ts`,
   `standalone-scripts/macro-controller/src/shared-state.ts`, `readme.md`).
7. Add a `changelog.md` + macro-controller changelog entry.

> Reference: existing prompts under `standalone-scripts/prompts/` (01–20)
> are exemplars — copy the layout exactly.

---

## 4. How To Add A New Config Key

1. Add the typed default in
   `standalone-scripts/macro-controller/src/config-validator.ts`
   (defaults block + validator).
2. Update the seeded JSON: `02-macro-controller-config.json`.
3. Document the key in `spec/26-macro-controller/` and in
   `spec/06-seedable-config-architecture/`.
4. Add a unit test under
   `standalone-scripts/macro-controller/src/__tests__/` proving defaults
   apply when the key is missing or malformed.
5. Version bump + changelog entry per §3 step 6–7.

---

## 5. How To Add A New Standalone Script

1. Scaffold: `standalone-scripts/<name>/` with `src/`, `src/instruction.ts`,
   build entry, optional `less/` and `templates/`.
2. Add the script to the build pipeline (`scripts/` + `package.json`).
3. Register injection rules in `src/background/` (see
   `mem://architecture/script-injection-lifecycle`).
4. Document under `spec/21-app/01-chrome-extension/` and add a memory entry
   in `.lovable/memory/architecture/`.

---

## 6. Where Tests Live

| Scope | Path |
|-------|------|
| Extension unit/regression | `src/**/__tests__/*.test.ts(x)` |
| Standalone-script unit | `standalone-scripts/<name>/src/__tests__/*.test.ts` |
| Standalone-script E2E | `standalone-scripts/<name>/tests/e2e/**/*.test.ts` |
| Playwright integration | `tests/` (root) |
| Vitest config | `vitest.config.ts` (root) |

Run a single file: `bunx vitest run <path>`.

### 6.1 How to add a unit test alongside a new feature/fix

Per `mem://preferences/test-with-features`, **every feature or fix ships with a matching test**:

1. Place the test next to the code: `<feature>.ts` → `__tests__/<feature>.test.ts`.
2. Use Vitest's `describe` / `it` / `expect`; mock chrome APIs via `vi.stubGlobal`.
3. React components → React Testing Library + `@testing-library/jest-dom` (see `src/pages/__tests__/Options.test.tsx` as a reference).
4. Standalone-script logic → pure-TS test under `standalone-scripts/<name>/src/__tests__/`.
5. Run `bunx vitest run <new-test-path>` to confirm it passes before committing.
6. CI runs the full suite automatically — no extra wiring needed.

### 6.2 How to add a new feature end-to-end

1. **Spec first** — draft / update the relevant spec under `spec/21-app/` or `spec/26-macro-controller/`. See §7 below for spec folder slots.
2. **Plan entry** — add a row in `.lovable/plan.md` (status `⏳ Pending`).
3. **Code** — follow `.lovable/coding-guidelines.md` (function size ≤ 25 lines, no `any`/`unknown`, named constants, defensive `?.`/`??`).
4. **Test** — per §6.1 above. No PR without a matching test.
5. **Memory** — if the feature introduces a new convention/contract/gotcha, write a memory file under `.lovable/memory/<topic>/` and add an index entry in `.lovable/memory/index.md`.
6. **Changelog + version bump** — see §3 step 6–7 for the five pinning points.

### 6.3 How to add a new spec

1. Pick the correct slot: `01–20` = foundations, `21+` = app tier. See `spec/00-overview.md`.
2. Use the next free numeric prefix (`spec/26-macro-controller/27-<name>.md` etc.).
3. Follow `spec/01-spec-authoring-guide/` (v3.5.0) — sections: Goal, Non-goals, Contracts, Acceptance, References.
4. Link the spec from `spec/00-overview.md` and from `.lovable/plan.md` if it tracks an active workstream.
5. CI guard `scripts/check-spec-prompts-xrefs.mjs` validates cross-references.

---



## 7. Folder Cheat-Sheet

```
src/                          # Extension UI + service worker
standalone-scripts/           # Injectable IIFE bundles
  marco-sdk/                  # Shared SDK (require, messaging)
  macro-controller/           # Core automation + config/theme/prompt JSON
  xpath/                      # XPath utilities
  prompts/                    # NN-slug/ folders (prompt source)
spec/                         # Specification tree (v3.5.0 layout)
  01-spec-authoring-guide/    # Foundations
  02-coding-guidelines/       # 26 engineering rules
  21-app/                     # App-tier specs
  26-macro-controller/        # Macro Controller specs
scripts/                      # Build helpers, validators, installers
.lovable/                     # AI memory + plan + suggestions + prompts
  memory/                     # Per-topic memory files (indexed via index.md)
  prompts/                    # Reusable AI prompts (write-memory, etc.)
  pending-issues/             # Open issue files
  solved-issues/              # Resolved issue files (with Solution + Learning)
  cicd-issues/                # CI/CD-specific issues
  question-and-ambiguity/     # Ambiguity log (No-Questions Mode)
chrome-extension/             # Built MV3 output (git-ignored)
```

---

## 8. Hard Rules When Touching JSON / Generated Files

- Never edit `*.generated.*` or `dist/instruction.json` directly — edit the
  `.ts` source and re-run the compiler.
- Never edit `03-macro-prompts.json` by hand — edit
  `standalone-scripts/prompts/<NN-slug>/{prompt.md,info.json}` and re-aggregate.
- Versioning must stay unified across **all** five pinning points (see §3 step 6).
- Dark-theme tokens only — no light-mode variants in `04-macro-theme.json`.
- `readme.txt` is **strictly off-limits** for time/clock/git-stamp content
  (see `mem://constraints/readme-txt-prohibitions`).

---

*Last updated: 2026-05-29 (v3.34.1). Update this file whenever a new
generator, JSON contract, or prompt convention is introduced.*
