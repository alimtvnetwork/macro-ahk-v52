#!/usr/bin/env python3
"""Blind-AI audit heuristic scanner.

For each .md file under a folder, compute a score (0-100) over 5 dims:
  clarity(25), determinism(25), acceptance(20), cross_refs(15), pitfalls(15)

Heuristics (transparent, not perfect — flagged in report):
  clarity:    >=200 words +15, has H1 +5, has H2 sections >=3 +5
  determinism: contains MUST/SHALL/MUST NOT/exactly/at least N +15;
              contains numeric constants (\\d+\\s*(ms|s|min|MB|chars|items|%)) +10
  acceptance: contains 'Acceptance' or 'AC-' or '- [ ]' or 'pass when' +20
              (partial 10 if only 'should')
  cross_refs: all relative .md links resolve +15; -5 per dangling (min 0)
  pitfalls:   has 'Pitfall'|'Counter-example'|'Anti-pattern'|'Edge case' +15

Outputs JSON of per-file rows.
"""
import argparse, json, re, sys
from pathlib import Path

LINK_RE = re.compile(r'\[[^\]]+\]\(([^)\s#]+)(?:#[^)]*)?\)')
FENCE_RE = re.compile(r'```[\s\S]*?```')
INLINE_CODE_RE = re.compile(r'`[^`\n]*`')
NUM_RE = re.compile(r'\b\d+\s*(ms|s|sec|min|MB|KB|chars|items|%|px)\b', re.I)
MUST_RE = re.compile(r'\b(MUST|SHALL|MUST NOT|SHALL NOT|exactly|at least|at most)\b')
ACC_RE = re.compile(r'(Acceptance|AC-\d|pass when|\- \[ \]|\- \[x\])', re.I)
PIT_RE = re.compile(r'(Pitfall|Counter-example|Anti-pattern|Edge case|Gotcha)', re.I)
ACCEPTANCE_EXEMPT_RE = re.compile(r'(^|/)(README|00-overview|00-method|GLOSSARY|ACCEPTANCE-MATRIX|IMPLEMENTATION-CHECKLIST|BLIND-AI-SMOKE-TEST)\.md$', re.I)

def score_file(p: Path, root: Path):
    txt = p.read_text(encoding='utf-8', errors='replace')
    scan_txt = strip_code(txt)
    words = len(txt.split())
    h1 = bool(re.search(r'^# ', txt, re.M))
    h2_count = len(re.findall(r'^## ', txt, re.M))

    clarity = (15 if words >= 200 else (8 if words >= 80 else 2)) \
              + (5 if h1 else 0) + (5 if h2_count >= 3 else (2 if h2_count >= 1 else 0))
    clarity = min(25, clarity)

    must_hits = len(MUST_RE.findall(txt))
    num_hits = len(NUM_RE.findall(txt))
    determinism = (15 if must_hits >= 3 else (8 if must_hits >= 1 else 0)) \
                  + (10 if num_hits >= 2 else (5 if num_hits >= 1 else 0))
    determinism = min(25, determinism)

    rel_path = str(p.relative_to(root))
    if ACCEPTANCE_EXEMPT_RE.search(rel_path):
        acceptance = 20
    elif ACC_RE.search(txt):
        acceptance = 20
    elif re.search(r'\bshould\b', txt, re.I):
        acceptance = 10
    else:
        acceptance = 0

    # cross-refs
    links = LINK_RE.findall(scan_txt)
    dangling = []
    for href in links:
        if href.startswith(('http://', 'https://', 'mailto:', 'mem://', '#')):
            continue
        target = (p.parent / href).resolve()
        if not target.exists():
            dangling.append(href)
    if not links:
        cross = 10  # neutral
    else:
        cross = max(0, 15 - 3 * len(dangling))

    pitfalls = 15 if PIT_RE.search(txt) else 0

    total = clarity + determinism + acceptance + cross + pitfalls
    impl = total  # use score as implementable %
    fail = 100 - impl

    top_blocker = []
    if acceptance == 0: top_blocker.append('no acceptance criteria')
    if determinism < 10: top_blocker.append('vague (no MUST/numerics)')
    if dangling: top_blocker.append(f'{len(dangling)} dangling link(s)')
    if pitfalls == 0: top_blocker.append('no pitfalls/edge cases')
    if words < 80: top_blocker.append('too thin (<80 words)')

    return {
        'path': rel_path,
        'words': words,
        'score': total,
        'impl_pct': impl,
        'fail_pct': fail,
        'clarity': clarity,
        'determinism': determinism,
        'acceptance': acceptance,
        'cross_refs': cross,
        'pitfalls': pitfalls,
        'dangling': dangling,
        'top_blocker': '; '.join(top_blocker) or 'OK',
    }

def strip_code(txt: str) -> str:
    without_fences = FENCE_RE.sub('', txt)
    return INLINE_CODE_RE.sub('', without_fences)

def main():
    args = parse_args()
    folder = Path(args.folder)
    root = resolve_spec_root(folder)
    rows = []
    for p in sorted(folder.rglob('*.md')):
        rows.append(score_file(p, root))
    output = json.dumps(rows, indent=2)
    if args.output:
        Path(args.output).write_text(output + '\n', encoding='utf-8')
        return

    print(output)

def parse_args():
    parser = argparse.ArgumentParser(description='Score blind-AI implementability for markdown specs.')
    parser.add_argument('folder')
    parser.add_argument('--output')

    return parser.parse_args()

def resolve_spec_root(folder: Path) -> Path:
    resolved = folder.resolve()
    candidates = [resolved, *resolved.parents]
    for candidate in candidates:
        if candidate.name == '2026-spec':
            return candidate

    return Path('spec/2026-spec')

if __name__ == '__main__':
    main()
