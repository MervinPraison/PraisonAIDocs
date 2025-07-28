# Agent Examples

This directory contains various examples demonstrating different types of agents and their capabilities in PraisonAI.

## Overview

Each example showcases specific agent types and use cases, from simple single agents to complex multi-provider configurations. All examples are designed to be self-contained and runnable with minimal setup.

## Prerequisites

```bash
pip install praisonaiagents
```

Set up your API keys:
```bash
export OPENAI_API_KEY="your-api-key"
# Additional API keys may be required for specific examples
```

## Examples

### Basic Agents

#### single-agent.py
A simple example demonstrating a basic agent setup.
```bash
python single-agent.py
```

### Specialized Agents

#### code-agent.py
An agent specialized in writing and analyzing code.
- Features: Code generation, debugging, refactoring
- Use case: Automated programming assistance

#### data-analyst-agent.py
Agent for data analysis and insights.
- Features: Data processing, statistical analysis, visualization
- Use case: Business intelligence and reporting

#### finance-agent.py
Financial analysis and advisory agent.
- Features: Market analysis, portfolio recommendations, financial calculations
- Use case: Investment research and financial planning

#### math-agent.py
Agent specialized in mathematical computations and problem-solving.
- Features: Complex calculations, equation solving, mathematical proofs
- Use case: Educational support, research assistance

### Media Processing Agents

#### image-agent.py
Agent for image generation and manipulation.
- Features: Image creation, editing, style transfer
- Use case: Creative content generation

#### image-to-text-agent.py
Converts images to descriptive text.
- Features: OCR, image captioning, visual analysis
- Use case: Accessibility, content extraction

#### video-agent.py
Video processing and analysis agent.
- Features: Video summarization, scene detection, content analysis
- Use case: Media processing, content moderation

### Research and Information Agents

#### research-agent.py
Comprehensive research assistant.
- Features: Literature review, fact-checking, citation management
- Use case: Academic research, market research

#### websearch-agent.py
Web search and information retrieval agent.
- Features: Web scraping, search optimization, result summarization
- Use case: Information gathering, competitive analysis

#### wikipedia-agent.py
Wikipedia-focused research agent.
- Features: Article search, fact extraction, cross-referencing
- Use case: Quick fact-checking, educational content

#### searxng-agent.py
Privacy-focused search using SearXNG.
- Features: Anonymous searching, multiple search engines, result aggregation
- Use case: Privacy-conscious research

### Task-Specific Agents

#### planning-agent.py
Strategic planning and project management agent.
- Features: Task breakdown, timeline creation, resource allocation
- Use case: Project planning, strategic development

#### programming-agent.py
Advanced programming assistant.
- Features: Full-stack development, architecture design, code review
- Use case: Software development, technical documentation

#### shopping-agent.py
E-commerce and shopping assistant.
- Features: Price comparison, product recommendations, deal finding
- Use case: Online shopping assistance, procurement

#### recommendation-agent.py
Personalized recommendation engine.
- Features: Content filtering, collaborative filtering, preference learning
- Use case: Content curation, product recommendations

#### markdown-agent.py
Markdown formatting and documentation agent.
- Features: Document formatting, conversion, template generation
- Use case: Documentation, content creation

### Advanced Configurations

#### multi-provider-agent.py
Demonstrates using multiple LLM providers in a single workflow.
- Features: Provider failover, cost optimization, model selection
- See [MULTI_PROVIDER_README.md](MULTI_PROVIDER_README.md) for detailed setup

#### router-agent-cost-optimization.py
Intelligent routing between different models based on cost and performance.
- Features: Dynamic model selection, cost tracking, performance optimization
- Use case: Enterprise deployments with budget constraints

## Common Patterns

### Basic Agent Setup
```python
from praisonaiagents import Agent

agent = Agent(
    name="MyAgent",
    instructions="You are a helpful assistant",
    llm_model="gpt-4"
)

result = agent.run("Your task here")
print(result)
```

### Agent with Tools
```python
from praisonaiagents import Agent, Tools

agent = Agent(
    name="ToolAgent",
    instructions="You are an agent with access to tools",
    tools=[Tools.web_search, Tools.calculator]
)
```

### Multi-Agent Collaboration
```python
from praisonaiagents import Agent, PraisonAIAgents

agent1 = Agent(name="Researcher", instructions="Research the topic")
agent2 = Agent(name="Writer", instructions="Write based on research")

agents = PraisonAIAgents(agents=[agent1, agent2])
agents.start()
```

## Best Practices

1. **Clear Instructions**: Provide specific, clear instructions to agents
2. **Appropriate Models**: Choose the right model for the task complexity
3. **Error Handling**: Implement proper error handling for production use
4. **API Key Management**: Use environment variables for API keys
5. **Resource Monitoring**: Monitor token usage and costs

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure all required API keys are set
2. **Import Errors**: Verify PraisonAI is installed correctly
3. **Model Access**: Check if you have access to the specified models
4. **Rate Limits**: Implement retry logic for rate-limited APIs

### Debug Mode
Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Contributing

To add new agent examples:
1. Create a descriptive filename (e.g., `translation-agent.py`)
2. Include comprehensive comments
3. Add error handling
4. Update this README with the new example

## Additional Resources

- [Agent Documentation](/docs/agents/agents)
- [API Reference](/docs/api/praisonaiagents/agent/agent)
- [Best Practices Guide](/docs/concepts/agents)
- [Tool Integration](/docs/tools/tools)