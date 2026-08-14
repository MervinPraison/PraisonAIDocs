#!/usr/bin/env python3
"""
Tool Registry Proxy Example

Discover and call third-party API endpoints through a tool-registry proxy using
one token. Vendor credentials are injected server-side by the registry, so the
agent never holds vendor keys.

Setup:
1. Install the connector: pip install 'praisonai-tools[registry-proxy]'
2. Set environment variables:
   - TOOL_PROXY_URL=https://your-registry-host   (unset -> connector disabled)
   - TOOL_PROXY_TOKEN=your-token

Usage:
    python registry_proxy_example.py
"""

import os

from praisonaiagents import Agent
from praisonai_tools.registry_proxy import (
    registry_search,
    registry_describe,
    registry_call,
)


def main():
    """Run an agent that uses the registry proxy connector."""

    if not os.getenv("TOOL_PROXY_URL"):
        print("TOOL_PROXY_URL is not set - the connector is disabled.")
        print("Set your registry URL and token, then re-run:")
        print("  export TOOL_PROXY_URL=https://your-registry-host")
        print("  export TOOL_PROXY_TOKEN=your-token")
        return

    agent = Agent(
        instructions="SEO analyst",
        tools=[registry_search, registry_describe, registry_call],
    )
    agent.start("Find the top backlink sources for example.com and summarise")


if __name__ == "__main__":
    main()
