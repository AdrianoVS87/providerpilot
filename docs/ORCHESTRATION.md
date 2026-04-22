# ProviderPilot — Agent Orchestration Architecture

## Overview

ProviderPilot is an autonomous multi-agent system designed to handle childcare provider licensing across 10 U.S. states. The system manages the entire lifecycle from intake to approved licensing application.

## Agent Architecture

### Hierarchical Structure (40 Agents)

```
CEO (Orchestrator)
├── VP of Licensing
│   ├── State Director (TX, CA, NY, FL, MI, NV, IN, OH, GA, IL)
│   │   ├── DocExtractor
│   │   ├── ComplianceChecker
│   │   ├── CoachWriter
│   │   └── FormFiller
│   └── Specialists Pool
└── Quality & Cost
    ├── ConfidenceGate
    ├── RegressionTester
    ├── SafetyAuditor
    └── CostMonitor
```

## Orchestration Methods

### 1. Hierarchical Orchestration (Top-Down)

The CEO agent receives intake requests and routes them to the appropriate State Director based on the provider's state. Each State Director coordinates 4 parallel specialist agents, then aggregates results.

### 2. Parallel Execution (Swarm Pattern)

Each State Director spawns 4 specialists **simultaneously**:
- DocExtractor — document parsing
- ComplianceChecker — regulatory validation
- CoachWriter — personalized coaching
- FormFiller — PDF generation

This "swarm within swarm" pattern reduces latency by ~75% compared to sequential execution.

### 3. Multi-Model Cascade

Different agents use different models based on task requirements:

| Agent | Model | Temperature | Purpose |
|-------|-------|-------------|---------|
| CEO / Directors | MiniMax M2.7 | 0.3 | Orchestration, routing |
| Specialists | MiniMax M2.7 | 0.4 | Content generation |
| ConfidenceGate | MiniMax M2.7 | 0.1 | Adversarial scoring |
| CostMonitor | MiniMax M2.7 | 0.2 | Estimation |

The multi-model approach optimizes for both cost (free tier for 40 idle agents) and quality where it matters.

### 4. Confidence-Gated Human-in-the-Loop

The **ConfidenceGate** is an independent adversarial agent that:
- Scores all specialist outputs (0.0 - 1.0)
- Uses **lower temperature** (0.1) to avoid self-evaluation bias
- Flags outputs below 90% confidence for human review
- Enables human oversight without blocking the happy path

### 5. State-Specific Knowledge Injection

Each State Director has access to a **Knowledge Base** containing:
- State-specific licensing forms (LIC 200, CCDF, etc.)
- Regulatory requirements
- Compliance thresholds
- Historical approval patterns

These KBs are injected into each specialist prompt, ensuring accurate, state-specific outputs.

## Technologies

- **Runtime**: Paperclip (agent orchestration platform)
- **Frontend**: Next.js 14 + shadcn/ui
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL 16 (state), Redis 7 (caching)
- **Deployment**: Vercel (frontend) + VPS (backend)
- **API**: REST + Server-Sent Events for real-time updates

## Why This Works

1. **Autonomy with guardrails** — Agents operate autonomously but confidence-gated human review prevents quality issues
2. **Scalability** — Parallel specialist execution handles volume
3. **Observability** — Full pipeline logging at every step
4. **Cost efficiency** — Free-tier models for orchestration, paid only where needed
5. **Accuracy** — State-specific knowledge bases prevent generic mistakes

---

*This architecture demonstrates production-grade multi-agent systems with proper orchestration, quality control, and human oversight.*
