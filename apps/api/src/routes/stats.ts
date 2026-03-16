import { Hono } from "hono";
import type { Env } from "../types";
import type { StatsResponse } from "@vibe/shared-types";

const stats = new Hono<{ Bindings: Env }>();

stats.get("/", async (c) => {
  const cached = await c.env.KV.get("stats", "json");

  if (cached) {
    return c.json(cached);
  }

  const tenMinAgo = Math.floor(Date.now() / 1000) - 600;

  const countResult = await c.env.DB.prepare(
    "SELECT COUNT(DISTINCT anon_id) as count FROM heartbeats WHERE created_at > ?",
  )
    .bind(tenMinAgo)
    .first<{ count: number }>();

  const toolRows = await c.env.DB.prepare(
    "SELECT tools FROM heartbeats WHERE created_at > ?",
  )
    .bind(tenMinAgo)
    .all<{ tools: string }>();

  const byTool: Record<string, number> = {};
  for (const row of toolRows.results) {
    try {
      const parsed: string[] = JSON.parse(row.tools);
      for (const tool of parsed) {
        byTool[tool] = (byTool[tool] || 0) + 1;
      }
    } catch {
      continue;
    }
  }

  const countryRows = await c.env.DB.prepare(
    `SELECT country_code, COUNT(*) as count
     FROM heartbeats
     WHERE created_at > ? AND country_code IS NOT NULL
     GROUP BY country_code
     ORDER BY count DESC`,
  )
    .bind(tenMinAgo)
    .all<{ country_code: string; count: number }>();

  const byCountry: Record<string, number> = {};
  for (const row of countryRows.results) {
    byCountry[row.country_code] = row.count;
  }

  const response: StatsResponse = {
    total_active: countResult?.count ?? 0,
    by_tool: byTool as StatsResponse["by_tool"],
    by_country: byCountry,
    last_updated: new Date().toISOString(),
  };

  return c.json(response);
});

export { stats };
