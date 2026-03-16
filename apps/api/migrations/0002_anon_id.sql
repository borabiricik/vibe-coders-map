ALTER TABLE heartbeats ADD COLUMN anon_id TEXT NOT NULL DEFAULT 'legacy';

-- Assign unique IDs to any existing rows so the unique index can be created
UPDATE heartbeats SET anon_id = 'legacy-' || id WHERE anon_id = 'legacy';

CREATE UNIQUE INDEX IF NOT EXISTS idx_heartbeats_anon_id ON heartbeats (anon_id);
