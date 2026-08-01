#!/usr/bin/env python3
"""Fix known MDX parse errors for mintlify validate."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

REPLACEMENTS: dict[str, list[tuple[str, str]]] = {
    "features/gateway-hooks.mdx": [
        (
            'description: "Trigger agents from external services via authenticated POST /hooks/<path>"',
            'description: "Trigger agents from external services via authenticated POST /hooks/{path}"',
        ),
    ],
    "features/gateway-inbound-hooks.mdx": [
        (
            'description: "Trigger agent runs from external HTTP events with POST /hooks/<path>"',
            'description: "Trigger agent runs from external HTTP events with POST /hooks/{path}"',
        ),
    ],
    "features/permission-modes.mdx": [
        (
            'description: "Control how much an agent may do with one Agent(approval=<mode>) string"',
            'description: "Control how much an agent may do with one Agent(approval={mode}) string"',
        ),
    ],
    "features/variable-substitution.mdx": [
        (
            'description: "Dynamic variable substitution with {{var}} and {{var.property}} syntax"',
            'description: "Dynamic variable substitution with double-brace placeholders and dot-notation"',
        ),
    ],
    "cli/agent.mdx": [
        (
            'prints: *"Another \'<name>\' agent takes precedence for \'run\': <other-path>."*',
            'prints: *"Another \'{name}\' agent takes precedence for \'run\': {other-path}."*',
        ),
    ],
    "sdk/reference/typescript/functions/getMCPTools.mdx": [
        (
            "async def getMCPTools(config: MCPClientConfig) -> Promise<\n```\n\n### Returns\n\n<ResponseField name=\"Returns\" type=\"Promise<\">",
            "async def getMCPTools(config: MCPClientConfig) -> Promise[{ client: MCPClient; tools: any[] }]\n```\n\n### Returns\n\n<ResponseField name=\"Returns\" type=\"Promise&lt;{ client: MCPClient; tools: any[] }&gt;\">",
        ),
    ],
    "sdk/reference/typescript/functions/parse_plugin_header_from_file.mdx": [
        (
            "async def parse_plugin_header_from_file(path: string) -> Promise<\n```\n\n### Returns\n\n<ResponseField name=\"Returns\" type=\"Promise<\">",
            "async def parse_plugin_header_from_file(path: string) -> Promise[{ name?: string; version?: string; description?: string }]\n```\n\n### Returns\n\n<ResponseField name=\"Returns\" type=\"Promise&lt;{ name?: string; version?: string; description?: string }&gt;\">",
        ),
    ],
    "sdk/reference/rust/functions/route.mdx": [
        (
            '<ResponseField name="Returns" type="crate::workflows::FlowStep where F: Fn(&str) -> bool + Send + Sync + \'static,">',
            '<ResponseField name="Returns" type="crate::workflows::FlowStep">',
        ),
    ],
    "sdk/reference/rust/functions/when.mdx": [
        (
            '<ResponseField name="Returns" type="crate::workflows::FlowStep where F: Fn(&str) -> bool + Send + Sync + \'static,">',
            '<ResponseField name="Returns" type="crate::workflows::FlowStep">',
        ),
    ],
    "sdk/reference/rust/functions/subscribe.mdx": [
        (
            '<ResponseField name="Returns" type="usize where F: Fn(&Event) + Send + Sync + \'static,">',
            '<ResponseField name="Returns" type="usize">',
        ),
    ],
    "sdk/reference/rust/functions/subscribe_all.mdx": [
        (
            '<ResponseField name="Returns" type="usize where F: Fn(&Event) + Send + Sync + \'static,">',
            '<ResponseField name="Returns" type="usize">',
        ),
    ],
    "sdk/reference/rust/functions/HookDefinition-new.mdx": [
        (
            '<ParamField query="func" type="impl Fn(&HookInput" required={true}>',
            '<ParamField query="func" type="impl Fn(&HookInput) -> HookResult + Send + Sync + \'static" required={true}>',
        ),
        (
            '<ResponseField name="Returns" type="HookResult + Send + Sync + \'static,\n    ) -> Self">',
            '<ResponseField name="Returns" type="Self">',
        ),
    ],
    "sdk/reference/rust/functions/HookRegistry-add_hook.mdx": [
        (
            '<ParamField query="func" type="impl Fn(&HookInput" required={true}>',
            '<ParamField query="func" type="impl Fn(&HookInput) -> HookResult + Send + Sync + \'static" required={true}>',
        ),
    ],
    "sdk/reference/rust/functions/HookRegistry-add_hook_with_matcher.mdx": [
        (
            '<ParamField query="func" type="impl Fn(&HookInput" required={true}>',
            '<ParamField query="func" type="impl Fn(&HookInput) -> HookResult + Send + Sync + \'static" required={true}>',
        ),
        (
            '<ResponseField name="Returns" type="HookResult + Send + Sync + \'static,\n    ) -> &mut Self">',
            '<ResponseField name="Returns" type="&mut Self">',
        ),
    ],
}


def fix_train_mdx(text: str) -> str:
    lines = text.splitlines(keepends=True)
    in_code = False
    out: list[str] = []

    def fix_line(s: str) -> str:
        s = re.sub(r"'<([a-z][a-z0-9_-]*)>'", r"'{\1}'", s)
        s = re.sub(r'"<([a-z][a-z0-9_-]*)>"', r'"{\1}"', s)
        s = re.sub(
            r"`([^`]*?)<([a-z][a-z0-9_-]*)>([^`]*?)`",
            lambda m: f"`{m.group(1)}{{{m.group(2)}}}{m.group(3)}`",
            s,
        )
        s = s.replace("`<start_of_turn>`", "`&lt;start_of_turn&gt;`")
        s = s.replace("`<end_of_turn>`", "`&lt;end_of_turn&gt;`")
        s = s.replace("`<｜end▁of▁sentence｜>`", "`&lt;|redacted_end_of_sentence|&gt;`")
        s = s.replace("'{your-username}/<name>'", "'{your-username}/{name}'")
        s = s.replace("'{username}/<name>'", "'{username}/{name}'")
        s = s.replace("`<username>/<name>`", "`{username}/{name}`")
        s = s.replace("`{username}/<name>`", "`{username}/{name}`")
        s = s.replace("'<name>'", "'{name}'")
        s = s.replace("'<model_name>'", "'{model_name}'")
        s = s.replace("praisonai-train show <session>", "praisonai-train show {session}")
        s = s.replace("praisonai-train apply <session>", "praisonai-train apply {session}")
        s = s.replace(
            "`quantization_method '<val>' is not valid.",
            "`quantization_method '{val}' is not valid.",
        )
        s = s.replace(
            "ollama serve output: <stderr>",
            "ollama serve output: {stderr}",
        )
        return s

    for line in lines:
        if line.strip().startswith("```"):
            in_code = not in_code
            out.append(line)
            continue
        out.append(line if in_code else fix_line(line))
    return "".join(out)


def main() -> None:
    for rel, pairs in REPLACEMENTS.items():
        path = DOCS / rel
        text = path.read_text(encoding="utf-8")
        for old, new in pairs:
            text = text.replace(old, new)
        path.write_text(text, encoding="utf-8")

    train = DOCS / "train.mdx"
    train.write_text(fix_train_mdx(train.read_text(encoding="utf-8")), encoding="utf-8")
    print("Applied MDX validate fixes")


if __name__ == "__main__":
    main()
