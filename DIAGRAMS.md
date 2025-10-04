# System Diagrams

Visual representations of the Deceptive Domain Checker system architecture.

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DECEPTIVE DOMAIN CHECKER                         │
│                      Production System v1.0                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          INPUT SOURCES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────────┐              ┌──────────────────┐          │
│   │  Keitaro API     │              │   Cron Scheduler │          │
│   │                  │              │   (Every 30 min) │          │
│   │  Active Domains  │              │                  │          │
│   └────────┬─────────┘              └────────┬─────────┘          │
│            │                                  │                     │
└────────────┼──────────────────────────────────┼─────────────────────┘
             │                                  │
             └──────────────┬───────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                     PROCESSING LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │              Scheduler Service                              │ │
│   │   • Orchestrates check cycles                               │ │
│   │   • Manages timing and retries                              │ │
│   └──────────────────────────┬──────────────────────────────────┘ │
│                              │                                     │
│   ┌──────────────────────────▼──────────────────────────────────┐ │
│   │              Keitaro Service                                │ │
│   │   • Fetches active domains                                  │ │
│   │   • Handles API authentication                              │ │
│   └──────────────────────────┬──────────────────────────────────┘ │
│                              │                                     │
│                              │ [Domain List]                       │
│                              │                                     │
│   ┌──────────────────────────▼──────────────────────────────────┐ │
│   │              Checker Service                                │ │
│   │                                                             │ │
│   │   ┌─────────────────────────────────────────────────────┐  │ │
│   │   │  Concurrent Processing (10 domains at a time)      │  │ │
│   │   │                                                     │  │ │
│   │   │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │ │
│   │   │  │ Domain 1 │  │ Domain 2 │  │ Domain N │         │  │ │
│   │   │  └────┬─────┘  └────┬─────┘  └────┬─────┘         │  │ │
│   │   │       │             │             │                │  │ │
│   │   │  ┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐        │  │ │
│   │   │  │ Chromium │  │ Chromium │  │ Chromium │        │  │ │
│   │   │  └──────────┘  └──────────┘  └──────────┘        │  │ │
│   │   │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │ │
│   │   │  │  WebKit  │  │  WebKit  │  │  WebKit  │        │  │ │
│   │   │  └──────────┘  └──────────┘  └──────────┘        │  │ │
│   │   └─────────────────────────────────────────────────────┘  │ │
│   │                                                             │ │
│   │   • Pattern matching for warnings                          │ │
│   │   • CSS selector detection                                 │ │
│   │   • Text content analysis                                  │ │
│   └──────────────────────────┬──────────────────────────────────┘ │
│                              │                                     │
│                              │ [Check Results]                     │
│                              │                                     │
│   ┌──────────────────────────▼──────────────────────────────────┐ │
│   │              Telegram Service                               │ │
│   │   • Formats notifications                                   │ │
│   │   • Sends alerts and summaries                              │ │
│   └─────────────────────────────────────────────────────────────┘ │
│                                                                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                          OUTPUT                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────────┐         ┌──────────────────┐              │
│   │  Telegram Bot    │         │  System Logs     │              │
│   │                  │         │                  │              │
│   │  Real-time       │         │  Structured      │              │
│   │  Notifications   │         │  JSON Logging    │              │
│   └──────────────────┘         └──────────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Interaction

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Component Interaction Flow                        │
└─────────────────────────────────────────────────────────────────────┘

Time: T0 (System Start)
│
├─► [main.ts] Initialize NestJS Application
│   │
│   └─► [app.module.ts] Bootstrap all modules
│       │
│       ├─► [KeitaroModule] Load Keitaro service
│       ├─► [CheckerModule] Initialize browser pools
│       ├─► [TelegramModule] Configure bot client
│       └─► [SchedulerModule] Set up cron jobs
│
Time: T0 + 5s (Startup checks)
│
├─► [SchedulerService.onModuleInit()]
│   │
│   ├─► Test Keitaro connection
│   ├─► Test Telegram connection
│   └─► Send startup notification
│
Time: T0 + 10s (First check)
│
├─► [SchedulerService.runDomainCheck()]
│   │
│   └─► STEP 1: Fetch Domains
│       │
│       ├─► [KeitaroService.getActiveDomains()]
│       │   │
│       │   ├─► HTTP GET to Keitaro API
│       │   ├─► Filter by state='active'
│       │   └─► Return domain array
│       │
│       └─► STEP 2: Check Domains
│           │
│           ├─► [CheckerService.checkDomains(domains)]
│           │   │
│           │   ├─► Split into chunks of 10
│           │   │
│           │   └─► For each chunk:
│           │       │
│           │       └─► Process in parallel
│           │           │
│           │           ├─► For each domain:
│           │           │   │
│           │           │   ├─► Launch Chromium context
│           │           │   │   │
│           │           │   │   ├─► Navigate to domain
│           │           │   │   ├─► Wait for load
│           │           │   │   ├─► Check for warnings
│           │           │   │   └─► Close context
│           │           │   │
│           │           │   └─► Launch WebKit context
│           │           │       │
│           │           │       ├─► Navigate to domain
│           │           │       ├─► Wait for load
│           │           │       ├─► Check for warnings
│           │           │       └─► Close context
│           │           │
│           │           └─► Collect results
│           │
│           └─► STEP 3: Analyze Results
│               │
│               ├─► Filter warnings
│               └─► Generate metrics
│
│   └─► STEP 4: Send Notifications
│       │
│       ├─► [TelegramService.sendWarningNotification()]
│       │   │
│       │   ├─► Format message with warning details
│       │   └─► POST to Telegram API
│       │
│       └─► [TelegramService.sendSummaryNotification()]
│           │
│           ├─► Format summary with stats
│           └─► POST to Telegram API
│
Time: T0 + 30min (Next scheduled check)
│
└─► [Repeat from "runDomainCheck()"]
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Flow                                   │
└─────────────────────────────────────────────────────────────────────┘

External APIs              Application Layer            Output Channels
     │                           │                           │
     │                           │                           │
┌────▼────┐                ┌────▼─────┐               ┌────▼────┐
│ Keitaro │                │Scheduler │               │Telegram │
│   API   │                │  Service │               │   API   │
└────┬────┘                └────┬─────┘               └────▲────┘
     │                           │                          │
     │ 1. GET /domains           │                          │
     │    [Active domains]       │                          │
     │◄──────────────────────────┤                          │
     │                           │                          │
     ├──────────────────────────►│                          │
     │ Response:                 │                          │
     │ [{name: "domain1.com",    │                          │
     │   state: "active"}, ...]  │                          │
     │                           │                          │
     │                      ┌────▼─────┐                    │
     │                      │  Keitaro │                    │
     │                      │  Service │                    │
     │                      └────┬─────┘                    │
     │                           │                          │
     │                           │ 2. Process domains       │
     │                           │    ["domain1.com",       │
     │                           │     "domain2.com", ...]  │
     │                           │                          │
     │                      ┌────▼─────┐                    │
     │                      │ Checker  │                    │
     │                      │ Service  │                    │
     │                      └────┬─────┘                    │
     │                           │                          │
┌────▼────────────────────┐     │                          │
│  Target Domains         │◄────┤ 3. Browser checks        │
│  (domain1.com,          │     │    (Chromium + WebKit)   │
│   domain2.com, ...)     │     │                          │
└─────────────────────────┘     │                          │
                                │                          │
                                │ 4. Collect results       │
                                │    [{domain: "...",      │
                                │      hasWarning: true,   │
                                │      browser: "...",     │
                                │      warningType: "..."}, │
                                │     ...]                 │
                                │                          │
                           ┌────▼─────┐                    │
                           │Scheduler │                    │
                           │ Service  │                    │
                           └────┬─────┘                    │
                                │                          │
                                │ 5. Filter warnings       │
                                │    (hasWarning === true) │
                                │                          │
                           ┌────▼─────┐                    │
                           │Telegram  │                    │
                           │ Service  │                    │
                           └────┬─────┘                    │
                                │                          │
                                │ 6. Format & send         │
                                │    notifications         │
                                │                          │
                                └─────────────────────────►│
                                  POST /sendMessage        │
                                  {chat_id: "...",         │
                                   text: "Warning: ..."}   │
                                                           │
                                                      ┌────▼────┐
                                                      │  Users  │
                                                      │Telegram │
                                                      │  Chat   │
                                                      └─────────┘
```

---

## Scalability Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              Scaling Strategy Evolution                             │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1: Single Instance (100-250 domains)
┌────────────────────────────────┐
│   Docker Container             │
│   ┌──────────────────────┐    │
│   │  NestJS Application  │    │
│   │  All services        │    │
│   └──────────────────────┘    │
│   Resources: 2GB RAM, 2 CPU   │
└────────────────────────────────┘

PHASE 2: Vertical Scaling (250-500 domains)
┌────────────────────────────────┐
│   Docker Container             │
│   ┌──────────────────────┐    │
│   │  NestJS Application  │    │
│   │  All services        │    │
│   │  Increased           │    │
│   │  Concurrency: 20     │    │
│   └──────────────────────┘    │
│   Resources: 4GB RAM, 4 CPU   │
└────────────────────────────────┘

PHASE 3: Horizontal Scaling (500-1000 domains)
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│  Instance 1        │  │  Instance 2        │  │  Instance 3        │
│  Domains: 0-333    │  │  Domains: 334-666  │  │  Domains: 667-999  │
│  ┌──────────────┐  │  │  ┌──────────────┐  │  │  ┌──────────────┐  │
│  │ NestJS App   │  │  │  │ NestJS App   │  │  │  │ NestJS App   │  │
│  └──────────────┘  │  │  └──────────────┘  │  │  └──────────────┘  │
└─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘
          │                       │                       │
          └───────────────────────┴───────────────────────┘
                                  │
                          ┌───────▼────────┐
                          │ Load Balancer  │
                          │  (Optional)    │
                          └────────────────┘

PHASE 4: Queue-Based Architecture (1000-5000+ domains)
┌────────────────────────────────────────────────────────────────────┐
│                     Master Coordinator                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  API Server / Domain Distributor                             │ │
│  └────────────────────────┬─────────────────────────────────────┘ │
└───────────────────────────┼────────────────────────────────────────┘
                            │
                ┌───────────▼──────────┐
                │   RabbitMQ Queue     │
                │   ┌────────────────┐ │
                │   │ Domain Tasks   │ │
                │   └────────────────┘ │
                └───────────┬──────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
       ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
       │ Worker  │    │ Worker  │    │ Worker  │
       │  Node 1 │    │  Node 2 │    │  Node N │
       │         │    │         │    │         │
       │ Checker │    │ Checker │    │ Checker │
       └────┬────┘    └────┬────┘    └────┬────┘
            │               │               │
            └───────────────┴───────────────┘
                            │
                     ┌──────▼───────┐
                     │  PostgreSQL  │
                     │   (Results)  │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  Telegram    │
                     │  Aggregator  │
                     └──────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Security Layers                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1: Environment Security                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Environment variables (.env)                             │   │
│  │  • No hardcoded secrets                                     │   │
│  │  • Kubernetes secrets (production)                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  Layer 2: Container Security                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Non-root user (nodejs:1001)                              │   │
│  │  • Minimal base image                                       │   │
│  │  • Read-only filesystem (where possible)                    │   │
│  │  • Resource limits                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  Layer 3: Network Security                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Docker network isolation                                 │   │
│  │  • HTTPS-only external communication                        │   │
│  │  • No exposed internal ports                                │   │
│  │  • Firewall rules (optional)                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  Layer 4: Application Security                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Input validation (Joi schemas)                           │   │
│  │  • Type safety (TypeScript)                                 │   │
│  │  • Error handling (no data leakage)                         │   │
│  │  • Audit logging                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  Layer 5: Data Security                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • No PII storage                                           │   │
│  │  • Encrypted communication (TLS)                            │   │
│  │  • Secure credential handling                               │   │
│  │  • Regular dependency updates                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Docker Deployment                                  │
└─────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────┐
                        │  Docker Host    │
                        │   (Server)      │
                        └────────┬────────┘
                                 │
                    ┌────────────▼───────────┐
                    │   Docker Engine        │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼───────────┐
                    │  Docker Compose        │
                    │  ┌──────────────────┐  │
                    │  │ Networks         │  │
                    │  │  - app-network   │  │
                    │  └──────────────────┘  │
                    │  ┌──────────────────┐  │
                    │  │ Volumes          │  │
                    │  │  - logs          │  │
                    │  └──────────────────┘  │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼───────────┐
                    │   Container            │
                    │   (deceptive-domain-   │
                    │    checker)            │
                    │                        │
                    │  ┌──────────────────┐  │
                    │  │  NestJS App      │  │
                    │  │  ┌────────────┐  │  │
                    │  │  │  Keitaro   │  │  │
                    │  │  │  Service   │  │  │
                    │  │  └────────────┘  │  │
                    │  │  ┌────────────┐  │  │
                    │  │  │  Checker   │  │  │
                    │  │  │  Service   │  │  │
                    │  │  └────────────┘  │  │
                    │  │  ┌────────────┐  │  │
                    │  │  │  Telegram  │  │  │
                    │  │  │  Service   │  │  │
                    │  │  └────────────┘  │  │
                    │  │  ┌────────────┐  │  │
                    │  │  │ Scheduler  │  │  │
                    │  │  │  Service   │  │  │
                    │  │  └────────────┘  │  │
                    │  └──────────────────┘  │
                    │                        │
                    │  Port: 3000            │
                    │  Health: /health       │
                    │  Status: /             │
                    └────────────────────────┘

External Connections:
├─► Keitaro API (HTTPS)
├─► Telegram API (HTTPS)
└─► Target Domains (HTTP/HTTPS)
```

---

**Version**: 1.0.0
