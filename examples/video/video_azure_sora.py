"""
VideoAgent Example - Azure Sora
Demonstrates video generation using Azure-hosted Sora.
"""
import os
from praisonaiagents import VideoAgent

# Set Azure credentials
# os.environ["AZURE_API_KEY"] = "your-key"
# os.environ["AZURE_API_BASE"] = "https://your-resource.openai.azure.com"

# Create agent with Azure Sora
agent = VideoAgent(llm="azure/sora-2")

# Generate video
video = agent.start(
    prompt="A beautiful mountain landscape with clouds",
    seconds="4",
    wait=True,
    output="mountain.mp4"
)
print("Video saved to mountain.mp4")
