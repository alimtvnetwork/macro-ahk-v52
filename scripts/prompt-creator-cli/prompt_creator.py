#!/usr/bin/env python3
"""
prompt-creator-cli
==================

Create a new prompt entry under ``standalone-scripts/prompts/`` and run the
aggregator so the extension picks it up immediately.

Usage
-----

    # From a markdown file
    python scripts/prompt-creator-cli/prompt_creator.py --file my-prompt.md \
        --title "My Prompt" --slug my-prompt

    # Interactive (paste markdown, end with a blank line then Ctrl-D, or two
    # consecutive blank lines):
    python scripts/prompt-creator-cli/prompt_creator.py --title "My Prompt"

Flags
-----
    --file, -f      Path to a markdown file. If omitted, read stdin.
    --title, -t     Human-readable title (also used to derive slug).
    --slug,  -s     Kebab-case slug. Derived from title if omitted.
    --category, -c  Category (default: "general").
    --author, -a    Author (default: "marco").
    --version, -v   SemVer (default: "1.0.0").
    --no-aggregate  Skip running aggregate-prompts.mjs after writing.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

def _base_dir() -> Path:
    """Anchor for searches.
    - Frozen (PyInstaller .exe): directory containing the executable.
    - Source run: CWD.
    Using the EXE directory (not CWD) keeps behaviour predictable when users
    launch the binary from arbitrary PowerShell sessions."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path.cwd().resolve()


def _find_root() -> Path:
    """Walk up from the base dir looking for standalone-scripts/prompts.
    Fallback: the base dir itself (prompts dir will be created there)."""
    base = _base_dir()
    for candidate in [base, *base.parents]:
        if (candidate / "standalone-scripts" / "prompts").is_dir():
            return candidate
    return base


ROOT = _find_root()
PROMPTS_DIR = ROOT / "standalone-scripts" / "prompts"
AGGREGATE_SCRIPT = ROOT / "scripts" / "aggregate-prompts.mjs"
PROMPTS_DIR.mkdir(parents=True, exist_ok=True)

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return re.sub(r"-+", "-", s) or "prompt"


def read_stdin_markdown() -> str:
    print(
        "Paste your markdown. End with Ctrl-D (Unix) / Ctrl-Z+Enter (Windows),\n"
        "or two consecutive blank lines.\n",
        file=sys.stderr,
    )
    lines: list[str] = []
    blank_streak = 0
    try:
        for raw in sys.stdin:
            line = raw.rstrip("\n")
            if line == "":
                blank_streak += 1
                if blank_streak >= 2:
                    break
            else:
                blank_streak = 0
            lines.append(line)
    except KeyboardInterrupt:
        sys.exit("Aborted.")
    # Drop trailing blank sentinels
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines).strip() + "\n"


def next_sequence() -> int:
    nums = []
    for entry in PROMPTS_DIR.iterdir():
        if not entry.is_dir():
            continue
        m = re.match(r"^(\d+)-", entry.name)
        if m:
            nums.append(int(m.group(1)))
    return (max(nums) + 1) if nums else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Create a new prompt entry.")
    ap.add_argument("--file", "-f", type=Path)
    ap.add_argument("--title", "-t")
    ap.add_argument("--slug", "-s")
    ap.add_argument("--category", "-c", default="general")
    ap.add_argument("--author", "-a", default="marco")
    ap.add_argument("--version", "-v", default="1.0.0")
    ap.add_argument("--no-aggregate", action="store_true")
    args = ap.parse_args()

    # 1. Get markdown body
    if args.file:
        if not args.file.exists():
            sys.exit(f"File not found: {args.file}")
        body = args.file.read_text(encoding="utf-8").strip() + "\n"
    else:
        body = read_stdin_markdown()
    if not body.strip():
        sys.exit("Empty markdown body — aborting.")

    # 2. Title and slug
    title = args.title
    if not title:
        # Try first markdown heading
        m = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
        title = m.group(1).strip() if m else input("Title: ").strip()
    if not title:
        sys.exit("Title is required.")

    slug = args.slug or slugify(title)
    if not SLUG_RE.match(slug):
        sys.exit(f"Invalid slug '{slug}'. Must be kebab-case, e.g. my-prompt.")

    # 3. Reject duplicates
    for entry in PROMPTS_DIR.iterdir():
        if entry.is_dir() and entry.name.split("-", 1)[-1] == slug:
            sys.exit(f"Slug already exists: {entry.name}")

    seq = next_sequence()
    folder_name = f"{seq:02d}-{slug}"
    target = PROMPTS_DIR / folder_name
    target.mkdir(parents=True, exist_ok=False)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    info = {
        "Id": f"prompt-{slug}",
        "Title": title,
        "Slug": slug,
        "Version": args.version,
        "Author": args.author,
        "Categories": [args.category],
        "IsDefault": False,
        "Order": seq,
        "CreatedAt": now,
        "UpdatedAt": now,
    }
    (target / "info.json").write_text(
        json.dumps(info, indent=2) + "\n", encoding="utf-8"
    )
    (target / "prompt.md").write_text(body, encoding="utf-8")
    print(f"[OK] Created {target.relative_to(ROOT)}")

    # 4. Run aggregator so the bundled JSON picks it up
    if not args.no_aggregate:
        if not AGGREGATE_SCRIPT.exists():
            print(f"[WARN] Aggregator missing at {AGGREGATE_SCRIPT}", file=sys.stderr)
        else:
            try:
                subprocess.run(
                    ["node", str(AGGREGATE_SCRIPT)], cwd=ROOT, check=True
                )
            except subprocess.CalledProcessError as e:
                sys.exit(f"Aggregator failed: {e}")

    print("[DONE] Reload the extension to see the new prompt.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
