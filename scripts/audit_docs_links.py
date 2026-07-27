#!/usr/bin/env python3
"""Fast docs audit: live 404 checks + local internal link validation.

Cross-platform: live HTTP checks use ``curl`` when available on PATH
(via ``shutil.which``) and fall back to the stdlib :mod:`urllib.request`
otherwise, so the audit works identically on Windows, macOS, and Linux.
A transport failure (no HTTP response) is reported with the sentinel
status ``-1`` to keep it distinguishable from a genuine HTTP error code.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen, Request

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://praison.ai"
DOCS = f"{BASE}/docs"
WORKERS = 32
TIMEOUT = 12
OK_STATUSES = {200, 301, 302, 307, 308}
TRANSPORT_ERROR = -1
USER_AGENT = "PraisonAIDocs-Audit/1.0"
_CURL = shutil.which("curl")

MDX_TAG_RE = re.compile(
    r"</?(Steps|Step|Card|CardGroup|Accordion|AccordionGroup|Tabs|Tab)\b[^>]*?/?>"
)
LINK_RE = re.compile(
    r'(?:href|to)=["\'](/docs[^"\'#?]+)["\']|'
    r'\[[^\]]+\]\((/docs[^)#?]+)\)'
)
FENCE_RE = re.compile(r"^```.*$", re.MULTILINE)
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")


def _curl_head(url: str, curl: str) -> int | None:
    """Return HTTP status via curl, or None if curl produced no usable code."""
    null_dev = "NUL" if os.name == "nt" else "/dev/null"
    try:
        out = subprocess.run(
            [curl, "-s", "-L", "-o", null_dev, "-w", "%{http_code}",
             "--max-time", str(TIMEOUT), "-H", "Cache-Control: no-cache", url],
            capture_output=True, text=True, check=False,
        )
        code = out.stdout.strip()
        if code.isdigit():
            return int(code)
    except Exception:
        pass
    return None


def _urllib_head(url: str) -> int:
    """Return HTTP status via stdlib urllib, or TRANSPORT_ERROR on failure."""
    headers = {
        "Cache-Control": "no-cache",
        "User-Agent": USER_AGENT,
    }
    for method in ("HEAD", "GET"):
        try:
            req = Request(url, method=method, headers=headers)
            with urlopen(req, timeout=TIMEOUT) as resp:
                return getattr(resp, "status", None) or resp.getcode()
        except HTTPError as exc:
            if method == "HEAD" and exc.code in {405, 501}:
                continue
            return exc.code
        except (URLError, OSError, ValueError):
            return TRANSPORT_ERROR
    return TRANSPORT_ERROR


def http_head(url: str) -> int:
    """Return HTTP status for *url*, portable across all platforms.

    Uses ``curl`` from PATH as a fast path when present; otherwise falls
    back to the stdlib ``urllib`` client. Transport-level failures return
    ``TRANSPORT_ERROR`` (-1) so they are distinguishable from real HTTP
    error codes in reports.
    """
    curl = shutil.which("curl")
    if curl:
        code = _curl_head(url, curl)
        if code is not None:
            return code
    return _urllib_head(url)


# Backwards-compatible alias.
curl_head = http_head


def page_to_url(page: str) -> str:
    page = page.strip("/")
    if page.startswith("docs/"):
        page = page[5:]
    return f"{DOCS}/{page}" if page else DOCS


def page_to_file(page: str) -> Path:
    page = page.strip("/")
    if page.startswith("docs/"):
        page = page[5:]
    return ROOT / "docs" / f"{page}.mdx"


def strip_fenced_blocks(text: str) -> str:
    lines = text.splitlines()
    out: list[str] = []
    in_fence = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("`"):
            tick_count = len(stripped) - len(stripped.lstrip("`"))
            if tick_count >= 3:
                in_fence = not in_fence
                continue
        if not in_fence:
            out.append(line)
    return "\n".join(out)


def nav_pages() -> list[str]:
    data = json.loads((ROOT / "docs.json").read_text())
    pages: list[str] = []

    def walk(node):
        if isinstance(node, str):
            pages.append(node)
        elif isinstance(node, dict):
            for key in ("pages", "groups", "tabs"):
                if key in node:
                    walk(node[key])
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(data.get("navigation", {}))
    return sorted(set(pages))


def sitemap_urls() -> list[str]:
    req = Request(f"{DOCS}/sitemap.xml", headers={"Cache-Control": "no-cache"})
    xml = urlopen(req, timeout=30).read()
    root = ET.fromstring(xml)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = root.findall(".//sm:loc", ns) or root.findall(".//loc")
    return sorted({el.text.strip() for el in locs if el.text})


def local_links() -> list[tuple[str, str]]:
    broken: list[tuple[str, str]] = []
    for path in (ROOT / "docs").rglob("*.mdx"):
        text = path.read_text(encoding="utf-8", errors="ignore")
        rel = str(path.relative_to(ROOT))
        for match in LINK_RE.finditer(text):
            href = match.group(1) or match.group(2)
            href = href.split("#")[0].split("?")[0].rstrip("/")
            if href.endswith(".md"):
                href = href[:-3]
            target = href.removeprefix("/docs/")
            if not target:
                continue
            if not page_to_file(f"docs/{target}").exists():
                broken.append((rel, href))
    return broken


def tag_delta(tag_text: str) -> int:
    """Balance delta for an MDX tag: opening +1, closing -1, self-closing 0."""
    if tag_text.startswith("</"):
        return -1
    if tag_text.rstrip().endswith("/>"):
        return 0
    return 1


def mdx_component_balance(text: str) -> dict[str, int]:
    r"""Count net open/close balance per MDX component tag in ``text``.

    Inline code spans (e.g. ``\`<Steps>\```) are stripped so component
    references in prose are not mistaken for real unclosed tags.
    """
    text = INLINE_CODE_RE.sub("", text)
    counts: dict[str, int] = {}
    for m in MDX_TAG_RE.finditer(text):
        tag = m.group(1)
        counts[tag] = counts.get(tag, 0) + tag_delta(m.group(0))
    return counts


def mdx_component_issues() -> list[str]:
    issues: list[str] = []
    for path in sorted((ROOT / "docs").rglob("*.mdx")):
        if "sdk/reference" in path.as_posix():
            continue
        text = strip_fenced_blocks(path.read_text(encoding="utf-8", errors="ignore"))
        counts = mdx_component_balance(text)
        bad = [f"{t}(+{n})" if n > 0 else f"{t}({n})" for t, n in counts.items() if n != 0]
        if bad:
            issues.append(f"{path.relative_to(ROOT)}: {', '.join(bad)}")
    return issues


def live_status(urls: list[str]) -> dict[str, int]:
    results: dict[str, int] = {}
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(http_head, u): u for u in urls}
        for fut in as_completed(futs):
            results[futs[fut]] = fut.result()
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=ROOT / "scripts" / "audit_report.md")
    parser.add_argument("--nav-only", action="store_true", help="Check nav URLs only (faster)")
    parser.add_argument("--skip-live", action="store_true", help="Skip live URL checks (offline, local-only audit)")
    args = parser.parse_args()

    nav = nav_pages()
    nav_urls = [page_to_url(p) for p in nav]

    if args.skip_live:
        all_urls = []
        statuses = {}
        live_broken = []
        print("skipping live URL checks (--skip-live)")
    else:
        sm = [] if args.nav_only else sitemap_urls()
        all_urls = sorted(set(nav_urls) | set(sm))
        print(f"checking {len(all_urls)} live URLs...")
        statuses = live_status(all_urls)
        live_broken = sorted([u for u, s in statuses.items() if s not in OK_STATUSES])

    print("scanning local mdx links...")
    local_broken = local_links()

    print("scanning mdx components...")
    mdx_bad = mdx_component_issues()

    nav_missing = [p for p in nav if not page_to_file(p).exists()]

    lines = [
        "# Docs audit report",
        "",
        f"- Live URLs checked: {len(all_urls)}",
        f"- Live broken (not 200/3xx): {len(live_broken)}",
        f"- Local broken hrefs: {len(local_broken)}",
        f"- MDX component issues: {len(mdx_bad)}",
        f"- Nav missing files: {len(nav_missing)}",
        "",
    ]
    if live_broken:
        lines.append("## Live broken pages")
        for u in live_broken:
            lines.append(f"- {statuses[u]} {u}")
        lines.append("")
    if local_broken:
        lines.append("## Local broken internal links")
        for src, href in sorted(set(local_broken))[:200]:
            lines.append(f"- {src} -> {href}")
        if len(local_broken) > 200:
            lines.append(f"- ... and {len(local_broken)-200} more")
        lines.append("")
    if mdx_bad:
        lines.append("## MDX unbalanced components")
        for x in mdx_bad:
            lines.append(f"- {x}")
        lines.append("")
    if nav_missing:
        lines.append("## Nav entries missing MDX")
        for x in nav_missing:
            lines.append(f"- {x}")
        lines.append("")

    args.out.write_text("\n".join(lines))
    (ROOT / "scripts" / "audit_report.json").write_text(
        json.dumps({
            "live_broken": [{"url": u, "status": statuses[u]} for u in live_broken],
            "local_broken": local_broken,
            "mdx_bad": mdx_bad,
            "nav_missing": nav_missing,
        }, indent=2)
    )
    print(
        f"live_broken={len(live_broken)} local_broken={len(local_broken)} "
        f"mdx_bad={len(mdx_bad)} nav_missing={len(nav_missing)}"
    )
    return 1 if (live_broken or local_broken or mdx_bad or nav_missing) else 0


if __name__ == "__main__":
    sys.exit(main())
