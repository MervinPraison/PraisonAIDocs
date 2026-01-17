"""
AudioAgent Example - Complete Workflow
Demonstrates TTS + STT roundtrip.
"""
from praisonaiagents import AudioAgent

# TTS: Generate speech
tts_agent = AudioAgent(llm="openai/tts-1")
tts_agent.speech(
    text="Hello! This audio will be transcribed back to text.",
    output="roundtrip.mp3"
)
print("Generated: roundtrip.mp3")

# STT: Transcribe back
stt_agent = AudioAgent(llm="openai/whisper-1")
text = stt_agent.transcribe("roundtrip.mp3")
print(f"Transcribed: {text}")
