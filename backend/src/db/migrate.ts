import { pool } from "./pool.js";

export async function migrate() {
  await pool.query(`
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
  `);
  // Indexes for query performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_onboarding_steps_onboarding_id ON onboarding_steps(onboarding_id);
    CREATE INDEX IF NOT EXISTS idx_onboarding_steps_agent_name ON onboarding_steps(agent_name);
    CREATE INDEX IF NOT EXISTS idx_review_queue_onboarding_id ON review_queue(onboarding_id);
    CREATE INDEX IF NOT EXISTS idx_review_queue_pending ON review_queue(onboarding_id) WHERE reviewer_action IS NULL;
    CREATE INDEX IF NOT EXISTS idx_onboardings_status ON onboardings(status);
    CREATE INDEX IF NOT EXISTS idx_onboardings_state ON onboardings(state);
  `);
  console.log("[db] migrations + indexes applied");
}
