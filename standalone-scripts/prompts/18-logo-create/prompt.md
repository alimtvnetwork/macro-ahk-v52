# Logo Creation Instruction

Create a logo from the inputs below. Save all generated assets into the project file system so the protocol is repeatable.

## Inputs

1. `ProductName`
2. `ProductIdea` — short product idea, voice, tone
3. `SampleColors[]` — sample color(s) or palette hint
4. `NeedsDarkWhiteVariants` — optional boolean, default ON

## Folder Structure

```
/ (repo root)
└── Projects/
    └── {Seq}-{PascalCaseProductName}/
        ├── README.md
        ├── icons-svg/        (Logo.svg, Logo-Dark.svg, Logo-White.svg)
        ├── icons-image/      (Logo-052/128/256/512.png, Logo-1024-Light.png, Logo-1024-Dark.png)
        └── colors-themes/    (Palette.md, Tokens.json — flat PascalCase keys)

(repo root)
├── favicon.ico
└── favicon.png
```

## Actionable Items

1. Project scaffold under `Projects/{Seq}-{PascalCaseProductName}/` — zero-padded sequence (`01`, `02`, …), never overwrite an existing folder.
2. Generate `Logo.svg`; if `NeedsDarkWhiteVariants` is ON (default), also generate `Logo-Dark.svg` and `Logo-White.svg`.
3. Generate raster samples: 52 / 128 / 256 / 512 px icons + 1024 px light & dark mockups in `icons-image/`.
4. Generate `colors-themes/Palette.md` (HEX + HSL swatches) and `Tokens.json` (flat PascalCase keys: `Primary`, `PrimaryGlow`, `Background`, `Foreground`, `Accent`).
5. Generate `favicon.ico` + `favicon.png` at repo root and update `index.html` `<link rel="icon">`.
6. Write project `README.md` embedding every asset with relative paths so GitHub renders inline (sections: Overview, Logo Variants, Image Samples, Color Palette, Theme Tokens, Favicon, Usage).

## Important

1. PascalCase for all folder names, file names where reasonable, and JSON keys/values.
2. Sequence numbers are zero-padded (`01`, `02`, …).
3. Favicon always lives at repo root and is regenerated per project.
4. Never overwrite an existing project folder — always create the next sequence.
5. Dark + white variants default to ON unless the user opts out.
6. Read `.lovable/coding-guidelines.md` before any implementation work.

## Finalize

All animations and designs in one shot as much as possible. If anything is ambiguous, ask before generating.

*Prompt v1.0. Trigger phrases: `create logo`, `make logo`, `logo`, `create icon`.*
