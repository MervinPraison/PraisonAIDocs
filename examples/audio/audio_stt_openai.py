"""
AudioAgent STT Example - OpenAI Whisper
Demonstrates Speech-to-Text using OpenAI's Whisper model.
"""
from praisonaiagents import AudioAgent

# Create agent with Whisper model
agent = AudioAgent(llm="openai/whisper-1")

# Transcribe audio file
text = agent.transcribe("audio.mp3")
print(f"Transcription: {text}")

# With language hint
text = agent.transcribe("spanish_audio.mp3", language="es")
print(f"Spanish transcription: {text}")

# Using convenience method
text = agent.listen("podcast.mp3")
print(f"Podcast: {text}")
