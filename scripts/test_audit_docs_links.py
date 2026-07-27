#!/usr/bin/env python3
"""Unit tests for MDX component balance counting in audit_docs_links."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from audit_docs_links import component_counts, tag_delta


def test_self_closing_card_is_balanced():
    assert component_counts("<Card />") == {}


def test_self_closing_card_with_attrs_is_balanced():
    assert component_counts('<Card icon="robot" href="/docs/x" />') == {}


def test_paired_card_is_balanced():
    assert component_counts("<Card>text</Card>") == {}


def test_unclosed_card_is_flagged():
    assert component_counts("<Card>text") == {"Card": 1}


def test_nested_self_closing_in_group_is_balanced():
    assert component_counts("<CardGroup><Card /></CardGroup>") == {}


def test_fenced_code_is_ignored():
    text = "```mdx\n<Card>\n```\n"
    assert component_counts(text) == {}


def test_multiple_self_closing_cards_balanced():
    text = (
        "<CardGroup cols={2}>\n"
        '  <Card icon="robot" href="/a" />\n'
        '  <Card icon="book-open" href="/b" />\n'
        "</CardGroup>\n"
    )
    assert component_counts(text) == {}


def test_extra_closing_tag_is_negative():
    assert component_counts("<Card>x</Card></Card>") == {"Card": -1}


def test_tag_delta_open():
    assert tag_delta("<Card>") == 1


def test_tag_delta_close():
    assert tag_delta("</Card>") == -1


def test_tag_delta_self_closing():
    assert tag_delta('<Card icon="x" />') == 0


if __name__ == "__main__":
    import pytest

    sys.exit(pytest.main([__file__, "-v"]))
