# pip install praisonaiagents
# ollama pull llama3.2

from praisonaiagents import Agent

agent = Agent(instructions="You are a helpful assistant", llm="ollama/llama3.2")

agent.start("Why is the sky blue?")