# 30 — Next-Button Reference

## Overview

Captures the Vibedeals "Next →" V16 reference script as the canonical source
for Marco's dynamic-prompt expansion (`Plan 5 … Plan 100`, `Next 1 steps …
Next 8 steps`). The reference itself lives at
`assets/01-next-button/next-button.js`; this folder hosts the spec that maps
its `variants` schema onto Marco's `replaceKey` / `replaceValues` /
`slugTemplate` fields and documents the chip-row UX direction.

## Files

- `01-spec.md` — Full spec: schema mapping, single-shot paste contract,
  chip-row UX plan, and what is intentionally out of scope (queue/drain
  runtime, typeahead, arrow-key navigation).
