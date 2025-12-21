#!/bin/bash

# VibeBase - Linux (Debian/Ubuntu) Release Build Script

set -e

echo "🚀 Building Linux (Debian/Ubuntu) version..."

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from project root directory"
    exit 1
fi

# Check dependencies
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm not found, please install Node.js first"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Error: cargo not found, please install Rust first"
    exit 1
fi

# Check system dependencies
echo "🔍 Checking system dependencies..."
MISSING_DEPS=()

if ! dpkg -l | grep -q "libwebkit2gtk-4.0-dev"; then
    MISSING_DEPS+=("libwebkit2gtk-4.0-dev")
fi

if ! dpkg -l | grep -q "build-essential"; then
    MISSING_DEPS+=("build-essential")
fi

if ! dpkg -l | grep -q "libssl-dev"; then
    MISSING_DEPS+=("libssl-dev")
fi

if ! dpkg -l | grep -q "libgtk-3-dev"; then
    MISSING_DEPS+=("libgtk-3-dev")
fi

if ! dpkg -l | grep -q "libayatana-appindicator3-dev"; then
    MISSING_DEPS+=("libayatana-appindicator3-dev")
fi

if ! dpkg -l | grep -q "librsvg2-dev"; then
    MISSING_DEPS+=("librsvg2-dev")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo "⚠️  Missing system dependencies:"
    printf '%s\n' "${MISSING_DEPS[@]}"
    echo ""
    echo "Please run the following commands to install:"
    echo "sudo apt-get update"
    echo "sudo apt-get install -y ${MISSING_DEPS[*]}"
    echo ""
    read -p "Continue building anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building frontend..."
npm run build

echo "🔧 Building Tauri app..."
cd src-tauri
cargo build --release
cd ..

echo "📦 Packaging DEB package..."
npm run tauri build

echo "✅ Build completed!"
echo "📂 Output location: src-tauri/target/release/bundle/deb/"
echo ""
echo "Generated files:"
ls -lh src-tauri/target/release/bundle/deb/*.deb 2>/dev/null || echo "DEB files not found"

echo ""
echo "💡 Installation instructions:"
echo "   sudo dpkg -i src-tauri/target/release/bundle/deb/*.deb"
echo ""
echo "If dependency issues occur, run:"
echo "   sudo apt-get install -f"

