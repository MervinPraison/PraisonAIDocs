#!/usr/bin/env python3
"""Unit tests for audit_docs_links: MDX component balance counting and portable HTTP client."""

from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import audit_docs_links as audit
from audit_docs_links import (  # noqa: E402
    mdx_component_balance,
    strip_fenced_blocks,
    tag_delta,
)


# ── MDX component balance tests ────────────────────────────────────────────

def balance(text: str, tag: str = "Card") -> int:
    return mdx_component_balance(text).get(tag, 0)


def test_self_closing_card_is_balanced():
    assert balance("<Card />") == 0


def test_self_closing_card_with_attrs_is_balanced():
    assert balance('<Card icon="robot" href="/docs/x" />') == 0


def test_paired_card_is_balanced():
    assert balance("<Card>text</Card>") == 0


def test_unclosed_card_is_positive():
    assert balance("<Card>text") == 1


def test_nested_self_closing_within_group():
    assert balance("<CardGroup><Card /></CardGroup>", "Card") == 0
    assert balance("<CardGroup><Card /></CardGroup>", "CardGroup") == 0


def test_related_section_multiple_self_closing():
    text = (
        '<CardGroup cols={2}>\n'
        '  <Card icon="robot" href="/docs/concepts/agents" />\n'
        '  <Card icon="book-open" href="/docs/guides/single-agent" />\n'
        '</CardGroup>'
    )
    assert balance(text, "Card") == 0
    assert balance(text, "CardGroup") == 0


def test_fenced_code_card_is_ignored():
    text = "```mdx\n<Card>\n```\n"
    assert balance(strip_fenced_blocks(text)) == 0


def test_inline_code_reference_is_ignored():
    text = "Every page must use `<Steps>` and `<CardGroup cols={2}>`."
    assert balance(text, "Steps") == 0
    assert balance(text, "CardGroup") == 0


def test_inline_reference_does_not_offset_real_tags():
    text = "Use `<Steps>` here.\n<Steps>\n<Step>x</Step>\n</Steps>"
    assert balance(text, "Steps") == 0


def test_tag_delta_values():
    assert tag_delta("<Card>") == 1
    assert tag_delta("</Card>") == -1
    assert tag_delta("<Card />") == 0
    assert tag_delta("<Card/>") == 0


def test_extra_closing_tag_is_negative():
    assert balance("<Card>x</Card></Card>") == -1


# ── HTTP client tests ───────────────────────────────────────────────────────

class FakeResponse:
    def __init__(self, status: int):
        self.status = status

    def getcode(self) -> int:
        return self.status

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class HttpHeadTests(unittest.TestCase):
    def test_urllib_returns_200(self):
        with mock.patch.object(audit.shutil, "which", return_value=None), \
             mock.patch.object(audit, "urlopen", return_value=FakeResponse(200)):
            self.assertEqual(audit.http_head("https://example.com"), 200)

    def test_urllib_http_error_404(self):
        err = audit.HTTPError("https://example.com", 404, "Not Found", {}, None)
        with mock.patch.object(audit.shutil, "which", return_value=None), \
             mock.patch.object(audit, "urlopen", side_effect=err):
            self.assertEqual(audit.http_head("https://example.com"), 404)

    def test_urllib_url_error_transport_sentinel(self):
        err = audit.URLError("connection refused")
        with mock.patch.object(audit.shutil, "which", return_value=None), \
             mock.patch.object(audit, "urlopen", side_effect=err):
            self.assertEqual(
                audit.http_head("https://example.com"), audit.TRANSPORT_ERROR
            )

    def test_head_405_falls_back_to_get(self):
        err = audit.HTTPError("https://example.com", 405, "Method Not Allowed", {}, None)
        side_effects = [err, FakeResponse(200)]

        def fake_urlopen(req, timeout=None):
            result = side_effects.pop(0)
            if isinstance(result, Exception):
                raise result
            return result

        with mock.patch.object(audit.shutil, "which", return_value=None), \
             mock.patch.object(audit, "urlopen", side_effect=fake_urlopen):
            self.assertEqual(audit.http_head("https://example.com"), 200)

    def test_curl_fast_path_used_when_available(self):
        completed = types.SimpleNamespace(stdout="301", returncode=0)
        with mock.patch.object(audit.shutil, "which", return_value="/usr/bin/curl"), \
             mock.patch.object(audit.subprocess, "run", return_value=completed) as run:
            self.assertEqual(audit.http_head("https://example.com"), 301)
            run.assert_called_once()

    def test_curl_failure_falls_back_to_urllib(self):
        completed = types.SimpleNamespace(stdout="", returncode=1)
        with mock.patch.object(audit.shutil, "which", return_value="/usr/bin/curl"), \
             mock.patch.object(audit.subprocess, "run", return_value=completed), \
             mock.patch.object(audit, "urlopen", return_value=FakeResponse(200)):
            self.assertEqual(audit.http_head("https://example.com"), 200)

    def test_curl_uses_nul_on_windows(self):
        captured = {}

        def fake_run(cmd, **kwargs):
            captured["cmd"] = cmd
            return types.SimpleNamespace(stdout="200", returncode=0)

        with mock.patch.object(audit.os, "name", "nt"), \
             mock.patch.object(audit.subprocess, "run", side_effect=fake_run):
            audit._curl_head("https://example.com", "curl")
        self.assertIn("NUL", captured["cmd"])
        self.assertNotIn("/dev/null", captured["cmd"])

    def test_backwards_compatible_alias(self):
        self.assertIs(audit.curl_head, audit.http_head)


if __name__ == "__main__":
    import pytest

    sys.exit(pytest.main([__file__, "-v"]))
