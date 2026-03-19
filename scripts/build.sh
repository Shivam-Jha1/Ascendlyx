#!/bin/bash

# Build script with environment handling
set -e

echo "🔨 Building Ascendlyx Frontend..."

# Load environment
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the Angular app with production configuration
echo "🏗️  Building production bundle..."
npm run build -- --configuration production

# Verify the build
if [ ! -d "dist/frontend/browser" ]; then
    echo "❌ Build failed! dist folder not found."
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📂 Output: dist/frontend/browser"
