#!/usr/bin/env python3
"""Sync SDK reference navigation in docs/docs.json from on-disk MDX files.

The auto-generator in PraisonAI-tools writes MDX under docs/sdk/reference/
but may fail to update docs.json when the Mintlify config lives at
docs/docs.json. Run this after auto-gen pushes, or from CI, to keep nav
consistent with disk.

Usage (repo root):

    python3 scripts/sync_sdk_reference_nav.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DOCS_JSON = DOCS / "docs.json"
REF = DOCS / "sdk" / "reference"

KINDS = (
    ("modules", "Modules", "box"),
    ("classes", "Classes", "brackets-curly"),
    ("functions", "Functions", "function"),
)


def disk_ref_pages(package: str) -> dict[str, list[str]]:
    """Return sorted nav stems for each SDK reference kind on disk."""
    out: dict[str, list[str]] = {kind: [] for kind, _, _ in KINDS}
    base = REF / package
    if not base.is_dir():
        return out
    for kind, _, _ in KINDS:
        kind_dir = base / kind
        if not kind_dir.is_dir():
            continue
        out[kind] = sorted(
            p.relative_to(DOCS).with_suffix("").as_posix()
            for p in kind_dir.glob("*.mdx")
        )
    return out


def build_package_pages(pages: dict[str, list[str]]) -> list:
    """Build granular Mintlify nav groups for one SDK package."""
    groups = []
    for kind, label, icon in KINDS:
        stems = pages.get(kind) or []
        if stems:
            groups.append({"group": label, "icon": icon, "pages": stems})
    return groups


def main() -> int:
    if not DOCS_JSON.exists():
        print(f"docs.json not found: {DOCS_JSON}", file=sys.stderr)
        return 1

    data = json.loads(DOCS_JSON.read_text(encoding="utf-8"))
    navigation = data.get("navigation", {})
    tabs = navigation.get("tabs", [])

    sdk_tab = next((t for t in tabs if t.get("tab") == "SDK"), None)
    if not sdk_tab:
        print("SDK tab not found in docs.json", file=sys.stderr)
        return 1

    ref_group = next(
        (g for g in sdk_tab.get("groups", []) if isinstance(g, dict) and g.get("group") == "Reference"),
        None,
    )
    if not ref_group:
        print("Reference group not found under SDK tab", file=sys.stderr)
        return 1

    updated = 0
    for package_group in ref_group.get("pages", []):
        if not isinstance(package_group, dict):
            continue
        package = package_group.get("group")
        if not package or not (REF / package).is_dir():
            continue
        new_pages = build_package_pages(disk_ref_pages(package))
        if package_group.get("pages") != new_pages:
            package_group["pages"] = new_pages
            updated += 1
            print(f"Synced {package}: {sum(len(g['pages']) for g in new_pages)} pages")

    if updated:
        DOCS_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        print(f"Updated docs.json ({updated} package(s))")
    else:
        print("docs.json already in sync with disk")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
