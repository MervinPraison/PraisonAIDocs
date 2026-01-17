"""
VideoAgent Example - RunwayML Gen-4
Demonstrates image-to-video generation using RunwayML.
"""
import os
from praisonaiagents import VideoAgent

# Set API key (or use environment variable)
# os.environ["RUNWAYML_API_KEY"] = "your-key"

# Create agent with RunwayML model
agent = VideoAgent(llm="runwayml/gen4_turbo")

# RunwayML requires an input image
video = agent.generate(
    prompt="Make this landscape come alive with motion",
    input_reference="./landscape.jpg",  # Required for RunwayML
    seconds="5"  # 5 or 10 seconds
)
print(f"Video ID: {video.id}")
print(f"Status: {video.status}")

# Wait and download
video = agent.start(
    prompt="Add gentle wind to the trees",
    input_reference="./forest.jpg",
    wait=True,
    output="animated_forest.mp4"
)
print("Video saved to animated_forest.mp4")
