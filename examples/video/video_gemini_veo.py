"""
VideoAgent Example - Gemini Veo
Demonstrates video generation using Google's Veo models.
"""
import os
from praisonaiagents import VideoAgent

# Set API key (or use environment variable)
# os.environ["GOOGLE_API_KEY"] = "your-key"

# Create agent with Gemini Veo model
agent = VideoAgent(llm="gemini/veo-3.0-generate-preview")

# Generate video
video = agent.generate(
    prompt="Ocean waves crashing on a beach at sunrise"
)
print(f"Video ID: {video.id}")
print(f"Status: {video.status}")

# Wait for completion and save
completed = agent.wait_for_completion(video.id)
if completed.status == "completed":
    agent.download(video.id, "ocean.mp4")
    print("Video saved to ocean.mp4")
