"""
PraisonAI A2A Server Example

Expose a PraisonAI Agent as an A2A (Agent2Agent) Server.
This enables other AI agents to discover and communicate with your agent.

Run:
    uvicorn a2a-server:app --reload

Endpoints:
    GET /.well-known/agent.json  - Agent Card for discovery
    GET /status                   - Server status
"""

from praisonaiagents import Agent, A2A
from fastapi import FastAPI

# Create an agent with tools
def search_web(query: str) -> str:
    """Search the web for information."""
    return f"Search results for: {query}"

def calculate(expression: str) -> str:
    """Safely evaluate a mathematical expression."""
    import ast
    import operator

    _OPS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }

    def _safe_eval(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        elif isinstance(node, ast.BinOp) and type(node.op) in _OPS:
            return _OPS[type(node.op)](_safe_eval(node.left), _safe_eval(node.right))
        elif isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
            return _OPS[type(node.op)](_safe_eval(node.operand))
        else:
            raise ValueError("Unsupported expression")

    try:
        result = _safe_eval(ast.parse(expression, mode="eval").body)
        return f"Result: {result}"
    except (ValueError, SyntaxError, TypeError, ZeroDivisionError, OverflowError):
        return "Invalid expression"

agent = Agent(
    name="Research Assistant",
    role="Research Analyst",
    goal="Help users research topics and answer questions",
    tools=[search_web, calculate]
)

# Expose as A2A Server
a2a = A2A(
    agent=agent,
    url="http://localhost:8000/a2a",
    version="1.0.0"
)

# Create FastAPI app
app = FastAPI(
    title="PraisonAI A2A Server",
    description="A2A-compatible agent server"
)
app.include_router(a2a.get_router())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
