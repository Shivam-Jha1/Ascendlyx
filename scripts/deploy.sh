#!/bin/bash

# Deployment script
set -e

echo "🚀 Deploying Ascendlyx Frontend..."

# Configuration
REGISTRY="your-docker-registry"
IMAGE_NAME="ascendlyx-frontend"
VERSION=$(cat package.json | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d ' ')

echo "📦 Building Docker image: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"

# Build Docker image
docker build -f docker/Dockerfile -t ${REGISTRY}/${IMAGE_NAME}:${VERSION} .
docker tag ${REGISTRY}/${IMAGE_NAME}:${VERSION} ${REGISTRY}/${IMAGE_NAME}:latest

# Push to registry
echo "📤 Pushing to Docker registry..."
docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}
docker push ${REGISTRY}/${IMAGE_NAME}:latest

echo "✅ Deployment completed!"
echo "🔗 Image: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
