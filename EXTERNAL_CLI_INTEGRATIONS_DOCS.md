# External CLI Integrations Documentation

This comprehensive documentation covers the new External CLI Integrations feature implemented in PR #1394, providing examples and use cases from the client perspective.

## Overview

PraisonAI now supports a robust external CLI integration system that enables seamless integration with external AI coding tools like Claude Code, Gemini CLI, OpenAI Codex CLI, Cursor CLI, and more. The system includes:

- **Registry Pattern**: Dynamic registration and discovery of external agents
- **Streaming Support**: Real-time streaming output from external CLI tools
- **Multiple Approval Modes**: Control levels for automatic code execution
- **Multi-Provider Support**: Support for different AI model providers
- **Backward Compatibility**: All existing APIs remain functional

## Core Components

### 1. ExternalAgentRegistry

A singleton registry for managing external CLI integrations with dynamic registration capabilities.

```python
from praisonai.integrations.registry import ExternalAgentRegistry

# Get singleton registry
registry = ExternalAgentRegistry.get_instance()

# Register custom integration
from praisonai.integrations import BaseCLIIntegration

class MyCustomAgent(BaseCLIIntegration):
    def __init__(self, workspace: str = ".", **kwargs):
        super().__init__(workspace=workspace, **kwargs)
    
    @property
    def cli_command(self) -> str:
        return "my-custom-cli"
    
    def _build_command(self, task: str, **options) -> list:
        return ["my-custom-cli", task]

# Register the custom agent
registry.register('my-agent', MyCustomAgent)

# Create integration instance
agent = registry.create('my-agent', workspace="/path/to/project")

# List all registered integrations
available_agents = await registry.get_available()
print(f"Available agents: {available_agents}")
```

### 2. Enhanced CodexCLI Integration

The CodexCLI integration now supports multiple approval modes and providers.

#### Approval Modes

- **suggest**: Default mode, suggests changes without applying them
- **auto-edit**: Automatically applies safe edits
- **full-auto**: Full autonomous mode with file modifications

```python
from praisonai.integrations import CodexCLIIntegration

# Suggest mode (default)
codex_suggest = CodexCLIIntegration(
    workspace="/path/to/project",
    approval_mode="suggest"
)

# Auto-edit mode for safe changes
codex_auto_edit = CodexCLIIntegration(
    workspace="/path/to/project",
    approval_mode="auto-edit"
)

# Full autonomous mode
codex_full_auto = CodexCLIIntegration(
    workspace="/path/to/project",
    approval_mode="full-auto",
    provider="openai"  # Optional provider selection
)

# Execute with different modes
result = await codex_suggest.execute("Review this code for potential bugs")
print(f"Suggestions: {result}")

result = await codex_auto_edit.execute("Fix obvious syntax errors")
print(f"Applied fixes: {result}")

result = await codex_full_auto.execute("Refactor the authentication module")
print(f"Refactoring result: {result}")
```

#### Multi-Provider Support

```python
# OpenAI Codex
codex_openai = CodexCLIIntegration(
    provider="openai",
    approval_mode="suggest"
)

# OpenRouter
codex_openrouter = CodexCLIIntegration(
    provider="openrouter",
    approval_mode="auto-edit"
)

# Azure OpenAI
codex_azure = CodexCLIIntegration(
    provider="azure",
    approval_mode="full-auto"
)

# Gemini
codex_gemini = CodexCLIIntegration(
    provider="gemini",
    approval_mode="suggest"
)

# Ollama (local)
codex_ollama = CodexCLIIntegration(
    provider="ollama",
    approval_mode="suggest"
)
```

### 3. Streaming Support

Real-time streaming output from external CLI tools for better user experience.

```python
# Python Streaming Example
async def stream_coding_task():
    codex = CodexCLIIntegration(
        workspace="/path/to/project",
        approval_mode="suggest",
        json_output=True  # Enable JSON streaming
    )
    
    async for event in codex.stream("Add error handling to the API endpoints"):
        event_type = event.get("type")
        
        if event_type == "item.completed":
            item = event.get("item", {})
            if item.get("type") == "agent_message":
                print(f"Agent: {item.get('text', '')}")
        elif event_type == "progress":
            print(f"Progress: {event.get('progress', 0)}%")
        elif event_type == "error":
            print(f"Error: {event.get('message', 'Unknown error')}")

# Run the streaming example
await stream_coding_task()
```

## TypeScript SDK Integration

The TypeScript SDK also supports streaming with external agents.

```typescript
import { ClaudeCodeAgent, GeminiCliAgent, CodexCliAgent } from './external-agents';

// Create external agents
const claudeAgent = new ClaudeCodeAgent('/path/to/project');
const geminiAgent = new GeminiCliAgent('/path/to/project', 'gemini-2.5-pro');
const codexAgent = new CodexCliAgent('/path/to/project');

// Execute with streaming
async function streamCodingTask() {
  try {
    const stream = claudeAgent.stream('Implement user authentication');
    
    for await (const event of stream) {
      switch (event.type) {
        case 'text':
          console.log(`Output: ${event.content}`);
          break;
        case 'json':
          console.log('Structured data:', event.data);
          break;
        case 'error':
          console.error('Error:', event.error);
          break;
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
  }
}

// Registry usage in TypeScript
import { getExternalAgentRegistry } from './external-agents';

const registry = getExternalAgentRegistry();

// Register custom agent
registry.register('custom-agent', (cwd?: string) => {
  return new CustomExternalAgent({
    name: 'custom-agent',
    command: 'my-custom-cli',
    cwd
  });
});

// Use registered agent
const agent = registry.get('custom-agent', '/project/path');
if (agent) {
  const result = await agent.execute('Analyze code quality');
  console.log(result);
}
```

## Practical Use Cases

### 1. Code Review Workflow

```python
from praisonai.integrations import ClaudeCodeIntegration, CodexCLIIntegration

async def comprehensive_code_review(project_path: str):
    # Claude for detailed review
    claude = ClaudeCodeIntegration(workspace=project_path)
    
    # Codex for automated fixes
    codex = CodexCLIIntegration(
        workspace=project_path,
        approval_mode="auto-edit"
    )
    
    # Step 1: Get review from Claude
    review_result = await claude.execute(
        "Review this codebase for security issues, performance problems, and code quality"
    )
    print("=== Claude Code Review ===")
    print(review_result)
    
    # Step 2: Apply automated fixes with Codex
    fix_result = await codex.execute(
        "Fix any obvious issues found in the code review, focusing on security and performance"
    )
    print("=== Automated Fixes Applied ===")
    print(fix_result)
    
    return {
        "review": review_result,
        "fixes": fix_result
    }

# Usage
result = await comprehensive_code_review("/path/to/my/project")
```

### 2. Multi-Agent Development Pipeline

```python
async def development_pipeline(feature_request: str, project_path: str):
    """
    Complete development pipeline using multiple external agents
    """
    
    # Step 1: Planning with Claude
    claude = ClaudeCodeIntegration(workspace=project_path)
    plan = await claude.execute(f"Create a detailed implementation plan for: {feature_request}")
    
    # Step 2: Implementation with Codex (suggest mode)
    codex = CodexCLIIntegration(
        workspace=project_path,
        approval_mode="suggest",
        provider="openai"
    )
    
    implementation = await codex.execute(f"Implement this feature: {feature_request}")
    
    # Step 3: Code refinement with Gemini
    gemini = GeminiCLIIntegration(workspace=project_path)
    refinement = await gemini.execute(
        "Review and optimize the implemented code for performance and maintainability"
    )
    
    # Step 4: Final validation with Cursor
    cursor = CursorCLIIntegration(workspace=project_path)
    validation = await cursor.execute("Validate the implementation and suggest any final improvements")
    
    return {
        "plan": plan,
        "implementation": implementation,
        "refinement": refinement,
        "validation": validation
    }

# Usage
pipeline_result = await development_pipeline(
    "Add real-time notifications to the user dashboard",
    "/path/to/dashboard/project"
)
```

### 3. Interactive Development Session

```python
from praisonai.integrations.registry import get_registry

async def interactive_coding_session():
    """
    Interactive session with multiple agents
    """
    registry = get_registry()
    available_agents = await registry.get_available_names()
    
    print(f"Available agents: {', '.join(available_agents)}")
    
    # Select agent interactively
    agent_name = input("Choose an agent: ")
    workspace = input("Enter project path: ")
    
    agent = registry.create(agent_name, workspace=workspace)
    if not agent:
        print(f"Agent {agent_name} not found")
        return
    
    print(f"Starting session with {agent_name}...")
    
    while True:
        task = input("\nEnter task (or 'quit' to exit): ")
        if task.lower() in ['quit', 'exit', 'q']:
            break
        
        if hasattr(agent, 'stream'):
            # Use streaming if available
            print("Streaming output:")
            async for event in agent.stream(task):
                if event.get("type") == "agent_message":
                    print(f"  {event.get('text', '')}")
        else:
            # Fallback to regular execution
            result = await agent.execute(task)
            print(f"Result:\n{result}")

# Usage
await interactive_coding_session()
```

### 4. Automated Testing and QA

```python
async def automated_qa_pipeline(project_path: str):
    """
    Automated quality assurance using external agents
    """
    
    # Test generation with Claude
    claude = ClaudeCodeIntegration(workspace=project_path)
    test_plan = await claude.execute(
        "Analyze the codebase and generate comprehensive unit tests"
    )
    
    # Code analysis with Codex
    codex = CodexCLIIntegration(
        workspace=project_path,
        approval_mode="suggest",
        json_output=True
    )
    
    analysis_results = []
    async for event in codex.stream("Perform static code analysis and identify potential issues"):
        if event.get("type") == "item.completed":
            item = event.get("item", {})
            if item.get("type") == "agent_message":
                analysis_results.append(item.get("text", ""))
    
    # Performance optimization with Gemini
    gemini = GeminiCLIIntegration(workspace=project_path)
    optimization = await gemini.execute(
        "Identify performance bottlenecks and suggest optimizations"
    )
    
    return {
        "test_plan": test_plan,
        "code_analysis": "\n".join(analysis_results),
        "optimization_suggestions": optimization
    }

# Usage
qa_results = await automated_qa_pipeline("/path/to/project")
print("QA Pipeline Results:")
for key, value in qa_results.items():
    print(f"\n{key.upper()}:")
    print(value)
```

### 5. Custom Integration Example

```python
from praisonai.integrations import BaseCLIIntegration
from praisonai.integrations.registry import register_integration

class CustomAIAssistant(BaseCLIIntegration):
    """Custom integration for a hypothetical AI assistant CLI"""
    
    def __init__(self, workspace: str = ".", model: str = "gpt-4", **kwargs):
        super().__init__(workspace=workspace, **kwargs)
        self.model = model
    
    @property
    def cli_command(self) -> str:
        return "ai-assistant"
    
    def _build_command(self, task: str, **options) -> list:
        cmd = ["ai-assistant", "--model", self.model, "--workspace", self.workspace]
        
        # Add task
        cmd.extend(["--task", task])
        
        # Add any additional options
        for key, value in options.items():
            cmd.extend([f"--{key}", str(value)])
        
        return cmd
    
    async def execute(self, prompt: str, **options) -> str:
        """Execute the custom AI assistant"""
        cmd = self._build_command(prompt, **options)
        return await self.execute_async(cmd)

# Register the custom integration
register_integration('custom-ai', CustomAIAssistant)

# Usage
from praisonai.integrations.registry import create_integration

custom_agent = create_integration('custom-ai', workspace="/my/project", model="gpt-4-turbo")
if custom_agent:
    result = await custom_agent.execute("Refactor the authentication system")
    print(result)
```

## Configuration Examples

### Environment Variables

```bash
# Codex CLI configuration
export OPENAI_API_KEY="your-openai-api-key"
export CODEX_PROVIDER="openai"
export CODEX_APPROVAL_MODE="suggest"

# Claude Code configuration
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# Gemini CLI configuration
export GOOGLE_AI_API_KEY="your-google-ai-api-key"
```

### Configuration File

```python
# config.py
EXTERNAL_AGENTS_CONFIG = {
    "codex": {
        "approval_mode": "auto-edit",
        "provider": "openai",
        "sandbox": "default",
        "timeout": 600
    },
    "claude": {
        "timeout": 300,
        "session_management": True
    },
    "gemini": {
        "model": "gemini-2.5-pro",
        "timeout": 300
    },
    "cursor": {
        "timeout": 300,
        "workspace_integration": True
    }
}

# Usage with configuration
from praisonai.integrations import CodexCLIIntegration

config = EXTERNAL_AGENTS_CONFIG["codex"]
codex = CodexCLIIntegration(
    workspace="/path/to/project",
    **config
)
```

## Error Handling and Best Practices

### Error Handling

```python
from praisonai.integrations import CodexCLIIntegration
from praisonai.integrations.base import CLIIntegrationError

async def robust_execution(task: str, workspace: str):
    """Robust execution with proper error handling"""
    
    codex = CodexCLIIntegration(workspace=workspace, approval_mode="suggest")
    
    try:
        # Check availability first
        if not await codex.is_available():
            raise CLIIntegrationError("Codex CLI is not available")
        
        # Execute with timeout
        result = await codex.execute(task, timeout=300)
        return result
        
    except CLIIntegrationError as e:
        print(f"CLI Integration Error: {e}")
        return None
    except TimeoutError:
        print("Operation timed out")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

# Usage
result = await robust_execution("Analyze code complexity", "/my/project")
if result:
    print("Analysis successful:", result)
else:
    print("Analysis failed")
```

### Best Practices

1. **Always check availability** before executing:
```python
agent = CodexCLIIntegration(workspace="/project")
if await agent.is_available():
    result = await agent.execute("task")
```

2. **Use appropriate approval modes**:
- `suggest` for code review and analysis
- `auto-edit` for safe automated fixes
- `full-auto` only in controlled environments

3. **Implement proper timeout handling**:
```python
agent = CodexCLIIntegration(workspace="/project", timeout=300)  # 5 minutes
```

4. **Use streaming for long-running tasks**:
```python
async for event in agent.stream("complex task"):
    # Process events in real-time
    pass
```

5. **Register custom integrations at startup**:
```python
# In your application startup
from praisonai.integrations.registry import register_integration

register_integration('my-custom-agent', MyCustomAgentClass)
```

## Integration with PraisonAI Agents

External CLI integrations can be used as tools within PraisonAI agents:

```python
from praisonaiagents import Agent
from praisonai.integrations import CodexCLIIntegration

# Create external CLI integration
codex = CodexCLIIntegration(workspace="/project", approval_mode="suggest")

# Create agent with external tool
agent = Agent(
    name="Development Assistant",
    instructions="You are a senior developer assistant. Use the Codex CLI tool for code analysis and suggestions.",
    tools=[codex.as_tool()]
)

# Use the agent
result = await agent.execute("Analyze the authentication module for security vulnerabilities")
print(result)
```

## Backward Compatibility

All existing APIs remain functional:

```python
# Old API still works
from praisonai.integrations import get_available_integrations

available = get_available_integrations()  # Returns dict synchronously

# New registry API
from praisonai.integrations.registry import get_registry

registry = get_registry()
available_new = await registry.get_available()  # Returns dict asynchronously
```

## Troubleshooting

### Common Issues

1. **CLI not found**: Ensure the external CLI tool is installed and in PATH
2. **Permission denied**: Check file permissions and approval mode settings
3. **Timeout errors**: Increase timeout or use streaming for long tasks
4. **Provider errors**: Verify API keys and provider configuration

### Debug Mode

```python
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

# Create integration with debug info
codex = CodexCLIIntegration(workspace="/project", approval_mode="suggest")

# Debug information will be logged during execution
result = await codex.execute("debug task")
```

## Migration Guide

### From Legacy Integrations

```python
# Old way
from praisonai.integrations import CodexCLIIntegration

codex = CodexCLIIntegration(full_auto=True)  # Deprecated parameter

# New way
codex = CodexCLIIntegration(approval_mode="full-auto")  # New parameter

# Both work due to backward compatibility
```

### Registry Migration

```python
# Old manual instantiation
from praisonai.integrations import ClaudeCodeIntegration

claude = ClaudeCodeIntegration(workspace="/project")

# New registry-based approach
from praisonai.integrations.registry import create_integration

claude = create_integration('claude', workspace="/project")
```