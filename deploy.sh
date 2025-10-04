#!/bin/bash

# Deployment script for Deceptive Domain Checker
# This script handles the complete deployment process

set -e

echo "🚀 Starting deployment of Deceptive Domain Checker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}❌ Please configure .env file with your credentials and run again.${NC}"
    exit 1
fi

# Source environment variables
source .env

# Validate required environment variables
echo "📋 Validating environment variables..."
REQUIRED_VARS=("KEITARO_API_URL" "KEITARO_API_KEY" "TELEGRAM_BOT_TOKEN" "TELEGRAM_CHAT_ID")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo -e "${GREEN}✓ Environment validation passed${NC}"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start containers
echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo "🚀 Starting containers..."
docker-compose up -d

# Wait for service to be healthy
echo "⏳ Waiting for service to be healthy..."
sleep 10

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo -e "${GREEN}✅ Service is healthy and running!${NC}"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Checking health... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Service failed to become healthy${NC}"
    echo "Showing logs:"
    docker-compose logs --tail=50
    exit 1
fi

# Show service info
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""
echo "🌐 Service URL: http://localhost:${PORT:-3000}"
echo "🏥 Health Check: http://localhost:${PORT:-3000}/health"
echo ""
echo "📝 Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Stop service:     docker-compose stop"
echo "  Restart service:  docker-compose restart"
echo "  Remove service:   docker-compose down"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
