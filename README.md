# ProviderPilot — Autonomous Provider Onboarding Factory

**40 AI agents. 10 US states. One intake form.**

ProviderPilot automates end-to-end childcare provider onboarding using a structured swarm of 40 agents organized as a company. From intake form to filled licensing application — with human-in-the-loop escalation for edge cases.

## Live Demo

- **Frontend:** [providerpilot.adrianovs.net](https://providerpilot.adrianovs.net)
- **API:** `http://82.25.76.54:4001/api`
- **Paperclip Dashboard:** [paperclip.adrianovs.net](https://paperclip.adrianovs.net)

## Architecture

```
┌──────────────────────────────────────────────────┐
│ LAYER 1: Presentation (Vercel)                   │
│ Next.js 14 + shadcn/ui + TypeScript              │
└──────────────┬───────────────────────────────────┘
               │ HTTPS
┌──────────────▼───────────────────────────────────┐
│ LAYER 2: Orchestration (VPS)                     │
│ Paperclip — Org chart, budgets, heartbeats       │
└──────────────┬───────────────────────────────────┘
               │ HTTP adapter (heartbeats + tasks)
┌──────────────▼───────────────────────────────────┐
│ LAYER 3: Agent Runtime (VPS)                     │
│ Express.js API + MiniMax M2.7 + Claude APIs      │
│ 40 agent instances with isolated context         │
└──────────────────────────────────────────────────┘
```

## The 40-Agent Org Chart

| Layer | Count | Agents | Model |
|-------|-------|--------|-------|
| Executive | 2 | CEO-Agent, COO-Agent | Opus (when reasoning) |
| Department Heads | 4 | VP-Licensing, VP-Compliance, VP-Communications, VP-Quality | Sonnet (when active) |
| State Directors | 10 | Director-{CA,TX,FL,NY,MI,NV,IN,OH,GA,IL} | MiniMax M2.7 |
| Specialists | 20 | {DocExtractor,ComplianceChecker,FormFiller,CoachWriter} × 5 states | MiniMax M2.7 |
| Validators | 4 | ConfidenceGate, RegressionTester, CostMonitor, SafetyAuditor | MiniMax M2.7 |

**All 40 agents are active** — processing via MiniMax M2.7 (free tier) for heartbeats and lightweight work, escalating to Claude Sonnet/Opus for complex reasoning.

## Multi-Model Routing

| Model | Use Case | Cost |
|-------|----------|------|
| **Claude Opus** | Architecture decisions, ConfidenceGate independent judging | $$$ |
| **Claude Sonnet** | Code generation, complex specialist work | $$ |
| **Claude Haiku** | Documentation, comments | $ |
| **MiniMax M2.7** | Agent heartbeats, idle monitoring, lightweight analysis | Free |
| **OpenAI Codex** | Infrastructure, fallback, ambiguity resolution | $$ |

## Onboarding Pipeline (Happy Path)

```
1. Provider submits intake form → POST /api/intake
2. CEO-Agent receives task, determines state routing
3. VP-Licensing routes to correct State Director
4. State Director fans out 4 parallel sub-tasks:
   ├─ DocExtractor: document extraction & validation
   ├─ ComplianceChecker: state code gap analysis
   ├─ FormFiller: pre-filled application generation
   └─ CoachWriter: personalized next-step coaching
5. ConfidenceGate scores each output independently
   ├─ ≥ 0.9 → commit & email provider
   └─ < 0.9 → push to human review queue
6. CostMonitor tracks budget ($2/provider limit)
7. All steps streamed via SSE to frontend
```

## Reliability Patterns

- **Independent Confidence Gate** — Separate judge (not self-reported), threshold at 0.9
- **4-Layer Ambiguity Handling** — Keyword gate → LLM classifier → Hardcoded invariants → Human-in-the-loop
- **Multi-Model Fallback Cascade** — Opus → Sonnet → Haiku → Codex (circuit breakers with backoff)
- **Idempotency** — Every mutation keyed by `(provider_id, task_id, retry_count)`
- **Cost Circuit Breaker** — CostMonitor halts tasks exceeding $2/provider budget
- **Rule of Two** — No single agent has PII access + external content + communication capability

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, TypeScript, PostgreSQL 16, tsx
- **Orchestration:** Paperclip (org chart, budgets, governance)
- **AI:** MiniMax M2.7 (OpenAI-compatible), Anthropic Claude (Opus/Sonnet/Haiku)
- **Deploy:** Vercel (frontend), Hostinger VPS (backend + orchestration)

## Running Locally

```bash
# Backend
cd backend
cp .env.example .env  # fill in API keys
npm install
npm run dev

# Frontend
cd frontend
cp .env.example .env.local  # set API URL
npm install
npm run dev
```

## Performance

| Metric | Value |
|--------|-------|
| Avg onboarding time | ~30 seconds |
| Avg tokens per onboarding | ~4,800 |
| Avg cost per onboarding | ~$0.01 (MiniMax free tier) |
| Pipeline steps | 9 (CEO → VP → Director → 4 Specialists → Gate → Monitor) |
| Confidence threshold | 0.9 |
| Budget per provider | $2.00 |

## Trade-Offs (Interview Ready)

1. **Why 40 agents?** Matches the stated scale of the target company. Would benchmark single-agent-with-tools vs. decomposition and pick based on eval outcomes.
2. **Why MiniMax for idle agents?** Free tier enables all 40 to be genuinely active without burning budget. Claude reserved for when quality matters.
3. **Why independent confidence judge?** Self-reported confidence is reward-hackable. Independent judge with different prompt reduces correlated failures.
4. **Where does this break at scale?** Knowledge bases need CI for regulatory updates. Human queue needs sub-30s UX. At 10K providers/month, $0.01 each = $100/month — very reasonable.

---

Built by [Adriano Viera dos Santos](https://adrianovs.net) in 72 hours.
