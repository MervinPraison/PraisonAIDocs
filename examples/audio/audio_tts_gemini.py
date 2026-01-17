"""
AudioAgent TTS Example - Gemini
Demonstrates Text-to-Speech using Google's Gemini TTS.
"""
import os
from praisonaiagents import AudioAgent

# Set API key (or use environment variable)
# os.environ["GOOGLE_API_KEY"] = "your-key"

# Create agent with Gemini TTS model
agent = AudioAgent(llm="gemini/gemini-2.5-flash-preview-tts")

# Generate speech
agent.speech(
    text="Hello! This is Google's Gemini text-to-speech.",
    output="gemini_speech.mp3"
)

print("Audio saved to gemini_speech.mp3")
