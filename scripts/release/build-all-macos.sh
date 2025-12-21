#!/bin/bash

# VibeBase - macOS Universal Build Script (builds both M Chip and Intel versions)

set -e

echo "🚀 Building all macOS versions..."
echo ""

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from project root directory"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================"
echo "  Build 1/2: Apple Silicon (M Chip)"
echo "================================"
bash "$SCRIPT_DIR/build-macos-m-chip.sh"

echo ""
echo "================================"
echo "  Build 2/2: Intel Chip"
echo "================================"
bash "$SCRIPT_DIR/build-macos-intel.sh"

echo ""
echo "✅ All macOS builds completed!"
echo ""
echo "📂 Output locations:"
echo "   - Apple Silicon: src-tauri/target/aarch64-apple-darwin/release/bundle/"
echo "   - Intel:         src-tauri/target/x86_64-apple-darwin/release/bundle/"
echo ""
echo "📦 To create a Universal Binary:"
echo "   lipo -create \\"
echo "     src-tauri/target/aarch64-apple-darwin/release/VibeBase \\"
echo "     src-tauri/target/x86_64-apple-darwin/release/VibeBase \\"
echo "     -output VibeBase-universal"

