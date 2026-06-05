# T22 · Actors

**Created:** 2026-06-02

Three actors interact with this spec. Every later section MUST be
readable from at least one of these vantage points.

## 1. End User
- Picks prompts from a dropdown, edits them, kicks off Next/Plan loops.
- Cares about: prompt findability, paste reliability, delay tuning, cancel.
- Does **not** know or care about XPaths, queues, or adapters.

## 2. Integrator (engineer wiring the feature into a HostApp)
- Implements `PromptStore`, `QueueStore`, `SettingsStore` against their stack.
- Answers Q1–Q8 in `140-integration-onboarding/01-questionnaire.md`.
- Picks an `EditorKind` and the matching paste adapter.
- Cares about: deterministic contracts, framework-agnostic snippets, smoke tests.

## 3. AI Model consuming this spec
- Reads the folder top-to-bottom to regenerate the feature in a new codebase.
- Needs explicit interfaces, no hidden coupling to this repo, and an
  unambiguous `???` convention for every host-supplied value.
- MUST be able to ask the human Integrator the Q1–Q8 questions before
  emitting code.

## Out of scope (not actors)
- HostApp backend / chatbot LLM provider.
- Telemetry collector.
- CI / release pipeline of the HostApp.
