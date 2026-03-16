import { Hono } from "hono";
import ngeohash from "ngeohash";
import type { Env } from "../types";
import { validateHeartbeat } from "../middleware/validate";

const WRITE_COOLDOWN_SECONDS = 5 * 60;

const heartbeat = new Hono<{
  Bindings: Env;
  Variables: { anonId: string; validTools: string[]; heartbeatBody: Record<string, unknown> };
}>();

heartbeat.post("/", validateHeartbeat, async (c) => {
  const anonId: string = c.get("anonId");
  const tools: string[] = c.get("validTools");
  const cf = c.req.raw.cf;
  const body = c.get("heartbeatBody");
  const useTestGeo = c.req.header("X-Test-Geo") === "1";

  let lat: number;
  let lng: number;
  let city: string | null;
  let country: string | null;
  let regionCode: string | null;

  if (useTestGeo && body && typeof body === "object" && "lat" in body && "lng" in body) {
    lat = Number(body.lat) || 0;
    lng = Number(body.lng) || 0;
    city = typeof body.city === "string" ? body.city : null;
    country = typeof body.country === "string" ? body.country : null;
    regionCode = typeof body.region_code === "string" ? body.region_code : null;
  } else {
    lat = cf?.latitude ? parseFloat(cf.latitude as string) : 0;
    lng = cf?.longitude ? parseFloat(cf.longitude as string) : 0;
    city = (cf?.city as string) || null;
    country = (cf?.country as string) || null;
    regionCode = (cf?.regionCode as string) || null;
  }

  const geohash = ngeohash.encode(lat, lng, 6);
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  const now = Math.floor(Date.now() / 1000);

  // The conditional UPSERT keeps the cooldown check and write in one atomic DB operation.
  const result = await c.env.DB.prepare(
    `INSERT INTO heartbeats (anon_id, tools, lat, lng, city, country_code, region_code, geohash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(anon_id) DO UPDATE SET
       tools = excluded.tools,
       lat = excluded.lat,
       lng = excluded.lng,
       city = excluded.city,
       country_code = excluded.country_code,
       region_code = excluded.region_code,
       geohash = excluded.geohash,
       created_at = excluded.created_at
     WHERE heartbeats.created_at <= ?`,
  )
    .bind(
      anonId,
      JSON.stringify(tools),
      roundedLat,
      roundedLng,
      city,
      country,
      regionCode,
      geohash,
      now,
      now - WRITE_COOLDOWN_SECONDS,
    )
    .run();

  if ((result.meta.changes ?? 0) === 0) {
    const existing = await c.env.DB.prepare("SELECT created_at FROM heartbeats WHERE anon_id = ?")
      .bind(anonId)
      .first<{ created_at: number }>();

    const retryAfter = existing
      ? Math.max(existing.created_at + WRITE_COOLDOWN_SECONDS - now, 1)
      : WRITE_COOLDOWN_SECONDS;

    c.header("Retry-After", retryAfter.toString());
    return c.json(
      {
        error: "Write rate limit exceeded",
        retry_after_seconds: retryAfter,
      },
      429,
    );
  }

  return c.body(null, 204);
});

export { heartbeat };
