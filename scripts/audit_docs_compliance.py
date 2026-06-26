#!/usr/bin/env python3
"""
AGENTS.md compliance audit script for docs/features/*.mdx

Checks each feature page against the required elements from AGENTS.md:
- §8.1: sidebarTitle frontmatter field
- §1.9 rule #10 / §3.3: hero Mermaid diagram
- §4.1: <Steps> in Quick Start
- §4.1: <AccordionGroup> in Best Practices
- §4.1: <CardGroup> in Related section
- §2: Link to /docs/sdk/reference/{typescript,rust}/

Usage:
    python3 scripts/audit_docs_compliance.py
    python3 scripts/audit_docs_compliance.py --output docs/features/_compliance-audit.md
"""

import os
import re
import sys
import argparse
from pathlib import Path


FEATURES_DIR = Path(__file__).parent.parent / "docs" / "features"

CHECKS = {
    "sidebarTitle": lambda c: bool(re.search(r"sidebarTitle:", c)),
    "mermaid": lambda c: "```mermaid" in c,
    "Steps": lambda c: "<Steps>" in c,
    "AccordionGroup": lambda c: "<AccordionGroup>" in c,
    "CardGroup": lambda c: "<CardGroup" in c,
    "sdk_reference": lambda c: bool(
        re.search(r"/docs/sdk/reference/(typescript|rust)/", c)
    ),
}

CHECK_LABELS = {
    "sidebarTitle": "sidebarTitle frontmatter (§8.1)",
    "mermaid": "Hero Mermaid diagram (§3.3 / rule #10)",
    "Steps": "<Steps> Quick Start (§4.1)",
    "AccordionGroup": "<AccordionGroup> Best Practices (§4.1)",
    "CardGroup": "<CardGroup> Related (§4.1)",
    "sdk_reference": "SDK reference link (§2)",
}


def audit(features_dir: Path):
    results = {}
    files = sorted(f for f in features_dir.iterdir() if f.suffix == ".mdx")
    for mdx_file in files:
        content = mdx_file.read_text(encoding="utf-8")
        file_results = {
            check: fn(content) for check, fn in CHECKS.items()
        }
        results[mdx_file.name] = file_results
    return results


def summarize(results):
    totals = {check: 0 for check in CHECKS}
    total_files = len(results)
    for file_results in results.values():
        for check, passed in file_results.items():
            if not passed:
                totals[check] += 1
    return totals, total_files


def render_markdown(results, totals, total_files):
    lines = [
        "# docs/features Compliance Audit",
        "",
        f"**Total pages:** {total_files}",
        "",
        "## Summary",
        "",
        "| Requirement | Source | Missing | % |",
        "|-------------|--------|---------|---|",
    ]
    for check, label in CHECK_LABELS.items():
        count = totals[check]
        pct = round(count / total_files * 100, 1) if total_files else 0
        lines.append(f"| {label} | | **{count}** | {pct}% |")

    lines += ["", "## Missing Elements by File", ""]

    for check, label in CHECK_LABELS.items():
        missing_files = [f for f, r in results.items() if not r[check]]
        if not missing_files:
            continue
        lines += [f"### Missing: {label}", "", f"**{len(missing_files)} files:**", ""]
        for f in missing_files:
            lines.append(f"- `docs/features/{f}`")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Audit docs/features compliance")
    parser.add_argument("--output", "-o", help="Write report to file")
    parser.add_argument(
        "--features-dir",
        default=str(FEATURES_DIR),
        help="Path to docs/features directory",
    )
    args = parser.parse_args()

    features_dir = Path(args.features_dir)
    if not features_dir.exists():
        print(f"Error: directory not found: {features_dir}", file=sys.stderr)
        sys.exit(1)

    results = audit(features_dir)
    totals, total_files = summarize(results)
    report = render_markdown(results, totals, total_files)

    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
        print(f"Report written to: {args.output}")
    else:
        print(report)


if __name__ == "__main__":
    main()
