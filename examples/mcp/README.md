# MCP (Model Context Protocol) Examples

This directory contains examples demonstrating the Model Context Protocol (MCP) integration with various services and providers in PraisonAI.

## Overview

MCP enables standardized communication between AI agents and external services, tools, and data sources. These examples show how to integrate different MCP servers with PraisonAI agents.

## What is MCP?

Model Context Protocol (MCP) is an open protocol that provides a standard way for AI systems to interact with external data sources and tools. It enables:

- Standardized tool interfaces
- Secure data access
- Consistent error handling
- Scalable integrations

## Prerequisites

```bash
pip install praisonaiagents
```

Additional dependencies may be required for specific MCP servers:
```bash
# For database examples
pip install psycopg2-binary redis

# For web automation
pip install playwright

# For specific providers
pip install anthropic openai groq
```

## Examples by Category

### LLM Provider MCPs

#### openai-mcp.py
OpenAI integration via MCP.
```bash
export OPENAI_API_KEY="your-key"
python openai-mcp.py
```

#### anthropic-mcp.py
Anthropic Claude integration.
```bash
export ANTHROPIC_API_KEY="your-key"
python anthropic-mcp.py
```

#### groq-mcp.py
High-speed inference with Groq.
```bash
export GROQ_API_KEY="your-key"
python groq-mcp.py
```

#### gemini-mcp.py
Google Gemini integration.
```bash
export GOOGLE_API_KEY="your-key"
python gemini-mcp.py
```

#### mistral-mcp.py
Mistral AI models integration.
```bash
export MISTRAL_API_KEY="your-key"
python mistral-mcp.py
```

#### ollama.py / ollama-python.py
Local model inference with Ollama.
- No API key required
- Requires Ollama installed locally

#### openrouter-mcp.py
Access multiple models through OpenRouter.
```bash
export OPENROUTER_API_KEY="your-key"
python openrouter-mcp.py
```

#### perplexity-mcp.py
Perplexity AI for search-augmented responses.
```bash
export PERPLEXITY_API_KEY="your-key"
python perplexity-mcp.py
```

#### xai-mcp.py
xAI (Grok) model integration.
```bash
export XAI_API_KEY="your-key"
python xai-mcp.py
```

### Data Storage MCPs

#### filesystem-mcp.py
File system operations through MCP.
- Features: Read, write, list files
- Use case: Document processing, file management

#### postgres-mcp.py
PostgreSQL database integration.
- Features: Query execution, data manipulation
- Requires: PostgreSQL connection string

#### redis-mcp.py
Redis cache and data store integration.
- Features: Key-value operations, caching
- Requires: Redis server

#### memory-mcp.py
In-memory storage for agent state.
- Features: Session persistence, context storage
- Use case: Stateful conversations

#### gdrive-mcp.py
Google Drive integration.
- Features: File upload/download, search
- Requires: Google Cloud credentials

### Communication MCPs

#### slack-mcp.py
Slack workspace integration.
- Features: Send messages, read channels
- Requires: Slack bot token

#### whatsapp-mcp.py / whatsapp-mcp-ui.py
WhatsApp messaging integration.
- Features: Send/receive messages
- Multiple variants for different use cases

#### whatsapp-multi-agents-mcp.py
Multi-agent WhatsApp bot.
- Features: Agent routing, conversation management

#### whatsapp-groq-mcp.py / whatsapp-ollama-mcp.py
WhatsApp with specific LLM providers.

### Web Automation MCPs

#### playwright-mcp.py
Browser automation with Playwright.
- Features: Web scraping, form filling, screenshots
- Use case: Web testing, data extraction

#### puppeteer-mcp.py
Browser automation with Puppeteer.
- Similar to Playwright with different API

#### fetch-mcp.py
Simple HTTP requests through MCP.
- Features: API calls, web content fetching

### Search and Information MCPs

#### bravesearch-mcp.py
Privacy-focused web search.
- Features: Web search without tracking
- Requires: Brave Search API key

#### google-maps-mcp.py
Google Maps and location services.
- Features: Geocoding, directions, place search
- Requires: Google Maps API key

### Development Tools MCPs

#### github-mcp.py
GitHub repository operations.
- Features: Issue management, PR operations
- Requires: GitHub token

#### gitlab-mcp.py
GitLab integration.
- Features: Similar to GitHub MCP
- Requires: GitLab token

#### git-mcp.py
Local Git operations.
- Features: Commit, branch, merge operations

#### sentry-mcp.py
Error tracking with Sentry.
- Features: Error reporting, performance monitoring
- Requires: Sentry DSN

### Specialized MCPs

#### aws-kb-retrieval-mcp.py
AWS Knowledge Base retrieval.
- Features: RAG with AWS services
- Requires: AWS credentials

#### airbnb-mcp.py
Airbnb data and search integration.
- Features: Listing search, availability checking

#### everart-mcp.py
AI art generation integration.
- Features: Image generation, style transfer

#### databutton-mcp.py
Databutton app integration.
- Features: No-code app interactions

#### sequential-thinking-mcp.py
Advanced reasoning with step-by-step thinking.
- Features: Chain-of-thought reasoning

#### time-mcp.py
Time and date utilities.
- Features: Timezone conversion, scheduling

### Custom MCP Development

#### custom-python-server.py
Template for creating your own MCP server.
```python
# Basic structure for custom MCP server
from mcp import Server

server = Server("custom-mcp")

@server.tool("my_tool")
async def my_tool(params):
    return {"result": "Tool output"}
```

#### custom-python-client.py
Template for MCP client implementation.
```python
# Basic structure for custom MCP client
from praisonaiagents import MCP

mcp = MCP("custom-mcp", "stdio")
result = await mcp.call_tool("my_tool", params)
```

## MCP Configuration

### Basic MCP Setup
```python
from praisonaiagents import Agent, MCP

# Create MCP instance
mcp = MCP(
    name="my-mcp",
    transport="stdio",  # or "sse" for server-sent events
    command=["python", "mcp_server.py"]
)

# Create agent with MCP
agent = Agent(
    name="MCPAgent",
    instructions="You can use MCP tools",
    mcp_servers=[mcp]
)
```

### SSE (Server-Sent Events) Transport
```python
# For web-based MCPs
mcp = MCP(
    name="weather-mcp",
    transport="sse",
    url="http://localhost:8000/sse"
)
```

## Best Practices

1. **Error Handling**: Always implement proper error handling for MCP calls
2. **Timeouts**: Set appropriate timeouts for long-running operations
3. **Authentication**: Secure API keys and credentials properly
4. **Rate Limiting**: Respect API rate limits in MCP implementations
5. **Logging**: Enable logging for debugging MCP communications

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check if MCP server is running
   - Verify transport configuration (stdio vs sse)

2. **Authentication Failures**
   - Ensure API keys are set correctly
   - Check credential permissions

3. **Tool Not Found**
   - Verify tool name matches server implementation
   - Check MCP server logs

### Debug Mode
```python
import logging
logging.getLogger("mcp").setLevel(logging.DEBUG)
```

## Creating Your Own MCP

1. Define your tools and their parameters
2. Implement the MCP server protocol
3. Handle authentication if needed
4. Test with the custom client example
5. Integrate with PraisonAI agents

## Additional Resources

- [MCP Documentation](/docs/mcp)
- [MCP API Reference](/docs/api/praisonaiagents/mcp/mcp)
- [MCP Protocol Specification](https://github.com/modelcontextprotocol)
- [Integration Guides](/docs/mcp/custom)