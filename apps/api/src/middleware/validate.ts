import { Context, Next } from "hono";
import { KNOWN_TOOLS, type ToolId } from "@vibe/shared-types";

const KNOWN_SET = new Set<string>(KNOWN_TOOLS);
const MAX_TOOLS = 10;
const ANON_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const { tools, anon_id } = body as { tools?: unknown; anon_id?: unknown };

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

  c.set("anonId", anon_id);
  c.set("validTools", [...new Set(validTools)]);
  c.set("heartbeatBody", body as Record<string, unknown>);
  await next();
}
