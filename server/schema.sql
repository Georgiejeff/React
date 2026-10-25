CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('Text to video', 'Image to video', 'Video to video', 'Text to image')),
  provider TEXT NOT NULL DEFAULT 'Comfy Cloud',
  status TEXT NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Processing', 'Completed', 'Failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  duration_seconds INTEGER NOT NULL DEFAULT 6,
  provider_job_id TEXT,
  output_url TEXT,
  error_message TEXT,
  owner_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS render_jobs_created_at_idx ON render_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS render_jobs_status_idx ON render_jobs (status);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs (created_at DESC);
