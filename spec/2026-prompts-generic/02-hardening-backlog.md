# Spec-hardening backlog (post-T120)

Opened 2026-06-02 (Asia/Kuala_Lumpur). The 120-task `2026-prompts-generic`
spec is complete; this is the follow-on punch-list.

- [x] H1 — Banlist linter (`scripts/lint-spec-banlist.mjs`) — enforces T24 vocabulary ban.
- [x] H2 — Wire H1 + H6–H8 into `package.json` (`check:spec-banlist`, `check:spec-prompts-xrefs`, `spec:prompts:acceptance`, `spec:prompts:pdf`).
- [x] H3 — Top-level `spec/2026-prompts-generic/README.md` mirroring the T120 read-order.
- [ ] H4 — JSON-Schema validator for `info.json` examples (deferred — needs ajv setup).
- [ ] H5 — Mermaid render check for `*.mmd` files (deferred — needs mermaid-cli).
- [x] H6 — Combined spec bundle generator (`scripts/build-spec-prompts-pdf.mjs`) → `/mnt/documents/2026-prompts-spec.md`.
- [x] H7 — Cross-link audit (`scripts/check-spec-prompts-xrefs.mjs`).
- [x] H8 — Acceptance-bullet extractor (`scripts/extract-prompts-acceptance.mjs`) → `/mnt/documents/2026-prompts-acceptance.md`.
- [ ] H9 — Reference-snippet typecheck harness (deferred — needs isolated tsconfig).
- [ ] H10 — Port `PromptStore` + queue engine into a host wiring PoC (deferred — host TBD).
