#!/usr/bin/env python3
"""Add canonical hero classDef pair to docs/features/**/*.mdx first 100 lines."""
from __future__ import annotations

import re
import sys
from pathlib import Path

AGENT = "classDef agent fill:#8B0000,color:#fff"
TOOL = "classDef tool fill:#189AB4,color:#fff"
HERO_CLASSDEFS = f"\n    {AGENT}\n    {TOOL}\n"

MINIMAL_HERO = """
```mermaid
graph LR
    U[Input] --> A[Agent]
    A --> O[Output]

    classDef agent fill:#8B0000,color:#fff
    classDef tool fill:#189AB4,color:#fff

    class A agent
    class U,O tool
```
""".strip()


def first100(text: str) -> str:
    return "\n".join(text.split("\n")[:100])


def has_canonical_pair(text: str) -> bool:
    head = first100(text)
    return AGENT in head and TOOL in head


def find_first_mermaid_end(lines: list[str], max_line: int = 100) -> int | None:
    """Return line index of closing ``` for first mermaid block starting before max_line."""
    in_mermaid = False
    for i, line in enumerate(lines):
        if i >= max_line and not in_mermaid:
            break
        if line.strip() == "```mermaid":
            in_mermaid = True
            continue
        if in_mermaid and line.strip() == "```":
            return i
    return None


def find_mermaid_start(lines: list[str], max_line: int = 100) -> bool:
    for i, line in enumerate(lines):
        if i >= max_line:
            break
        if line.strip() == "```mermaid":
            return True
    return False


def insert_hero_classdefs(content: str) -> str:
    if has_canonical_pair(content):
        return content

    lines = content.split("\n")

    if find_mermaid_start(lines):
        end_idx = find_first_mermaid_end(lines)
        if end_idx is not None:
            block = "\n".join(lines[: end_idx + 1])
            if AGENT not in block or TOOL not in block:
                lines.insert(end_idx, f"    {AGENT}")
                lines.insert(end_idx + 1, f"    {TOOL}")
            return "\n".join(lines)

    # No mermaid in first 100 lines — insert minimal hero after intro
    insert_at = 0
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                insert_at = i + 1
                break

    # Skip blank lines, then optional intro paragraph
    while insert_at < len(lines) and not lines[insert_at].strip():
        insert_at += 1
    if insert_at < len(lines) and not lines[insert_at].startswith(("#", "<", "!", "`")):
        insert_at += 1
        while insert_at < len(lines) and lines[insert_at].strip() and not lines[insert_at].startswith(
            ("#", "<", "!", "`")
        ):
            insert_at += 1

    hero_lines = ["", MINIMAL_HERO, ""]
    new_lines = lines[:insert_at] + hero_lines + lines[insert_at:]
    return "\n".join(new_lines)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    features = root / "docs" / "features"
    skip_prefixes = ("concepts/",)

    files = sorted(features.rglob("*.mdx"))
    changed: list[str] = []

    for path in files:
        rel = path.relative_to(features).as_posix()
        if any(rel.startswith(p) for p in skip_prefixes):
            continue
        text = path.read_text(encoding="utf-8")
        if has_canonical_pair(text):
            continue
        new_text = insert_hero_classdefs(text)
        if new_text != text:
            path.write_text(new_text, encoding="utf-8")
            changed.append(rel)

    print(f"Fixed {len(changed)} files")
    for f in changed:
        print(f"  {f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
