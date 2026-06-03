# T23 · Non-goals

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Things this spec deliberately does **not** cover. If a future task
proposes one of these, push back and link this file.

| # | Non-goal | Why excluded |
|---|---|---|
| NG1 | User auth / login for prompt sync | Out of scope; assume HostApp already authenticates the user. |
| NG2 | Multi-user prompt sharing / cloud sync | Single-user, single-device baseline. A `RemotePromptStore` is allowed as an *implementation* of `PromptStore` but not specified here. |
| NG3 | Prompt versioning UI (history, diff, rollback) | `Prompt.version` is a string field only; UI is future work. |
| NG4 | Telemetry transport (Sentry/OTLP/etc.) | `130-observability/` defines event *shape*; sending wire is integrator's choice. |
| NG5 | LLM provider abstraction | The HostApp owns its chatbot; we only paste text into its ChatBox. |
| NG6 | Authoring AI-generated prompts inside the dropdown | Create/Edit flows accept human input only. |
| NG7 | Mobile-specific gesture handling | Desktop / pointer-first; mobile is a future spec. |
| NG8 | Internationalisation of the dropdown chrome | English-only baseline; prompt **bodies** can be in any language. |
| NG9 | Rich-media prompts (images, files, audio) | Text-only `prompt.md` bodies. |
| NG10 | Recovery from HostApp DOM redesigns | Selector drift is the Integrator's responsibility, surfaced via `100-failure-handling/`. |
