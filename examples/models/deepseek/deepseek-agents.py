# pip install praisonaiagents
# ollama pull deepseek-r1

from praisonaiagents import Agent

agent = Agent(instructions="You are a helpful assistant", llm="ollama/deepseek-r1")

agent.start("Why is the sky blue?")