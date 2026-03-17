import { Context, Next } from "hono";
import { KNOWN_TOOLS, type ToolId } from "@vibe/shared-types";

const KNOWN_SET = new Set<string>(KNOWN_TOOLS);
const MAX_TOOLS = 10;
const ANON_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;

export async function validateHeartbeat(c: Context, next: Next) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (!body || typeof body !== "object") {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const { tools, anon_id, lat, lng } = body as {
    tools?: unknown;
    anon_id?: unknown;
    lat?: unknown;
    lng?: unknown;
  };

  if (typeof anon_id !== "string" || !ANON_ID_RE.test(anon_id)) {
    return c.json({ error: "anon_id must be a valid UUID v4" }, 400);
  }

  if (!Array.isArray(tools) || tools.length === 0 || tools.length > MAX_TOOLS) {
    return c.json({ error: "tools must be an array of 1-10 items" }, 400);
  }

  const validTools = tools.filter(
    (t): t is ToolId => typeof t === "string" && KNOWN_SET.has(t),
  );

  if (validTools.length === 0) {
    return c.json({ error: "No recognized tools" }, 400);
  }

  const hasLat = lat !== undefined;
  const hasLng = lng !== undefined;

  if (hasLat !== hasLng) {
    return c.json({ error: "lat and lng must be provided together" }, 400);
  }

  if (hasLat && hasLng) {
    if (
      typeof lat !== "number" ||
      !Number.isFinite(lat) ||
      lat < MIN_LAT ||
      lat > MAX_LAT ||
      typeof lng !== "number" ||
      !Number.isFinite(lng) ||
      lng < MIN_LNG ||
      lng > MAX_LNG
    ) {
      return c.json({ error: "lat and lng must be valid coordinates" }, 400);
    }
  }

  c.set("anonId", anon_id);
  c.set("validTools", [...new Set(validTools)]);
  c.set("heartbeatBody", body as Record<string, unknown>);
  await next();
}
