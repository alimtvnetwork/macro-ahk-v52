# 12 — README Rules, Template & Unpacked-Load Instructions

> Mandatory README writing rules, canonical template, and unpacked-load instructions.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §29. README writing rules

Each extension's README must:
- Lead with one-line install commands (PowerShell + Bash).
- Show the unpacked-load steps verbatim.
- Link to the latest Release page.
- Never reference a specific version — use `latest` so the doc never goes stale.
- Use a hero image (`./assets/hero.png`) above the install block.


---

## §30. README template

```markdown
# <Extension Name>

> <one-sentence value prop>

![hero](./assets/hero.png)

## Install (one line)

**Windows (PowerShell):**
\`\`\`powershell
iwr -useb https://github.com/<owner>/<repo>/releases/latest/download/install.ps1 | iex
\`\`\`

**macOS / Linux (Bash):**
\`\`\`bash
curl -fsSL https://github.com/<owner>/<repo>/releases/latest/download/install.sh | bash
\`\`\`

## Manual install (unpacked)

1. Download `<slug>-<version>.zip` from the [latest release](https://github.com/<owner>/<repo>/releases/latest).
2. Unzip it.
3. Open `chrome://extensions`, enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder.

## About
…
```


---

## §31. Unpacked-load instructions (canonical)

Always include the four-step block from §30 verbatim — same wording across
every extension README so users learn the flow once.

