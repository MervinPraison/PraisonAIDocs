#!/usr/bin/env python3
"""Navigation consistency guard for docs/docs.json.

Fails (exit 1) when any of the following drift conditions are found:

1. A nav entry points at a page with no matching ``.mdx``/``.md`` file.
2. The same page string appears more than once anywhere in ``docs.json``
   (both same-group and cross-tab duplicates).
3. A page file on disk is not referenced by the nav and is not covered by
   the allowlist (working notes, snippets, images, etc.).

Run from the repository root::

    python3 scripts/check_nav.py

Cross-platform, stdlib-only.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DOCS_JSON = DOCS / "docs.json"

# Page stems (relative to docs/, without extension) that are allowed to exist
# on disk without a nav entry. Keep this list tight.
ALLOWLIST_PREFIXES = (
    "snippets/",
    "images/",
)
ALLOWLIST_EXACT = {
    "index",       # landing / redirect targets
    "home",
    "to-site",
    "features/DOCS_PARITY",
    "js/DOCS_PARITY",
    "rust/DOCS_PARITY",
}

# Directories under docs/ that must never be scanned (not routable pages).
SKIP_DIR_NAMES = {"node_modules"}


def iter_page_refs(node):
    """Yield every page string reference found in the navigation tree."""
    if isinstance(node, dict):
        for key in ("tabs", "groups", "pages"):
            if key in node:
                yield from iter_page_refs(node[key])
    elif isinstance(node, list):
        for item in node:
            if isinstance(item, str):
                yield item
            else:
                yield from iter_page_refs(item)


def disk_pages() -> set[str]:
    """Return every page stem under docs/ in navigation route format.

    Stems are relative to ``docs/``, extensionless, and always
    forward-slash separated (``as_posix``) so comparisons against
    ``docs.json`` routes behave identically on Windows.
    """
    pages: set[str] = set()
    for pattern in ("*.mdx", "*.md"):
        for path in DOCS.rglob(pattern):
            if SKIP_DIR_NAMES.intersection(path.relative_to(DOCS).parts):
                continue
            pages.add(path.relative_to(DOCS).with_suffix("").as_posix())
    return pages


def allowed(stem: str) -> bool:
    """Return True when a page stem may exist on disk without a nav entry."""
    if stem in ALLOWLIST_EXACT:
        return True
    return any(stem.startswith(p) for p in ALLOWLIST_PREFIXES)


def main() -> int:
    """Run all drift checks; return 0 when consistent, 1 with a report otherwise."""
    data = json.loads(DOCS_JSON.read_text(encoding="utf-8"))
    refs = list(iter_page_refs(data["navigation"]))
    disk = disk_pages()

    errors: list[str] = []

    # 1. broken references
    missing = sorted({r for r in refs if r not in disk})
    for m in missing:
        errors.append(f"[broken-ref] nav entry has no page file: {m}")

    # 2. duplicate page strings
    seen: dict[str, int] = {}
    for r in refs:
        seen[r] = seen.get(r, 0) + 1
    for page, count in sorted(seen.items()):
        if count > 1:
            errors.append(f"[duplicate] page appears {count}x in nav: {page}")

    # 3. orphan pages on disk
    nav_set = set(refs)
    for stem in sorted(disk - nav_set):
        if not allowed(stem):
            errors.append(f"[orphan] page on disk not in nav: {stem}")

    if errors:
        print("Navigation consistency check FAILED:\n", file=sys.stderr)
        for e in errors:
            print("  " + e, file=sys.stderr)
        print(f"\n{len(errors)} problem(s) found.", file=sys.stderr)
        return 1

    print(
        f"Navigation consistency check passed: "
        f"{len(refs)} nav refs, {len(disk)} disk pages, 0 problems."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
