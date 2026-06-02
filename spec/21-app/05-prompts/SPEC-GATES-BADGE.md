# Spec-Gates Badge — README snippet

Status: Reference · v1.0.0 · 2026-06-02

Paste the following badge row near the top of root `README.md` (or
`spec/21-app/05-prompts/README.md`). Replace `<owner>/<repo>` with the
actual GitHub slug at integration time.

```md
[![spec-gates](https://github.com/<owner>/<repo>/actions/workflows/spec-gates.yml/badge.svg?branch=main)](https://github.com/<owner>/<repo>/actions/workflows/spec-gates.yml)
[![governance](https://github.com/<owner>/<repo>/actions/workflows/spec-governance-quarterly.yml/badge.svg)](https://github.com/<owner>/<repo>/actions/workflows/spec-governance-quarterly.yml)
```

## Rules
- Follow root-readme authoring order (mem://workflow/root-readme-authoring-order):
  Title → badges → hero image → Install → About.
- Place badges immediately after the H1 title, before the hero image.
- Do NOT add badges to `readme.txt` (SP-1..SP-7 ban time/clock/auto-update values).
- Badges are decorative; never gate releases on badge color (gate on CI status).

## Local preview
```bash
curl -sI "https://github.com/<owner>/<repo>/actions/workflows/spec-gates.yml/badge.svg" \
  | head -1
```
Expect `HTTP/2 200`.
