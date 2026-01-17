"""
AudioAgent TTS Example - OpenAI
Demonstrates Text-to-Speech using OpenAI's TTS models.
"""
from praisonaiagents import AudioAgent

# Create agent with OpenAI TTS model
agent = AudioAgent(llm="openai/tts-1")

# Generate speech and save to file
agent.speech(
    text="Hello! This is a demonstration of PraisonAI's AudioAgent.",
    output="hello.mp3"
)

print("Audio saved to hello.mp3")

# With custom voice
agent.speech(
    text="This uses the Nova voice.",
    voice="nova",
    output="nova_voice.mp3"
)

# Using the convenience method
agent.say("Quick speech generation!", output="quick.mp3")

# NEW: gpt-4o-mini-tts (latest model)
agent_mini = AudioAgent(llm="openai/gpt-4o-mini-tts")
agent_mini.speech("This uses the new GPT-4o mini TTS.", output="mini_tts.mp3")
