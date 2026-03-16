CREATE TABLE IF NOT EXISTS heartbeats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tools TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    city TEXT,
    country_code TEXT,
    geohash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_created_at ON heartbeats (created_at);
CREATE INDEX IF NOT EXISTS idx_heartbeats_geohash ON heartbeats (geohash);
CREATE INDEX IF NOT EXISTS idx_heartbeats_country ON heartbeats (country_code);
