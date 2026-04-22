CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES onboarding_steps(id),
  onboarding_id UUID NOT NULL REFERENCES onboardings(id),
  artifact_type TEXT NOT NULL,
  artifact_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_artifacts_step_id ON artifacts(step_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_onboarding_id ON artifacts(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON artifacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_step_sha ON artifacts(step_id, sha256);
