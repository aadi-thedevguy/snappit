-- Additive prerequisite for both new web and worker deployments.
-- This is a manual migration because the repository's Drizzle journal is untracked.
-- If you maintain that journal elsewhere, generate the equivalent migration there instead.
ALTER TABLE snappit_videos ADD COLUMN IF NOT EXISTS processing_run_id text;
