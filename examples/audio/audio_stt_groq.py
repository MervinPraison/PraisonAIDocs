"""
AudioAgent STT Example - Groq Whisper
Demonstrates ultra-fast Speech-to-Text using Groq's Whisper.

Models available:
- groq/whisper-large-v3 (default, best quality)
- groq/whisper-large-v3-turbo (faster)
- groq/distil-whisper-large-v3-en (English only, fastest)
"""
import os
from praisonaiagents import AudioAgent

# Set API key (or use environment variable)
# os.environ["GROQ_API_KEY"] = "your-key"

# Create agent with Groq Whisper model
agent = AudioAgent(llm="groq/whisper-large-v3", verbose=True)

# Transcribe audio file (ultra-fast!)
text = agent.transcribe("audio.mp3")
print(f"Transcription: {text}")

# Groq offers the fastest Whisper inference available
