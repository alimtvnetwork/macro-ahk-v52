# T31 · On-disk folder layout

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

When a `PromptStore` is backed by a file system (the canonical
distribution format and the shape used by the reference corpus at
`standalone-scripts/prompts/`), each prompt lives in its **own folder**.

## Layout

```
<root>/
  01-<slug>/
    info.json
    prompt.md
  02-<slug>/
    info.json
    prompt.md
  …
```

## Rules

1. **One folder per prompt.** Never share a folder between two prompts.
2. **Folder name format:** `^(\d{2,3})-(<slug>)$`
   - `\d{2,3}` is a 2- or 3-digit ordering prefix used **only** for
     human readability when browsing the directory. It MUST equal
     `info.json → order` zero-padded to at least 2 digits.
   - `<slug>` matches the slug regex from `20-data-model/04-id-and-slug-rules.md`.
3. **Required files** inside each folder: `info.json` (see T32) and
   `prompt.md` (see T33). Any other file is allowed for the integrator's
   use and MUST be ignored by the loader.
4. **Encoding:** UTF-8, LF line endings, no BOM.
5. **Sort order at load time** is `order` then `slug`. The folder
   prefix is advisory, not authoritative.
6. **Discovery:** the loader walks one level deep only — nested
   `<root>/foo/bar/01-x/` is NOT considered a prompt.

## Reference corpus

The folder `standalone-scripts/prompts/` in this repo is treated as a
**read-only reference** that demonstrates this layout end-to-end. Do
not copy it into the spec; cite it by path only.
