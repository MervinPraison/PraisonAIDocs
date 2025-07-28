# API Examples

This directory contains examples demonstrating how to build and use APIs with PraisonAI agents, including REST APIs, MCP servers, and multi-agent API systems.

## Overview

These examples show various patterns for exposing PraisonAI agents through APIs, enabling integration with web applications, services, and other systems.

## Prerequisites

```bash
pip install praisonaiagents
```

Additional dependencies for API examples:
```bash
# For FastAPI examples
pip install fastapi uvicorn

# For Flask examples
pip install flask

# For async support
pip install aiohttp
```

## Examples

### Basic API Examples

#### simple-api.py
Basic REST API with a single agent.
- Framework: FastAPI
- Features: Simple chat endpoint, health check
- Usage:
```bash
python simple-api.py
# API runs on http://localhost:8000
```

Example request:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

#### simple-api-mcp.py
REST API with MCP integration.
- Features: Agent with MCP tools access
- Use case: APIs that need external tool access

### Multi-Agent API Examples

#### multi-agent-api.py / multi-agents-api.py
API exposing multiple agents with different capabilities.
- Features: Agent routing, specialized responses
- Endpoints:
  - `/agents` - List available agents
  - `/chat/{agent_name}` - Chat with specific agent

#### multi-agents-group-api.py
API for agent group collaboration.
- Features: Agents working together on tasks
- Use case: Complex workflows requiring multiple specialists

Example:
```python
# Request to agent group
POST /process
{
  "task": "Research and write article about AI",
  "agents": ["researcher", "writer", "editor"]
}
```

### MCP Server Examples

#### simple-mcp-server.py
Basic MCP server implementation.
- Protocol: stdio
- Features: Custom tools exposed via MCP
- Usage:
```bash
python simple-mcp-server.py
```

#### simple-mcp-multi-agents-server.py
MCP server with multiple agents.
- Features: Agent selection, tool routing
- Use case: Centralized agent service

#### mcp-sse.py
MCP server using Server-Sent Events.
- Protocol: SSE over HTTP
- Features: Real-time streaming responses
- Usage:
```bash
python mcp-sse.py
# SSE endpoint: http://localhost:8000/sse
```

### Specialized API Examples

#### secondary-market-research-api.py
Domain-specific API for market research.
- Features: 
  - Data collection endpoints
  - Analysis workflows
  - Report generation
- Use case: Business intelligence applications

## API Patterns

### Basic REST API Structure
```python
from fastapi import FastAPI
from praisonaiagents import Agent

app = FastAPI()
agent = Agent(name="API Agent", instructions="You are a helpful API assistant")

@app.post("/chat")
async def chat(message: str):
    response = agent.run(message)
    return {"response": response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Streaming Responses
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

@app.post("/stream")
async def stream_chat(message: str):
    async def generate():
        async for chunk in agent.astream(message):
            yield f"data: {chunk}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Multi-Agent Router
```python
agents = {
    "coder": Agent(name="Coder", instructions="You write code"),
    "reviewer": Agent(name="Reviewer", instructions="You review code"),
}

@app.post("/chat/{agent_name}")
async def chat_with_agent(agent_name: str, message: str):
    if agent_name not in agents:
        return {"error": "Agent not found"}
    
    response = agents[agent_name].run(message)
    return {"agent": agent_name, "response": response}
```

### MCP Server Pattern
```python
from praisonaiagents import MCPServer

server = MCPServer("my-api-mcp")

@server.tool("get_data")
async def get_data(params):
    # Tool implementation
    return {"data": "result"}

server.run()
```

## Security Considerations

### Authentication
```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    if token != "your-secret-token":
        raise HTTPException(status_code=401, detail="Invalid token")
    return token

@app.post("/secure/chat")
async def secure_chat(message: str, token: str = Depends(verify_token)):
    return {"response": agent.run(message)}
```

### Rate Limiting
```python
from functools import lru_cache
import time

request_times = {}

def rate_limit(max_requests: int = 10, window: int = 60):
    def decorator(func):
        def wrapper(request, *args, **kwargs):
            client_id = request.client.host
            now = time.time()
            
            if client_id not in request_times:
                request_times[client_id] = []
            
            # Remove old requests
            request_times[client_id] = [
                t for t in request_times[client_id] 
                if now - t < window
            ]
            
            if len(request_times[client_id]) >= max_requests:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            
            request_times[client_id].append(now)
            return func(request, *args, **kwargs)
        return wrapper
    return decorator
```

## Deployment

### Docker
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "simple-api:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Considerations

1. **Use environment variables** for configuration
2. **Implement proper logging** and monitoring
3. **Add health check endpoints**
4. **Use connection pooling** for databases
5. **Implement graceful shutdown**
6. **Add request validation**
7. **Use CORS appropriately**

### Example Production Setup
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PraisonAI API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    logger.info("API starting up...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("API shutting down...")
```

## Testing

### Unit Tests
```python
from fastapi.testclient import TestClient

client = TestClient(app)

def test_chat_endpoint():
    response = client.post("/chat", json={"message": "Hello"})
    assert response.status_code == 200
    assert "response" in response.json()
```

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8000/chat

# Using wrk
wrk -t4 -c100 -d30s http://localhost:8000/chat
```

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PraisonAI API Reference](/docs/api/praisonaiagents)
- [MCP Documentation](/docs/mcp)
- [Deployment Guide](/docs/deploy/deploy)