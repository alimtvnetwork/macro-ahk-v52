# Coding Guidelines (per language)

## Overview

Per-language coding standards. Each subdir contains the rules for one language stack — TypeScript is authoritative for this repo (`02-typescript/`), and `01-cross-language/` defines invariants that apply everywhere (naming, error handling, formatting). The non-TypeScript stacks (`03-golang`, `04-php`, `05-rust`, `07-csharp`) are reference material for cross-project portability; they are not used in the runtime build but inform the AI-optimization guidance in `06-ai-optimization/`.

Read this together with `spec/17-consolidated-guidelines/` (the cross-rule index) and `.lovable/coding-guidelines.md` (the always-in-context summary).

## Files
- [`00-overview.md`](./00-overview.md) — scope + reading order

## Subdirectories
- [`01-cross-language/`](./01-cross-language/) — invariants applied to every stack
- [`02-typescript/`](./02-typescript/) — authoritative TS rules
- [`03-golang/`](./03-golang/), [`04-php/`](./04-php/), [`05-rust/`](./05-rust/), [`07-csharp/`](./07-csharp/) — reference stacks
- [`06-ai-optimization/`](./06-ai-optimization/) — LLM-friendly authoring guidance
