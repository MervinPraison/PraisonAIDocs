# Hooks System

The Hooks System provides a powerful way to intercept, monitor, and modify agent behavior at various lifecycle points. Unlike callbacks (which are for UI events), hooks can **intercept and modify** tool execution, block dangerous operations, and add custom logic.

## Overview

Hooks allow you to:

- **Log** all tool calls for auditing
- **Block** dangerous operations based on policy
- **Modify** tool inputs before execution
- **Add context** to agent responses
- **Monitor** session lifecycle events

## Quick Start

```python
from praisonaiagents import Agent
from praisonaiagents.hooks import (
    HookRegistry, HookRunner, HookEvent, HookResult,
    BeforeToolInput
)

# Create a hook registry
registry = HookRegistry()

# Register a hook using decorator
@registry.on(HookEvent.BEFORE_TOOL)
def log_tool_calls(event_data: BeforeToolInput) -> HookResult:
    print(f"Tool called: {event_data.tool_name}")
    return HookResult.allow()

# Block dangerous operations
@registry.on(HookEvent.BEFORE_TOOL)
def block_deletes(event_data: BeforeToolInput) -> HookResult:
    if "delete" in event_data.tool_name.lower():
        return HookResult.deny("Delete operations are blocked")
    return HookResult.allow()
```

## Hook Events

| Event | Description | Input Type |
|-------|-------------|------------|
| `BEFORE_TOOL` | Before a tool is executed | `BeforeToolInput` |
| `AFTER_TOOL` | After a tool completes | `AfterToolInput` |
| `BEFORE_AGENT` | Before agent processes a prompt | `BeforeAgentInput` |
| `AFTER_AGENT` | After agent generates response | `AfterAgentInput` |
| `SESSION_START` | When a session begins | `SessionStartInput` |
| `SESSION_END` | When a session ends | `SessionEndInput` |
| `BEFORE_LLM` | Before LLM API call | `BeforeLLMInput` |
| `AFTER_LLM` | After LLM API response | `AfterLLMInput` |
| `ON_ERROR` | When an error occurs | `OnErrorInput` |
| `ON_RETRY` | Before a retry attempt | `OnRetryInput` |

## Hook Results

Hooks return a `HookResult` that determines what happens next:

```python
# Allow execution to continue
HookResult.allow()
HookResult.allow("Optional reason")

# Deny/block execution
HookResult.deny("Reason for denial")
HookResult.block("Reason for blocking")

# Request user confirmation
HookResult.ask("Please confirm this operation")
```

## Registration Methods

### Decorator Registration

```python
@registry.on(HookEvent.BEFORE_TOOL)
def my_hook(event_data):
    return HookResult.allow()
```

### Function Registration

```python
def my_hook(event_data):
    return HookResult.allow()

registry.register_function(
    event=HookEvent.BEFORE_TOOL,
    func=my_hook,
    name="my_hook",
    timeout=30.0
)
```

### Command Hook Registration

```python
registry.register_command(
    event=HookEvent.BEFORE_TOOL,
    command="python /path/to/validator.py",
    name="external_validator",
    timeout=60.0,
    env={"API_KEY": "secret"}
)
```

## Matchers

Filter hooks to only run for specific targets:

```python
# Only match tools starting with "write_"
@registry.on(HookEvent.BEFORE_TOOL, matcher="write_.*")
def write_hook(event_data):
    return HookResult.allow()

# Match multiple patterns
@registry.on(HookEvent.BEFORE_TOOL, matcher="delete_.*|remove_.*")
def delete_hook(event_data):
    return HookResult.deny("Dangerous operation blocked")
```

## Sequential vs Parallel Execution

```python
# Parallel execution (default) - all hooks run simultaneously
@registry.on(HookEvent.BEFORE_TOOL, sequential=False)
def parallel_hook(event_data):
    return HookResult.allow()

# Sequential execution - hooks run one after another
# Later hooks can see modifications from earlier hooks
@registry.on(HookEvent.BEFORE_TOOL, sequential=True)
def sequential_hook(event_data):
    return HookResult.allow()
```

## Command Hooks

Command hooks execute external shell commands and parse their output:

```python
registry.register_command(
    event=HookEvent.BEFORE_TOOL,
    command="python /path/to/policy_checker.py",
    timeout=30.0
)
```

The command receives JSON input via stdin and should output JSON:

```json
{
  "decision": "allow",
  "reason": "Operation permitted"
}
```

Exit codes:
- `0`: Success (allow)
- `1`: Non-blocking error (allow with warning)
- `2`: Blocking error (deny)

## Event Input Types

### BeforeToolInput

```python
@dataclass
class BeforeToolInput(HookInput):
    tool_name: str
    tool_input: Dict[str, Any]
    tool_description: Optional[str]
```

### AfterToolInput

```python
@dataclass
class AfterToolInput(HookInput):
    tool_name: str
    tool_input: Dict[str, Any]
    tool_output: Any
    tool_error: Optional[str]
    execution_time_ms: float
```

### BeforeAgentInput

```python
@dataclass
class BeforeAgentInput(HookInput):
    prompt: str
    conversation_history: List[Dict[str, Any]]
    tools_available: List[str]
```

## Complete Example

```python
import asyncio
from praisonaiagents.hooks import (
    HookRegistry, HookRunner, HookEvent, HookResult,
    BeforeToolInput, AfterToolInput
)

# Create registry
registry = HookRegistry()

# Hook 1: Audit logging
@registry.on(HookEvent.BEFORE_TOOL)
def audit_log(event_data: BeforeToolInput) -> HookResult:
    print(f"[AUDIT] Tool: {event_data.tool_name}")
    print(f"[AUDIT] Input: {event_data.tool_input}")
    return HookResult.allow()

# Hook 2: Security policy
@registry.on(HookEvent.BEFORE_TOOL)
def security_check(event_data: BeforeToolInput) -> HookResult:
    blocked_tools = ['delete_file', 'rm', 'drop_table']
    if event_data.tool_name in blocked_tools:
        return HookResult.deny(f"Tool '{event_data.tool_name}' is blocked")
    return HookResult.allow()

# Hook 3: Performance monitoring
@registry.on(HookEvent.AFTER_TOOL)
def perf_monitor(event_data: AfterToolInput) -> HookResult:
    if event_data.execution_time_ms > 5000:
        print(f"[WARN] Slow tool: {event_data.tool_name} took {event_data.execution_time_ms}ms")
    return HookResult.allow()

# Execute hooks
runner = HookRunner(registry)

input_data = BeforeToolInput(
    session_id="session-123",
    cwd="/workspace",
    event_name="before_tool",
    timestamp="2024-01-01T00:00:00",
    tool_name="read_file",
    tool_input={"path": "/tmp/data.txt"}
)

results = asyncio.run(runner.execute(HookEvent.BEFORE_TOOL, input_data))

# Check if blocked
if HookRunner.is_blocked(results):
    print(f"Blocked: {HookRunner.get_blocking_reason(results)}")
else:
    print("Allowed to proceed")
```

## CLI Commands

```bash
# List registered hooks
praisonai hooks list

# Test hooks for an event
praisonai hooks test before_tool read_file

# Validate a hooks configuration file
praisonai hooks validate hooks.json

# Run a command hook manually
praisonai hooks run "echo '{\"decision\": \"allow\"}'"

# Load hooks from configuration
praisonai hooks load hooks.yaml
```

## Configuration File Format

```yaml
# hooks.yaml
enabled: true
hooks:
  - event: before_tool
    name: security_check
    command: python /path/to/security.py
    timeout: 30
    matcher: ".*"
    
  - event: after_tool
    name: audit_log
    command: python /path/to/audit.py
    timeout: 10
```

## Best Practices

1. **Keep hooks fast** - Hooks run synchronously and can slow down agent execution
2. **Use matchers** - Filter hooks to only relevant tools to reduce overhead
3. **Handle errors gracefully** - Return `HookResult.allow()` on non-critical errors
4. **Use sequential mode sparingly** - Only when hooks need to see each other's modifications
5. **Set appropriate timeouts** - Prevent hung hooks from blocking execution
6. **Log decisions** - Include reasons in deny/block results for debugging

## Performance

The hooks system is designed for zero performance impact when not in use:

- **Lazy loading**: All imports via `__getattr__`
- **No overhead**: When no hooks registered, execution is instant
- **Parallel execution**: Multiple hooks run concurrently by default
- **Timeout protection**: Hung hooks are automatically terminated
