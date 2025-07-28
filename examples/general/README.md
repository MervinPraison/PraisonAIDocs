# General Examples

This directory contains general-purpose examples demonstrating core PraisonAI concepts, patterns, and features. These examples are ideal starting points for understanding how to build AI agent systems.

## Overview

These examples cover fundamental concepts including:
- Async operations
- Agent workflows
- Memory management
- Tool integration
- Structured outputs
- Human-in-the-loop patterns
- Multi-agent orchestration

## Core Concepts

### Async Examples

#### async_example.py
Basic asynchronous agent operations.
```python
# Simple async usage
import asyncio
from praisonaiagents import Agent

async def main():
    agent = Agent(name="AsyncAgent")
    result = await agent.arun("Process this asynchronously")
    print(result)

asyncio.run(main())
```

#### async_example_full.py
Complete async workflow with multiple agents.
- Features: Concurrent agent execution, async tools
- Use case: High-performance applications

#### async_example_full_multigroups.py
Multiple agent groups running asynchronously.
- Features: Parallel group execution, result aggregation
- Use case: Complex workflows with independent sub-tasks

### Agent Creation Patterns

#### auto_agents_example.py
Automatic agent creation based on task requirements.
```python
from praisonaiagents import AutoAgents

# Automatically create and configure agents
auto_agents = AutoAgents(task="Create a marketing campaign")
result = auto_agents.run()
```

#### mini_agents_example.py
Lightweight agents for simple tasks.
- Features: Minimal configuration, quick setup
- Use case: Simple, focused tasks

#### code_agents_example.py
Agents specialized for code generation and analysis.
- Features: Syntax highlighting, code execution
- Use case: Development assistance, code review

### Workflow Examples

#### workflow_example_basic.py
Simple linear workflow with agents.
```python
# Basic workflow pattern
agent1 = Agent(name="Researcher")
agent2 = Agent(name="Writer")

research = agent1.run("Research AI trends")
article = agent2.run(f"Write article based on: {research}")
```

#### workflow_example_detailed.py
Complex workflow with branching and conditions.
- Features: Conditional execution, error handling
- Use case: Production workflows

#### example_sequential.py
Sequential task execution with dependencies.
- Features: Task chaining, result passing
- Use case: Multi-step processes

### Advanced Patterns

#### orchestrator-workers.py
Orchestrator-worker pattern for scalable systems.
```python
# Orchestrator manages multiple workers
orchestrator = Agent(name="Orchestrator", role="manager")
workers = [Agent(name=f"Worker{i}") for i in range(3)]

# Orchestrator delegates tasks to workers
```

#### parallelisation.py
Parallel execution of independent tasks.
- Features: Concurrent processing, result merging
- Use case: Performance optimization

#### evaluator-optimiser.py
Self-improving agent system with evaluation.
- Features: Performance metrics, optimization loops
- Use case: Continuous improvement

#### prompt_chaining.py
Advanced prompt engineering with chaining.
- Features: Context preservation, prompt templates
- Use case: Complex reasoning tasks

### Human Interaction

#### human_approval_example.py
Human-in-the-loop approval workflow.
```python
from praisonaiagents import Agent, HumanApproval

agent = Agent(
    name="AssistantAgent",
    human_approval=HumanApproval(
        required_for=["file_write", "api_call"],
        timeout=300  # 5 minutes
    )
)

# Agent will request approval before sensitive operations
```

### Memory Management

#### memory_example.py
Comprehensive memory management example.
```python
from praisonaiagents import Agent, Memory

# Agent with persistent memory
agent = Agent(
    name="MemoryAgent",
    memory=Memory(
        type="long_term",
        storage="redis",
        ttl=3600  # 1 hour
    )
)
```

#### memory_simple.py
Simple memory for conversation context.
- Features: Short-term memory, context window
- Use case: Conversational agents

### Tool Integration

#### tools_example.py
Basic tool usage with agents.
```python
from praisonaiagents import Agent, Tools

agent = Agent(
    name="ToolAgent",
    tools=[Tools.calculator, Tools.web_search]
)
```

#### example_custom_tools.py
Creating and using custom tools.
- Features: Tool definition, parameter validation
- Use case: Domain-specific tools

#### tools-class.py
Advanced tool class implementation.
- Features: Tool inheritance, complex operations
- Use case: Reusable tool libraries

### Integration Examples

#### langchain_example.py
Integration with LangChain components.
```python
from langchain.llms import OpenAI
from praisonaiagents import Agent

# Use LangChain LLM with PraisonAI
llm = OpenAI(temperature=0.7)
agent = Agent(name="LangChainAgent", llm=llm)
```

### Structured Outputs

#### structured_agents_example.py
Agents that return structured data.
```python
from pydantic import BaseModel
from praisonaiagents import Agent

class AnalysisResult(BaseModel):
    summary: str
    score: float
    recommendations: List[str]

agent = Agent(
    name="Analyst",
    output_schema=AnalysisResult
)
```

#### structured_response_example.py
Enforcing response formats.
- Features: JSON schemas, validation
- Use case: API integrations

### Specialized Patterns

#### autonomous-agent.py
Fully autonomous agent with self-direction.
- Features: Goal setting, planning, execution
- Use case: Long-running tasks

#### multimodal.py
Agents handling multiple data types.
- Features: Image, text, audio processing
- Use case: Rich media applications

#### example_callback.py
Event callbacks for agent operations.
```python
def on_task_complete(task, result):
    print(f"Task {task.name} completed with result: {result}")

agent = Agent(
    name="CallbackAgent",
    callbacks={
        "on_task_complete": on_task_complete,
        "on_error": lambda e: print(f"Error: {e}")
    }
)
```

## Running Examples

### Basic Setup
```bash
# Install dependencies
pip install praisonaiagents

# Set API key
export OPENAI_API_KEY="your-key"

# Run an example
python async_example.py
```

### Environment Variables
Many examples support configuration via environment:
```bash
export PRAISONAI_LOG_LEVEL="DEBUG"
export PRAISONAI_MODEL="gpt-4"
export PRAISONAI_TEMPERATURE="0.7"
```

## Common Patterns

### Error Handling
```python
try:
    result = agent.run(task)
except Exception as e:
    logger.error(f"Agent failed: {e}")
    # Fallback logic
```

### Logging
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

agent = Agent(name="LoggingAgent", logger=logger)
```

### Configuration
```python
from praisonaiagents import Config

config = Config(
    model="gpt-4",
    temperature=0.5,
    max_retries=3
)

agent = Agent(name="ConfiguredAgent", config=config)
```

## Best Practices

1. **Start Simple**: Begin with basic examples before moving to complex patterns
2. **Error Handling**: Always implement proper error handling
3. **Resource Management**: Clean up resources (close connections, clear memory)
4. **Testing**: Test agents with various inputs
5. **Monitoring**: Add logging and metrics for production use

## Example Categories Quick Reference

- **Async Operations**: `async_*.py`
- **Workflows**: `workflow_*.py`, `*sequential*.py`
- **Memory**: `memory_*.py`
- **Tools**: `tools_*.py`, `*_tools.py`
- **Structured Data**: `structured_*.py`
- **Advanced Patterns**: `orchestrator*.py`, `evaluator*.py`
- **Integration**: `langchain*.py`, `multimodal.py`

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure `praisonaiagents` is installed
2. **API Key Issues**: Check environment variables
3. **Async Errors**: Use proper async/await syntax
4. **Memory Errors**: Check memory backend configuration
5. **Tool Errors**: Verify tool dependencies are installed

### Debug Tips
```python
# Enable debug logging
import os
os.environ["PRAISONAI_DEBUG"] = "true"

# Or programmatically
agent = Agent(name="DebugAgent", debug=True)
```

## Next Steps

1. Start with `workflow_example_basic.py` for understanding workflows
2. Explore `async_example.py` for performance improvements
3. Try `human_approval_example.py` for interactive applications
4. Experiment with `tools_example.py` for extending capabilities

## Additional Resources

- [Concepts Documentation](/docs/concepts)
- [API Reference](/docs/api/praisonaiagents)
- [Best Practices Guide](/docs/concepts/agents)
- [Advanced Patterns](/docs/features)