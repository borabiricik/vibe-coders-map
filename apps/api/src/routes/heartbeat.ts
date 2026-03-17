import { Hono } from "hono";
import ngeohash from "ngeohash";
import type { Env } from "../types";
import { resolveRegionFromCoordinates } from "../lib/admin1-lookup";
import { validateHeartbeat } from "../middleware/validate";

function redactAnonId(anonId: string): string {
  return `${anonId.slice(0, 8)}...`;
}

const heartbeat = new Hono<{
  Bindings: Env;
  Variables: { anonId: string; validTools: string[]; heartbeatBody: Record<string, unknown> };
}>();

heartbeat.post("/", validateHeartbeat, async (c) => {
  const anonId: string = c.get("anonId");
  const tools: string[] = c.get("validTools");
  const cf = c.req.raw.cf;
  const body = c.get("heartbeatBody");
  const typedBody = body as Record<string, unknown>;
  const useTestGeo = c.req.header("X-Test-Geo") === "1";
  const hasClientCoordinates =
    typeof typedBody.lat === "number" &&
    Number.isFinite(typedBody.lat) &&
    typeof typedBody.lng === "number" &&
    Number.isFinite(typedBody.lng);
  const rateLimitKey = `heartbeat:${anonId}`;
  const anonIdLog = redactAnonId(anonId);

  console.log({
    event: "heartbeat.received",
    anon_id: anonIdLog,
    tools,
    tool_count: tools.length,
    colo: cf?.colo ?? null,
    city: cf?.city ?? null,
    country: cf?.country ?? null,
    uses_test_geo: useTestGeo,
    uses_client_coordinates: hasClientCoordinates,
  });

  const { success } = await c.env.HEARTBEAT_RATE_LIMITER.limit({ key: rateLimitKey });
  if (!success) {
    console.warn({
      event: "heartbeat.rate_limited",
      anon_id: anonIdLog,
      retry_after_seconds: 60,
    });
    c.header("Retry-After", "60");
    return c.json(
      {
        error: "Heartbeat rate limit exceeded",
        retry_after_seconds: 60,
      },
      429,
    );
  }

  let lat: number;
  let lng: number;
  let city: string | null;
  let country: string | null;
  let regionCode: string | null;
  let locationSource: "test" | "client" | "cloudflare";

  if (useTestGeo && body && typeof body === "object" && "lat" in body && "lng" in body) {
    lat = Number(body.lat) || 0;
    lng = Number(body.lng) || 0;
    city = typeof body.city === "string" ? body.city : null;
    country = typeof body.country === "string" ? body.country : null;
    regionCode = typeof body.region_code === "string" ? body.region_code : null;
    locationSource = "test";
  } else if (hasClientCoordinates) {
    lat = typedBody.lat as number;
    lng = typedBody.lng as number;

    const resolvedRegion = resolveRegionFromCoordinates(lat, lng);
    city = null;
    country = resolvedRegion?.countryCode ?? ((cf?.country as string) || null);
    regionCode = resolvedRegion?.regionCode ?? null;
    locationSource = "client";
  } else {
    lat = cf?.latitude ? parseFloat(cf.latitude as string) : 0;
    lng = cf?.longitude ? parseFloat(cf.longitude as string) : 0;
    city = (cf?.city as string) || null;
    country = (cf?.country as string) || null;
    regionCode = (cf?.regionCode as string) || null;
    locationSource = "cloudflare";
  }

  const geohash = ngeohash.encode(lat, lng, 6);
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  const now = Math.floor(Date.now() / 1000);

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
      city,
      country,
      regionCode,
      geohash,
      now,
    )
    .run();

  console.log({
    event: "heartbeat.persisted",
    anon_id: anonIdLog,
    geohash,
    lat: roundedLat,
    lng: roundedLng,
    country: country,
    region_code: regionCode,
    location_source: locationSource,
  });

  return c.body(null, 204);
});

export { heartbeat };
