import { Hono } from "hono";
import ngeohash from "ngeohash";
import type { Env } from "../types";
import { validateHeartbeat } from "../middleware/validate";

const heartbeat = new Hono<{ Bindings: Env; Variables: { anonId: string; validTools: string[] } }>();

heartbeat.post("/", validateHeartbeat, async (c) => {
  const anonId: string = c.get("anonId");
  const tools: string[] = c.get("validTools");
  const cf = c.req.raw.cf;

  const lat = cf?.latitude ? parseFloat(cf.latitude as string) : 0;
  const lng = cf?.longitude ? parseFloat(cf.longitude as string) : 0;

  const geohash = ngeohash.encode(lat, lng, 6);
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;

  const regionCode = (cf?.regionCode as string) || null;

  await c.env.DB.prepare(
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
       created_at = excluded.created_at`,
  )
    .bind(
      anonId,
      JSON.stringify(tools),
      roundedLat,
      roundedLng,
      (cf?.city as string) || null,
      (cf?.country as string) || null,
      regionCode,
      geohash,
      Math.floor(Date.now() / 1000),
    )
    .run();

  return c.body(null, 204);
});

export { heartbeat };
