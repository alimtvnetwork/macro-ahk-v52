# App Spec

## Overview

End-to-end specification for the **Macro Controller** Chrome extension app — the largest spec section in the repo. Covers the extension shell (`01-chrome-extension/`), feature areas (`02-features/`, including `macro-controller/` sub-specs for credits, workspaces, tooltips, member popups), the data + API contract (`03-data-and-api/`), visual design diagrams (`04-design-diagrams/`), the Prompts subsystem (`05-prompts/`), and the executable task breakdown (`06-tasks/`). New work starts in `00-overview.md` then drops into the matching subdir.

## Files
- [`00-overview.md`](./00-overview.md) — feature map + entry rules
- [`01-fundamentals.md`](./01-fundamentals.md) — app-wide invariants

## Subdirectories
- [`01-chrome-extension/`](./01-chrome-extension/) — manifest, background SW, injection lifecycle
- [`02-features/`](./02-features/) — feature-level specs (macro-controller, prompts, etc.)
- [`03-data-and-api/`](./03-data-and-api/) — data contracts + REST shapes
- [`04-design-diagrams/`](./04-design-diagrams/) — Mermaid + XMind diagrams
- [`05-prompts/`](./05-prompts/) — prompt library + cache, **Macros**, **Variables** (5-tier resolution), **MacroPrompts** (aggregated from `standalone-scripts/macro-prompts/`)
- [`06-tasks/`](./06-tasks/) — master task breakdown + seeding
