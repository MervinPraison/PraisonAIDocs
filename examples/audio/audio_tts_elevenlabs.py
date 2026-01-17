"""
AudioAgent TTS Example - ElevenLabs
Demonstrates Text-to-Speech using ElevenLabs premium voices.
"""
import os
from praisonaiagents import AudioAgent

# Set API key (or use environment variable)
# os.environ["ELEVEN_API_KEY"] = "your-key"

# Create agent with ElevenLabs model
agent = AudioAgent(llm="elevenlabs/eleven_multilingual_v2")

# Generate speech
agent.speech(
    text="Hello! This is ElevenLabs' natural-sounding voice.",
    output="elevenlabs_voice.mp3"
)

print("Audio saved to elevenlabs_voice.mp3")
