# Deceptive Domains Checker

An automated system that monitors tracking domains for deceptive warning screens on Chrome and Safari/WebKit browsers, with Telegram notifications.

## 🎯 Overview

This system continuously monitors tracking domains by:

- Fetching active domains from Keitaro API
- Checking for deceptive/phishing warnings on both Chrome and Safari/WebKit
- Sending instant Telegram notifications when warnings are detected
- Running automated checks every 30 minutes (configurable)
- Handling ~100+ domains with concurrent processing

## 🏗️ Architecture & Approach

### System Design

```
┌─────────────────┐
│   Scheduler     │  (Cron Job - every 30 min)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Keitaro Service │  (Fetch Active Domains)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Checker Service │  (Playwright - Chrome/Safari)
│  - Concurrent   │  (Process 10 domains at a time)
│  - Browser Pool │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Telegram Service│  (Send Notifications)
└─────────────────┘
```

### Core Components

1. **Keitaro Module** (`src/keitaro/`)

   - Connects to Keitaro API
   - Fetches active domains
   - Handles API errors and retries
   - Configurable timeout and authentication

2. **Checker Module** (`src/checker/`)

   - Uses Playwright for browser automation
   - Maintains browser pools (Chromium & WebKit)
   - Concurrent domain checking with rate limiting
   - Detects warning patterns using multiple strategies:
     - CSS selectors
     - Text pattern matching (RegEx)
     - Body content analysis

3. **Telegram Module** (`src/telegram/`)

   - Sends formatted notifications
   - Warning alerts with domain details
   - Summary reports after each check
   - Error notifications

4. **Scheduler Module** (`src/scheduler/`)
   - Cron-based automated checks
   - Manual trigger support
   - Status tracking and metrics
   - Graceful error handling

### Detection Strategy

The system uses a multi-layered approach to detect deceptive warnings:

1. **Selector-Based Detection**: Searches for known warning page elements

   - Safari deceptive site warnings
   - Chrome Safe Browsing warnings
   - Generic warning pages

2. **Text Pattern Matching**: Regex patterns to identify warning text

   - "deceptive site", "phishing", "malware"
   - "harmful programs", "unsafe website"
   - Language-independent patterns

3. **Behavioral Analysis**: Checks for warning page characteristics
   - Unusual DOM structure
   - Missing content elements
   - Blocked resource patterns

## 🚀 Quick Deployment

### Prerequisites

- Docker & Docker Compose
- Keitaro API credentials
- Telegram Bot Token & Chat ID

### One-Command Deployment

**Linux/Mac:**

```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows (PowerShell):**

```powershell
.\deploy.ps1
```

### Manual Deployment

1. **Clone and configure**

```bash
git clone <repository>
cd deceptive-domain-check
cp .env.example .env
# Edit .env with your credentials
```

2. **Configure environment variables**

```env
KEITARO_API_URL=https://your-keitaro-instance.com/admin_api/v1
KEITARO_API_KEY=your_api_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
CHECK_INTERVAL_MINUTES=30
MAX_CONCURRENT_CHECKS=10
```

3. **Deploy with Docker**

```bash
docker-compose up -d
```

4. **Verify deployment**

```bash
# Check health
curl http://localhost:3000/health

# View logs
docker-compose logs -f

# Check status
curl http://localhost:3000
```

## ⚙️ Configuration

### Environment Variables

| Variable                 | Description              | Default | Required |
| ------------------------ | ------------------------ | ------- | -------- |
| `KEITARO_API_URL`        | Keitaro API endpoint     | -       | Yes      |
| `KEITARO_API_KEY`        | API authentication key   | -       | Yes      |
| `TELEGRAM_BOT_TOKEN`     | Telegram bot token       | -       | Yes      |
| `TELEGRAM_CHAT_ID`       | Telegram chat/channel ID | -       | Yes      |
| `CHECK_INTERVAL_MINUTES` | Minutes between checks   | 30      | No       |
| `BROWSER_TIMEOUT_MS`     | Browser page timeout     | 30000   | No       |
| `MAX_CONCURRENT_CHECKS`  | Concurrent domain checks | 10      | No       |
| `REQUEST_TIMEOUT_MS`     | API request timeout      | 15000   | No       |
| `PORT`                   | Server port              | 3000    | No       |
| `LOG_LEVEL`              | Logging level            | info    | No       |

### Getting Telegram Credentials

1. **Create a bot**: Talk to [@BotFather](https://t.me/botfather)
2. **Get bot token**: `/newbot` command
3. **Get chat ID**:
   - Send a message to your bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your `chat.id`

### Getting Keitaro API Key

1. Log into Keitaro admin panel
2. Navigate to Settings → API
3. Generate new API key
4. Copy the key and base URL

## 📊 Scalability Considerations

### Current Capacity

- **Domains**: Optimized for ~100 domains
- **Check Time**: ~2-5 minutes for 100 domains
- **Concurrent Checks**: 10 domains simultaneously
- **Memory**: ~1-2GB typical usage

### Scaling Strategies

#### 1. Horizontal Scaling (Recommended for 500+ domains)

Deploy multiple instances with domain sharding:

```yaml
# docker-compose.scale.yml
services:
  checker-1:
    build: .
    environment:
      - DOMAIN_SHARD=1
      - TOTAL_SHARDS=3

  checker-2:
    build: .
    environment:
      - DOMAIN_SHARD=2
      - TOTAL_SHARDS=3

  checker-3:
    build: .
    environment:
      - DOMAIN_SHARD=3
      - TOTAL_SHARDS=3
```

**Benefits**:

- Linear scaling
- Fault isolation
- No single point of failure
- Can handle 1000+ domains

#### 2. Vertical Scaling (For 100-500 domains)

Increase resources and concurrency:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
environment:
  - MAX_CONCURRENT_CHECKS=20
```

#### 3. Queue-Based Architecture (Enterprise scale)

For 1000+ domains:

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│  API     │────▶│ RabbitMQ  │────▶│  Workers │
│  Server  │     │  Queue    │     │  Pool    │
└──────────┘     └───────────┘     └──────────┘
                                         │
                                         ▼
                                   ┌──────────┐
                                   │ Telegram │
                                   └──────────┘
```

Implementation additions:

- Add RabbitMQ/Redis queue
- Separate worker containers
- Distributed task processing
- Load balancing

#### 4. Database Layer (For Analytics)

Add PostgreSQL/MongoDB for:

- Historical check results
- Trend analysis
- Domain reputation tracking
- Alert frequency patterns

```typescript
// Example schema
interface CheckHistory {
  domain: string;
  timestamp: Date;
  browser: string;
  hasWarning: boolean;
  warningType?: string;
  responseTime: number;
}
```

### Performance Optimizations

1. **Browser Pool Reuse**: Browsers stay open between checks
2. **Concurrent Processing**: Process multiple domains simultaneously
3. **Smart Rate Limiting**: Prevents overwhelming target servers
4. **Timeout Management**: Fast failure for unresponsive domains
5. **Resource Cleanup**: Proper browser context disposal

### Monitoring & Observability

For production deployment, add:

1. **Metrics** (Prometheus + Grafana)

```typescript
- Check duration
- Success/failure rates
- Warning detection rates
- Browser performance
```

2. **Logging** (ELK Stack)

```typescript
- Structured JSON logs
- Error tracking
- Audit trails
```

3. **Alerting** (Besides Telegram)

```typescript
- PagerDuty integration
- Email notifications
- Slack webhooks
```

## 🔧 Development

### Local Development Setup

1. **Install dependencies**

```bash
npm install
```

2. **Install Playwright browsers**

```bash
npm run playwright:install
```

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Run in development mode**

```bash
npm run start:dev
```

### Project Structure

```
deceptive-domain-check/
├── src/
│   ├── keitaro/           # Keitaro API integration
│   │   ├── keitaro.service.ts
│   │   ├── keitaro.module.ts
│   │   └── interfaces/
│   ├── checker/           # Domain checking logic
│   │   ├── checker.service.ts
│   │   ├── checker.module.ts
│   │   └── interfaces/
│   ├── telegram/          # Telegram notifications
│   │   ├── telegram.service.ts
│   │   └── telegram.module.ts
│   ├── scheduler/         # Automated scheduling
│   │   ├── scheduler.service.ts
│   │   └── scheduler.module.ts
│   ├── app.module.ts      # Main application module
│   └── main.ts            # Application entry point
├── Dockerfile             # Production Docker image
├── Dockerfile.playwright  # Alternative with full Playwright
├── docker-compose.yml     # Docker Compose config
├── deploy.sh              # Linux/Mac deployment
├── deploy.ps1             # Windows deployment
└── README.md              # This file
```

### Testing

```bash
# Run checks manually
curl http://localhost:3000

# Trigger manual check
# (Add endpoint in scheduler controller if needed)

# View logs
docker-compose logs -f

# Check health
curl http://localhost:3000/health
```

## 🔒 Security Considerations

1. **API Keys**: Store in environment variables, never commit
2. **Docker Security**: Non-root user, minimal base image
3. **Network Isolation**: Docker network for service communication
4. **HTTPS**: Use HTTPS for all external API calls
5. **Rate Limiting**: Prevent API abuse
6. **Input Validation**: Joi validation for environment variables

## 🐛 Troubleshooting

### Common Issues

1. **Browser Launch Fails**

```bash
# Install system dependencies
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

2. **Telegram Not Sending**

```bash
# Test bot connection
curl https://api.telegram.org/bot<TOKEN>/getMe

# Verify chat ID
curl https://api.telegram.org/bot<TOKEN>/getUpdates
```

3. **Keitaro Connection Failed**

```bash
# Test API endpoint
curl -H "Api-Key: YOUR_KEY" https://your-keitaro.com/admin_api/v1/domains

# Check network connectivity
docker-compose exec app ping your-keitaro.com
```

4. **High Memory Usage**

```bash
# Reduce concurrent checks
# In .env: MAX_CONCURRENT_CHECKS=5

# Or increase Docker limits in docker-compose.yml
```

### Logs & Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app

# Check container status
docker-compose ps

# Enter container
docker-compose exec app sh
```

## 📈 Metrics & Monitoring

### Key Metrics to Track

- **Check Success Rate**: % of successful domain checks
- **Warning Detection Rate**: % of domains with warnings
- **Average Response Time**: Time per domain check
- **False Positive Rate**: Incorrectly flagged domains
- **System Uptime**: Service availability

### Sample Monitoring Dashboard

```
┌────────────────────────────────────────┐
│ Deceptive Domain Checker Dashboard    │
├────────────────────────────────────────┤
│ Active Domains:           100          │
│ Domains with Warnings:    3            │
│ Last Check:               2 mins ago   │
│ Average Response Time:    450ms        │
│ Checks Today:             48           │
│ Warnings Today:           12           │
└────────────────────────────────────────┘
```

## 📝 API Endpoints

### Health Check

```
GET /health
Response: { "status": "ok", "timestamp": "..." }
```

### Service Status

```
GET /
Response: {
  "service": "Deceptive Domain Checker",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "..."
}
```
