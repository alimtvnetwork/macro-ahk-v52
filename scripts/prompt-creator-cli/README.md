# prompt-creator-cli

A small Python CLI to add a new prompt to `standalone-scripts/prompts/` and
regenerate the bundled `chrome-extension/prompts/macro-prompts.json` in one
step.

## Usage

From a file:

```bash
python scripts/prompt-creator-cli/prompt_creator.py \
    --file ./my-prompt.md \
    --title "My Prompt" \
    --slug my-prompt
```

Interactive (paste markdown, then either press `Ctrl-D` (Unix) /
`Ctrl-Z` + Enter (Windows), or hit Enter on two consecutive blank lines):

```bash
python scripts/prompt-creator-cli/prompt_creator.py --title "My Prompt"
```

### Flags

| Flag | Description | Default |
| --- | --- | --- |
| `--file`, `-f` | Markdown source file | stdin |
| `--title`, `-t` | Display title (also derives slug) | first `# heading` or prompt |
| `--slug`, `-s` | kebab-case slug | derived from title |
| `--category`, `-c` | Category | `general` |
| `--author`, `-a` | Author | `marco` |
| `--version`, `-v` | SemVer | `1.0.0` |
| `--no-aggregate` | Skip running the aggregator afterwards | off |

## What it does

1. Picks the next numeric prefix (e.g. `24-`) under
   `standalone-scripts/prompts/`.
2. Creates the folder `NN-<slug>/` with:
   - `info.json` (PascalCase keys matching the project contract)
   - `prompt.md` (your markdown body)
3. Runs `node scripts/aggregate-prompts.mjs` so the extension's
   `chrome-extension/prompts/macro-prompts.json` is updated immediately.

After that, reload the extension (and click "Reload prompts" in the UI) to
pick up the new entry.
