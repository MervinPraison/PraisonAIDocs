"""
VideoAgent Example - OpenAI Sora
Demonstrates video generation using OpenAI's Sora-2 model.
"""
import os
from praisonaiagents import VideoAgent

# Set API key (or use environment variable)
# os.environ["OPENAI_API_KEY"] = "your-key"

# Create agent with Sora model
agent = VideoAgent(llm="openai/sora-2")

# Generate video (returns immediately with job ID)
video = agent.generate(
    prompt="A cat playing with a ball of yarn in sunshine",
    seconds="4"  # 4, 8, or 12 seconds
)
print(f"Video ID: {video.id}")
print(f"Status: {video.status}")

# Full workflow: generate, wait, and save
video = agent.start(
    prompt="A serene lake at sunset with gentle ripples",
    wait=True,        # Wait for completion
    output="lake.mp4" # Save to file
)
print("Video saved to lake.mp4")
