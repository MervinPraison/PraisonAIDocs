"""
OCRAgent Example - Mistral OCR
Demonstrates text extraction from documents and images.
"""
from praisonaiagents import OCRAgent

# Create agent with Mistral OCR
agent = OCRAgent(llm="mistral/mistral-ocr-latest")

# Extract text from PDF URL
result = agent.extract("https://arxiv.org/pdf/2201.04234")
for page in result.pages:
    print(f"Page {page.index}:")
    print(page.markdown[:200])  # First 200 chars
    print()

# Quick read - just get the text
text = agent.read("https://arxiv.org/pdf/2201.04234")
print(f"Total text length: {len(text)} characters")
