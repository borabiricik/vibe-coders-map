import { Hono } from "hono";
import type { Env } from "../types";
import type { ChoroplethResponse, RegionData, ToolId } from "@vibe/shared-types";
import { KNOWN_TOOLS } from "@vibe/shared-types";

const choropleth = new Hono<{ Bindings: Env }>();

function getDominantTool(tools: Record<string, number>): ToolId {
  let max = 0;
  let dominant: ToolId = KNOWN_TOOLS[0];
  for (const [tool, count] of Object.entries(tools)) {
    if (count > max) {
      max = count;
      dominant = tool as ToolId;
    }
  }
  return dominant;
}

choropleth.get("/", async (c) => {
  const cached = await c.env.KV.get("choropleth", "json");
  if (cached) {
    return c.json(cached);
  }

  const tenMinAgo = Math.floor(Date.now() / 1000) - 600;

  const { results } = await c.env.DB.prepare(
    `SELECT country_code, region_code, tools
     FROM heartbeats
     WHERE created_at > ? AND country_code IS NOT NULL`,
  )
    .bind(tenMinAgo)
    .all<{ country_code: string; region_code: string | null; tools: string }>();

  const countryToolCounts = new Map<string, { count: number; tools: Record<string, number> }>();
  const regionToolCounts = new Map<string, { count: number; tools: Record<string, number> }>();

  for (const row of results) {
    let parsed: string[];
    try {
      parsed = JSON.parse(row.tools);
    } catch {
      continue;
    }

    const ce = countryToolCounts.get(row.country_code) ?? { count: 0, tools: {} };
    ce.count++;
    for (const t of parsed) ce.tools[t] = (ce.tools[t] || 0) + 1;
    countryToolCounts.set(row.country_code, ce);

    if (row.region_code) {
      const regionKey = `${row.country_code}-${row.region_code}`;
      const re = regionToolCounts.get(regionKey) ?? { count: 0, tools: {} };
      re.count++;
      for (const t of parsed) re.tools[t] = (re.tools[t] || 0) + 1;
      regionToolCounts.set(regionKey, re);
    }
  }

  const countries: Record<string, RegionData> = {};
  for (const [code, agg] of countryToolCounts) {
    countries[code] = { count: agg.count, dominantTool: getDominantTool(agg.tools) };
  }

  const regions: Record<string, RegionData> = {};
  for (const [code, agg] of regionToolCounts) {
    regions[code] = { count: agg.count, dominantTool: getDominantTool(agg.tools) };
  }

  const response: ChoroplethResponse = {
    countries,
    regions,
    last_updated: new Date().toISOString(),
  };

  return c.json(response);
});

export { choropleth };
