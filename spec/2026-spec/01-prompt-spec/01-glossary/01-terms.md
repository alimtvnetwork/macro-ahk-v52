# T21 · Terms

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Canonical vocabulary for this spec. Any future doc that uses these
words MUST use the meaning given here.

| Term | Meaning |
|---|---|
| **Prompt** | A reusable, named block of text the user can inject into a chat-box. Stored as `info.json` + `prompt.md` on disk, or any equivalent record in a `PromptStore`. |
| **PromptCategory** | A free-form tag-like grouping (e.g. `automation`, `versioning`). One prompt may belong to multiple categories. |
| **PromptStore** | Interface that lists/reads/writes prompts. Implementation (JSON file, IndexedDB, REST, in-memory) is up to the integrator. |
| **ChatBox** | The host app's text-input element that the user normally types into to talk to its chatbot/LLM. Located via integrator-supplied selector (Q1, see `00-overview.md`). |
| **Injection** | The act of writing prompt text into the ChatBox so the host app treats it as user input. |
| **SubmitTarget** | The host app's send / "Add to Tasks" button that fires the chatbot turn. Located via Q2. |
| **NextLoop** | An automation that enqueues N copies of a "next-task" prompt and runs them one-by-one with a delay between submissions. |
| **PlanLoop** | The same engine as NextLoop but using a "plan-task" prompt template; user picks how many plan iterations to queue. |
| **Queue / QueuedTask** | In-memory (optionally persisted) FIFO of pending submissions. One task = one injection + one submit. |
| **Delay** | Sleep time inserted between two queued submissions. Default 7 s, configurable 5–10 s. |
| **HostApp** | The third-party web/desktop app whose ChatBox we paste into. This spec assumes nothing about its stack. |
| **Integrator** | The engineer wiring the Prompts feature into a HostApp; the audience for `140-integration-onboarding/`. |
| **InterruptionSignal** | Any DOM/state cue the HostApp shows when a previous turn must be acknowledged (e.g. "return to chat" banner). Located via Q3; pauses the queue when detected. |
| **EditorKind** | One of `textarea`, `contenteditable`, `prosemirror`, `lexical`, `monaco`, `other`. Determines which paste adapter is used (see `06-injection-contract/adapters/`). |
| **VerboseMode** | Off by default; when on, full prompt body + full DOM snapshot are recorded in logs. |
