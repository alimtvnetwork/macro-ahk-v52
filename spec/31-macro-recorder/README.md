# Macro Recorder

## Overview

Specification for the macro recorder + replay subsystem: capture user interactions on any page, persist them as portable macro steps, and replay them with full failure diagnostics. Includes the XPath capture engine (`06-xpath-capture-engine.md`), data-source drop zones (`07-data-source-drop-zone.md`), hover highlighter + data controllers (`17-hover-highlighter-and-data-controllers.md`), per-project DB provisioning (`04-per-project-db-provisioning.md`), and the LLM authoring guide (`llm-guide.md`).

Every recorder failure path MUST emit the mandatory failure-log shape (`Reason`, `ReasonDetail`, `SelectorAttempts[]`, `VariableContext[]`) — see `mem://standards/verbose-logging-and-failure-diagnostics`.

## Files
- [`00-overview.md`](./00-overview.md) — phase map
- [`01-glossary.md`](./01-glossary.md), [`02-phases.md`](./02-phases.md), [`03-data-model.md`](./03-data-model.md), [`03-erd.md`](./03-erd.md)
- [`04-per-project-db-provisioning.md`](./04-per-project-db-provisioning.md)
- [`06-xpath-capture-engine.md`](./06-xpath-capture-engine.md), [`07-data-source-drop-zone.md`](./07-data-source-drop-zone.md)
- Remaining files: see directory listing (numeric order, each numbered file is a phase or feature slice)
