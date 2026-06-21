---
title: Lowercase Readme And Sequence Slugs
slug: lowercase-readme-and-sequence
---

# Repo File Naming Convention

Enforce these naming rules across the entire repository:

1. **All README files must be lowercase**: rename every `README.md`, `Readme.md`, `ReadMe.md`, etc. to `readme.md`. Apply recursively at every depth (root, subfolders, packages, specs, prompts, scripts — everywhere). Update every internal link and import reference to match.

2. **Sequence-prefixed markdown files must use `xx-lower-case.md` slug form**: any markdown file that begins with a numeric sequence prefix must follow the pattern `NN-kebab-lower-case.md` where:

   - `NN` is a two-digit zero-padded number (`01`, `02`, ..., `99`)

   - The remainder is all lowercase, words separated by single hyphens (`-`)

   - No spaces, no underscores, no PascalCase or camelCase, no uppercase letters

   - The `.md` extension is lowercase

   Examples:

   - ✅ `01-overview.md`, `02-coding-guidelines.md`, `13-cicd-pipeline.md`

   - ❌ `1-Overview.md`, `01_Coding_Guidelines.md`, `13-CICD-Pipeline.MD`

## Execution Steps

1. Scan the whole repo for non-conforming filenames (case-insensitive `readme` not equal to `readme.md`, and any `^\d+[-_ ]` markdown file not matching `^\d{2}-[a-z0-9]+(-[a-z0-9]+)*\.md$`).

2. Rename each offending file using `git mv` (preserve history).

3. Update every reference: markdown links, code imports, doc indexes, sidebars, and `.lovable/memory/index.md`.

4. Verify with a final scan — fail loudly if any non-conforming file remains.

5. Run the build and link checker; fix any broken references.

## Important

- Do not skip nested folders.

- Do not leave both `README.md` and `readme.md` (case-only renames on case-insensitive filesystems require a two-step `git mv`).

- Bump the minor version of the codebase after this change, per repo convention.

---

*This prompt is version 1.0.*
