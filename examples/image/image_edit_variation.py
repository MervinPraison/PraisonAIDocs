"""
ImageAgent Example - Edit and Variation
Demonstrates image editing and variation generation.
"""
from praisonaiagents import ImageAgent

# Create agent
agent = ImageAgent(llm="openai/dall-e-2")

# Edit an existing image
result = agent.edit(
    image="photo.png",
    prompt="Add a beautiful sunset in the background"
)
print(f"Edited image: {result}")

# Generate variations of an image
variations = agent.variation(
    image="original.png",
    n=3  # Generate 3 variations
)
print(f"Generated {len(variations.data)} variations")
