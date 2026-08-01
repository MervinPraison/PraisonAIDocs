#!/usr/bin/env python3
"""Move docs.json into docs/ and strip docs/ path prefix for Mintlify subpath hosting."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS_JSON = ROOT / "docs" / "docs.json"
DOCS_DIR = ROOT / "docs"

NAV_KEYS = {"pages", "page", "tab", "group"}


def strip_docs_page_path(value: str) -> str:
    if value.startswith("docs/"):
        return value[5:]
    return value


def strip_internal_url(value: str) -> str:
    if not isinstance(value, str):
        return value
    if value.startswith(("http://", "https://", "mailto:")):
        return value
    while value.startswith("/docs/"):
        value = "/" + value[6:]
    return value


def transform_nav_strings(obj):
    if isinstance(obj, str):
        return strip_docs_page_path(obj)
    if isinstance(obj, list):
        return [transform_nav_strings(x) for x in obj]
    if isinstance(obj, dict):
        return {k: transform_nav_strings(v) for k, v in obj.items()}
    return obj


def transform_redirects(redirects: list) -> list:
    cleaned = []
    seen = set()
    for item in redirects:
        source = strip_internal_url(item.get("source", ""))
        destination = strip_internal_url(item.get("destination", ""))
        if source == destination:
            continue
        key = (source, destination)
        if key in seen:
            continue
        seen.add(key)
        cleaned.append({"source": source, "destination": destination})
    return cleaned


def fix_asset_path(value: str) -> str:
    return value.replace("/docs/images/", "/images/")


def migrate_docs_json() -> None:
    data = json.loads(DOCS_JSON.read_text(encoding="utf-8"))

    data = transform_nav_strings(data)

    if isinstance(data.get("favicon"), str):
        data["favicon"] = fix_asset_path(data["favicon"])

    logo = data.get("logo")
    if isinstance(logo, dict):
        for key in ("light", "dark"):
            if key in logo and isinstance(logo[key], str):
                logo[key] = fix_asset_path(logo[key])

    if isinstance(data.get("redirects"), list):
        data["redirects"] = transform_redirects(data["redirects"])

    DOCS_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def fix_mdx_content(text: str) -> str:
    """Rewrite root-relative /docs/... links outside fenced code blocks."""

    def fix_segment(segment: str) -> str:
        segment = re.sub(
            r'(href|to)=(["\'])/docs/([^"\']*)',
            lambda m: f'{m.group(1)}={m.group(2)}/{m.group(3)}',
            segment,
        )
        segment = re.sub(
            r'\]\((/docs/[^)#?]+)\)',
            lambda m: f']({strip_internal_url(m.group(1))})',
            segment,
        )
        return segment

    parts = []
    in_fence = False
    for line in text.splitlines(keepends=True):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            parts.append(line)
            continue
        if in_fence:
            parts.append(line)
        else:
            parts.append(fix_segment(line))
    return "".join(parts)


def migrate_mdx_links() -> int:
    changed = 0
    for path in DOCS_DIR.rglob("*.mdx"):
        original = path.read_text(encoding="utf-8")
        updated = fix_mdx_content(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    return changed


def main() -> int:
    root_docs_json = ROOT / "docs.json"
    if root_docs_json.exists() and not DOCS_JSON.exists():
        root_docs_json.rename(DOCS_JSON)
        print(f"Moved {root_docs_json} -> {DOCS_JSON}")
    elif not DOCS_JSON.exists():
        print("docs/docs.json not found", file=sys.stderr)
        return 1

    migrate_docs_json()
    print("Updated docs/docs.json")

    count = migrate_mdx_links()
    print(f"Updated {count} MDX files with internal link paths")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
