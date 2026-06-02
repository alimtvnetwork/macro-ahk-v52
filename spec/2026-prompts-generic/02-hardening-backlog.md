# Spec-hardening backlog (post-T120)

Opened 2026-06-02 (Asia/Kuala_Lumpur). The 120-task `2026-prompts-generic`
spec is complete; this is the follow-on punch-list.

- [x] H1 — Banlist linter (`scripts/lint-spec-banlist.mjs`) — enforces T24 vocabulary ban.
- [x] H2 — Wire H1 + H6–H8 into `package.json` (`check:spec-banlist`, `check:spec-prompts-xrefs`, `spec:prompts:acceptance`, `spec:prompts:pdf`).
- [x] H3 — Top-level `spec/2026-prompts-generic/README.md` mirroring the T120 read-order.
- [x] H4 — JSON-Schema validator for `info.json` examples (`scripts/check-prompts-info-json.mjs`, zero-dep).
- [x] H5 — Mermaid lint (`scripts/lint-spec-mermaid.mjs`, zero-dep: directive + bracket balance + tab check).
- [x] H6 — Combined spec bundle generator (`scripts/build-spec-prompts-pdf.mjs`) → `/mnt/documents/2026-prompts-spec.md`.
- [x] H7 — Cross-link audit (`scripts/check-spec-prompts-xrefs.mjs`).
- [x] H8 — Acceptance-bullet extractor (`scripts/extract-prompts-acceptance.mjs`) → `/mnt/documents/2026-prompts-acceptance.md`.
- [x] H9 — Reference-snippet typecheck harness (`scripts/typecheck-spec-snippets.mjs`, extracts `\`\`\`ts` blocks + shimmed tsc --noEmit).
- [x] H10 — Vanilla-HTML host-wiring PoC (`poc/2026-prompts-generic/index.html`) — wires snippets 01/02/03/05 + in-memory QueueStore against a mock chat host.
