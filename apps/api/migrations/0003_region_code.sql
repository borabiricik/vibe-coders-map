ALTER TABLE heartbeats ADD COLUMN region_code TEXT;
CREATE INDEX IF NOT EXISTS idx_heartbeats_region ON heartbeats (country_code, region_code);
