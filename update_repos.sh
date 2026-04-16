#!/bin/bash

echo "🔄 Updating repositories..."

# Create temporary directory
mkdir -p temp_update_praisonai

# Clone PraisonAI to temp location with sparse checkout
echo "📥 Fetching latest PraisonAI folders..."
git clone --filter=blob:none --no-checkout https://github.com/MervinPraison/PraisonAI.git temp_update_praisonai
cd temp_update_praisonai
git sparse-checkout init --cone
git sparse-checkout set src/praisonai-agents/praisonaiagents src/praisonai/praisonai examples/python
git checkout main
cd ..

# Update praisonaiagents files
echo "📦 Updating praisonaiagents files..."
rm -rf praisonaiagents
cp -r temp_update_praisonai/src/praisonai-agents/praisonaiagents praisonaiagents

# Update praisonai (wrapper) package
echo "📦 Updating praisonai files..."
rm -rf praisonai
cp -r temp_update_praisonai/src/praisonai/praisonai praisonai

# Update examples files
echo "📦 Updating examples files..."
rm -rf examples
cp -r temp_update_praisonai/examples/python examples

# Clean up temporary directory
echo "🗑️ Cleaning up temporary files..."
rm -rf temp_update_praisonai

echo "✅ All repositories updated!" 