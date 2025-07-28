# Tools Examples

This directory contains examples demonstrating various tools and integrations available for PraisonAI agents. Tools extend agent capabilities by providing access to external services, APIs, and computational resources.

## Overview

Tools are the bridge between AI agents and the external world. They enable agents to:
- Search the web and access information
- Execute code and perform calculations
- Interact with APIs and databases
- Process and analyze data
- Generate content and media

## Categories

### Search Tools (/langchain/)

Examples of various search tool integrations using LangChain adapters.

#### Web Search Tools
- **brave-search.py** - Privacy-focused Brave Search
- **duckduckgo-search.py** - Anonymous DuckDuckGo search
- **google-search.py** - Google Custom Search API
- **google-serper-search.py** - Google Serper API
- **exa-search.py** - AI-powered semantic search
- **tavily-search.py** - AI-optimized search API
- **you-search.py** - You.com search integration
- **jina-search.py** - Jina AI search
- **searchapi-search.py** - SearchAPI integration

#### Specialized Search
- **wikipedia-search.py** - Wikipedia content search
- **google-trends.py** - Google Trends data
- **serp-api.py** / **serp-search.py** - SERP (Search Engine Results Page) APIs

### Code Execution Tools (/langchain/)

- **azure-code-interpreter.py** - Azure-hosted code execution
- **bearly-code-interpreter.py** - Bearly code interpreter
- **jina-code-interpreter.py** - Jina AI code execution

### E2B (Execute to Build) Tools (/e2b/)

Secure code execution environment for agents.

- **single_agent.py** - Basic E2B integration
- **app.py** - Full E2B application example
- **tools.py** - Custom E2B tool implementations
- **agents.yaml** - Configuration for E2B agents

Usage:
```bash
# Set up E2B API key
export E2B_API_KEY="your-key"

# Run example
python e2b/single_agent.py
```

### SearXNG Integration (/searxng/)

Privacy-respecting metasearch engine integration.

- **searxng-search.py** - SearXNG search tool

Requirements:
- Local SearXNG instance or public endpoint
- No API key required

### Web Scraping Tools (/trafilatura/)

Advanced web content extraction.

- **trafilatura_example.py** - Basic web scraping
- **custom_trafilatura_tools.py** - Custom extraction rules

Features:
- Clean text extraction
- Metadata parsing
- Multi-format support

### Exa Tool Examples (/exa-tool/)

Comprehensive examples using Exa (formerly Metaphor) search API for various domains.

#### By Domain

**Finance & Markets**
- Financial coaching agents
- Market analysis tools

**Health & Fitness**
- Air quality analysis
- Health monitoring agents

**Programming & Analysis**
- Game playing agents (Tic-Tac-Toe example)
- Code analysis tools

**Research & Knowledge**
- Domain-specific research agents
- Deep research capabilities

**Social Media & Content**
- News aggregation
- Podcast discovery

#### Advanced Agents (/exa-tool/Kimi2_Intelligent_Agents/)
- **audio_tour_agent.py** - Virtual tour guide
- **chess_agent.py** - Chess playing agent
- **creative_writing_agent.py** - Story and content generation
- **cybersecurity_agent.py** - Security analysis
- **data_visualization_agent.py** - Chart and graph creation
- **game_development_agent.py** - Game design assistant
- **self_evolving_agent.py** - Self-improving agent
- **startup_insight_agent.py** - Startup analysis
- **system_architect_agent.py** - System design
- **web_scraper_agent.py** - Advanced scraping

#### Grok-4 Agents (/exa-tool/grok4_intelligent_agents/)
Latest generation agents with specialized capabilities:
- AI competitor intelligence
- Finance and investment advisors
- Legal document analysis
- Medical imaging interpretation
- Multi-modal reasoning
- And many more...

### CLI Tools (/cli/)

Command-line interface tools for agents.

- **app.py** - CLI tool integration example

## Basic Tool Usage

### Simple Tool Integration
```python
from praisonaiagents import Agent, Tools

# Create agent with built-in tools
agent = Agent(
    name="SearchAgent",
    instructions="You help users find information",
    tools=[Tools.web_search, Tools.calculator]
)

result = agent.run("Search for the latest AI news")
```

### Custom Tool Creation
```python
from praisonaiagents import Tool

# Define custom tool
def my_custom_tool(query: str) -> str:
    """Description of what the tool does"""
    # Tool implementation
    return f"Processed: {query}"

# Create Tool instance
custom_tool = Tool(
    name="my_tool",
    description="Processes queries in a custom way",
    function=my_custom_tool
)

# Use with agent
agent = Agent(
    name="CustomAgent",
    tools=[custom_tool]
)
```

### LangChain Tool Integration
```python
from langchain.tools import DuckDuckGoSearchRun
from praisonaiagents import Agent

# Initialize LangChain tool
search = DuckDuckGoSearchRun()

# Wrap for PraisonAI
agent = Agent(
    name="LangChainAgent",
    tools=[search]
)
```

## Tool Patterns

### Search Pattern
```python
# Common search pattern
def search_and_summarize(agent, query):
    # Search for information
    search_results = agent.run(f"Search for: {query}")
    
    # Summarize findings
    summary = agent.run(f"Summarize these search results: {search_results}")
    
    return summary
```

### Code Execution Pattern
```python
# Safe code execution
def execute_code_safely(agent, code):
    try:
        result = agent.run(f"Execute this Python code: {code}")
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### Multi-Tool Workflow
```python
# Combining multiple tools
agent_with_tools = Agent(
    name="MultiToolAgent",
    instructions="You are a research assistant",
    tools=[
        Tools.web_search,
        Tools.wikipedia,
        Tools.calculator,
        Tools.code_executor
    ]
)

# Complex task using multiple tools
result = agent_with_tools.run("""
1. Search for Python market share statistics
2. Calculate the growth rate
3. Write a summary with code examples
""")
```

## Best Practices

1. **Tool Selection**: Choose appropriate tools for the task
2. **Error Handling**: Always handle tool failures gracefully
3. **Rate Limiting**: Respect API limits for external services
4. **Caching**: Cache tool results when appropriate
5. **Security**: Validate and sanitize tool inputs
6. **Documentation**: Document custom tools thoroughly

## Environment Setup

Most tools require API keys. Set them as environment variables:

```bash
# Search APIs
export BRAVE_API_KEY="your-key"
export SERPAPI_API_KEY="your-key"
export TAVILY_API_KEY="your-key"
export EXA_API_KEY="your-key"

# Code Execution
export E2B_API_KEY="your-key"

# Google Services
export GOOGLE_API_KEY="your-key"
export GOOGLE_CSE_ID="your-cse-id"
```

## Creating Custom Tools

### Tool Template
```python
from praisonaiagents import Tool
from typing import Optional, Dict, Any

class MyCustomTool(Tool):
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="my_custom_tool",
            description="What this tool does",
            parameters={
                "query": {
                    "type": "string",
                    "description": "The search query"
                },
                "options": {
                    "type": "object",
                    "description": "Additional options"
                }
            }
        )
        self.api_key = api_key
    
    def execute(self, query: str, options: Optional[Dict[str, Any]] = None) -> str:
        # Tool implementation
        return "Tool result"
```

## Troubleshooting

### Common Issues

1. **API Key Errors**: Verify environment variables are set
2. **Rate Limits**: Implement exponential backoff
3. **Network Issues**: Add retry logic
4. **Tool Not Found**: Check tool registration
5. **Permission Errors**: Verify API key permissions

### Debug Mode
```python
import logging
logging.getLogger("tools").setLevel(logging.DEBUG)
```

## Additional Resources

- [Tools Documentation](/docs/tools/tools)
- [Custom Tool Creation](/docs/tools/custom)
- [LangChain Tools](/docs/tools/langchain)
- [Tool API Reference](/docs/api/praisonaiagents/tools)