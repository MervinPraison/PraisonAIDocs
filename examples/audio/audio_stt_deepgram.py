"""
AudioAgent STT Example - Deepgram
Demonstrates Speech-to-Text using Deepgram's Nova-2.
"""
import os
from praisonaiagents import AudioAgent

# Set API key (or use environment variable)
# os.environ["DEEPGRAM_API_KEY"] = "your-key"

# Create agent with Deepgram model
agent = AudioAgent(llm="deepgram/nova-2")

# Transcribe audio file
text = agent.transcribe("audio.mp3")
print(f"Transcription: {text}")

# Deepgram excels at real-time streaming and domain-specific recognition
