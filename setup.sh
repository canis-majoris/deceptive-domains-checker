#!/bin/bash

# Setup script for initial project configuration
# This script helps configure the project interactively

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Deceptive Domain Checker - Setup Wizard             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to reconfigure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Create .env from template
cp .env.example .env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Keitaro Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Enter Keitaro API URL (e.g., https://your-instance.com/admin_api/v1): " KEITARO_API_URL
read -p "Enter Keitaro API Key: " KEITARO_API_KEY

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Telegram Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Need help? Visit: https://t.me/botfather"
read -p "Enter Telegram Bot Token: " TELEGRAM_BOT_TOKEN
read -p "Enter Telegram Chat ID: " TELEGRAM_CHAT_ID

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Optional Settings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Check interval in minutes (default: 30): " CHECK_INTERVAL
CHECK_INTERVAL=${CHECK_INTERVAL:-30}

read -p "Max concurrent checks (default: 10): " MAX_CONCURRENT
MAX_CONCURRENT=${MAX_CONCURRENT:-10}

read -p "Server port (default: 3000): " PORT
PORT=${PORT:-3000}

# Write to .env file
cat > .env << EOF
# Server Configuration
PORT=${PORT}
NODE_ENV=production

# Keitaro API Configuration
KEITARO_API_URL=${KEITARO_API_URL}
KEITARO_API_KEY=${KEITARO_API_KEY}

# Telegram Configuration
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}

# Scheduler Configuration
CHECK_INTERVAL_MINUTES=${CHECK_INTERVAL}

# Browser Configuration
BROWSER_TIMEOUT_MS=30000
MAX_CONCURRENT_CHECKS=${MAX_CONCURRENT}
REQUEST_TIMEOUT_MS=15000

# Logging
LOG_LEVEL=info
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Configuration saved to .env"
echo ""
echo "Next steps:"
echo "  1. Run './deploy.sh' to deploy the application"
echo "  2. Or run 'docker-compose up -d' manually"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
