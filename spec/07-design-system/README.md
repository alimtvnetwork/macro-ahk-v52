# Design System

## Overview

Visual design system spec: principles (`01`), theme variable architecture (`02`), typography (`03`), spacing/layout (`04`), borders/shapes (`05`), motion/transitions (`06`), and code-block styling (`07`). Theme variables follow HSL semantic tokens; motion uses Tailwind + standard CSS keyframes only (zero external animation libraries — see `mem://style/animation-strategy` and `mem://preferences/dark-only-theme`).

Hard ban: no light mode, no theme toggle, no `framer-motion`/`gsap` (enforced by `scripts/check-forbidden-anim-libs.mjs`).

## Files
- [`00-overview.md`](./00-overview.md)
- [`01-design-principles.md`](./01-design-principles.md)
- [`02-theme-variable-architecture.md`](./02-theme-variable-architecture.md)
- [`03-typography.md`](./03-typography.md)
- [`04-spacing-layout.md`](./04-spacing-layout.md)
- [`05-borders-shapes.md`](./05-borders-shapes.md)
- [`06-motion-transitions.md`](./06-motion-transitions.md)
- [`07-code-blocks.md`](./07-code-blocks.md)
