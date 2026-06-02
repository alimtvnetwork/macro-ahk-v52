# Component Tests

Location: `tests/components/prompts/`. Runner: `bunx vitest run` with `@testing-library/react`. React component test ban LIFTED 2026-05-25.

## Components under test

| Component | File | Cases |
|-----------|------|-------|
| `PromptsButton` | `prompts-button.test.tsx` | renders each of 6 `data-state` values; ARIA combobox attrs present; click toggles panel |
| `PromptsPanel` | `prompts-panel.test.tsx` | tabs switch (Prompts/Macros); virtualized list renders only visible rows; ESC closes; focus-trap honored |
| `FilterSearch` | `filter-search.test.tsx` | substring match deterministic; 80ms debounce via fake timers; `<mark>` highlighting positions correct |
| `CategoryChip` | `category-chip.test.tsx` | built-in chips non-deletable; user chips show edit/delete; color token applied |
| `MacroBuilder` | `macro-builder.test.tsx` | add/remove/reorder steps; variable form validates required + Enum; Save disabled on invalid Ajv |
| `RunBanner` | `run-banner.test.tsx` | renders each state (Running/Paused/Looping/Done/Failed); pause/resume/stop buttons dispatch correct messages |
| `VariableInputDialog` | `variable-input-dialog.test.tsx` | renders one widget per Type; required fields block Submit; ESC cancels; Sensitive masks input |

## Conventions
- Each test wraps the component in a fresh `EngineProvider` with stubbed `engine` API.
- No real `chrome.*` — `tests/helpers/chrome-stub.ts`.
- Snapshot tests **forbidden** — assert specific DOM nodes / accessible queries (`getByRole`, `getByText`).
- All async UI uses `findBy*` / `waitFor` (no `setTimeout` in tests).
- Dark-only theme: tests run with `documentElement.classList.add('dark')` in `setup.ts`.

## Forbidden
- Snapshot tests
- `unknown` casts
- Direct `chrome.runtime` access (must go through stub)
- Sleeps (`new Promise(r => setTimeout(r, …))`)

## Failure assertions
For any error UI rendered by a component, assert the full mandatory failure shape is rendered in the **Show details** dialog (Reason, ReasonDetail, VariableContext, SelectorAttempts).
