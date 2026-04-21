# ProviderPilot Backend — Build Task

## What this is
Express.js + TypeScript backend that acts as the bridge between the Next.js frontend and 40 Paperclip agents for childcare provider onboarding.

## Architecture
- Express.js + TypeScript on port 4000
- Connects to Paperclip API at http://127.0.0.1:3100
- Connects to PostgreSQL at postgresql://hookwatch:hookwatch@127.0.0.1:5433/paperclip
- Uses MiniMax M2.7 API (OpenAI-compatible) for idle agent heartbeats
- Uses Claude Sonnet/Opus for real work (via Anthropic SDK)

## API Endpoints needed

### POST /api/intake
Receives provider onboarding form:
```json
{
  "providerName": "Maria Rodriguez",
  "businessName": "Maria's Home Daycare",
  "state": "TX",
  "address": "1234 Main St, Austin TX 78701",
  "phone": "512-555-1234",
  "email": "maria@example.com",
  "facilityType": "home-based",
  "ageGroups": ["infant", "toddler", "preschool"],
  "maxCapacity": 12,
  "documents": [] // uploaded file references
}
```
- Validates state is one of: CA, TX, FL, NY, MI, NV, IN, OH, GA, IL
- Creates a task in Paperclip assigned to CEO-Agent
- Returns `{ onboardingId, status: "started" }`

### GET /api/status/:onboardingId
Returns current status of onboarding:
```json
{
  "onboardingId": "...",
  "status": "in_progress",
  "currentPhase": "compliance_check",
  "steps": [
    { "agent": "CEO-Agent", "action": "intake_received", "timestamp": "...", "status": "completed" },
    { "agent": "VP-Licensing", "action": "routed_to_tx", "timestamp": "...", "status": "completed" },
    { "agent": "Director-TX", "action": "dispatched_specialists", "timestamp": "...", "status": "completed" },
    { "agent": "DocExtractor-TX", "action": "extracting_documents", "timestamp": "...", "status": "in_progress" }
  ],
  "confidence": null,
  "cost": { "totalTokens": 1234, "totalUsd": 0.43 }
}
```

### GET /api/status/:onboardingId/stream (SSE)
Server-sent events stream of real-time updates as agents process the onboarding.

### GET /api/agents
Returns all 40 agents with their current status from Paperclip.

### GET /api/agents/:id
Returns single agent detail.

### POST /api/review/:onboardingId
Human review action (approve/reject/edit) from the review queue.

### GET /api/review/queue
Returns all items in human review queue (confidence < 0.9).

### GET /api/metrics
Returns system metrics: total onboardings, avg cost, avg time, confidence distribution.

## Agent Heartbeat System
Each agent has an HTTP adapter endpoint at `/agents/:agentName/heartbeat`.
When Paperclip calls these endpoints, the backend should:
1. Call MiniMax M2.7 API with the agent's context to get a lightweight status response
2. Return the result to Paperclip

MiniMax API:
- Base URL: https://api.minimax.io/v1
- Model: MiniMax-M2.7
- API Key: sk-cp-Q3zG3TzLhiqKnILKScvZ8d0EtauS_eKsFCGJN5KQxA4HQIuMGUMGnZ4DcSLxWM6ke1APyj9auTCb-UKXO7sQ7on5RlEkcBs7eM_lVYZQuLJXNRK72HImuGQ
- OpenAI-compatible chat completions format

## Onboarding Pipeline (when triggered)
When a real onboarding starts (POST /api/intake), the system should:
1. CEO-Agent receives task, determines state, delegates to VP-Licensing
2. VP-Licensing routes to correct State Director
3. State Director fans out 4 parallel sub-tasks to specialists
4. ConfidenceGate scores each specialist output
5. Results aggregated and returned

For the demo, the actual LLM work uses Claude Sonnet (ANTHROPIC_API_KEY from env).
The pipeline steps should be tracked in PostgreSQL and streamed via SSE.

## Database Tables (in the paperclip database)
Create these additional tables for onboarding tracking:
```sql
CREATE TABLE IF NOT EXISTS onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  business_name TEXT,
  state TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  facility_type TEXT DEFAULT 'home-based',
  age_groups TEXT[] DEFAULT '{}',
  max_capacity INT,
  status TEXT DEFAULT 'pending',
  confidence_score NUMERIC(3,2),
  total_tokens INT DEFAULT 0,
  total_cost_usd NUMERIC(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID REFERENCES onboardings(id),
  agent_name TEXT NOT NULL,
  agent_id UUID,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  input JSONB,
  output JSONB,
  confidence NUMERIC(3,2),
  tokens_used INT DEFAULT 0,
  cost_usd NUMERIC(8,4) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID REFERENCES onboardings(id),
  step_id UUID REFERENCES onboarding_steps(id),
  agent_name TEXT NOT NULL,
  reason TEXT,
  original_output JSONB,
  reviewer_action TEXT,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Project Setup
- Use `npm init -y`, install express, typescript, @types/node, @types/express, tsx, pg, @anthropic-ai/sdk, openai, uuid, cors, dotenv
- tsconfig.json with strict mode
- Use tsx for running TypeScript directly
- Entry point: src/index.ts
- Keep it clean — src/routes/, src/services/, src/db/

## .env file
```
PORT=4000
DATABASE_URL=postgresql://hookwatch:hookwatch@127.0.0.1:5433/paperclip
PAPERCLIP_URL=http://127.0.0.1:3100
MINIMAX_API_KEY=sk-cp-Q3zG3TzLhiqKnILKScvZ8d0EtauS_eKsFCGJN5KQxA4HQIuMGUMGnZ4DcSLxWM6ke1APyj9auTCb-UKXO7sQ7on5RlEkcBs7eM_lVYZQuLJXNRK72HImuGQ
MINIMAX_MODEL=MiniMax-M2.7
ANTHROPIC_API_KEY=placeholder
```

Build it all. Make it work. No shortcuts on types.
