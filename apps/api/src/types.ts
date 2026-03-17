export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  HEARTBEAT_RATE_LIMITER: RateLimit;
}

export interface HeartbeatRow {
  id: number;
  anon_id: string;
  tools: string;
  lat: number;
  lng: number;
  city: string | null;
  country_code: string | null;
  region_code: string | null;
  geohash: string;
  created_at: number;
}

export interface AggregatedRow {
  gh_prefix: string;
  city: string | null;
  country_code: string | null;
  avg_lat: number;
  avg_lng: number;
  count: number;
  all_tools: string;
}
