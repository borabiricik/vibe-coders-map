import type { Env, AggregatedRow } from "../types";
import type {
  ClusterPoint,
  ClustersResponse,
  ChoroplethResponse,
  RegionData,
  StatsResponse,
  ToolId,
} from "@vibe/shared-types";
import { KNOWN_TOOLS } from "@vibe/shared-types";

interface ZoomConfig {
  key: string;
  precision: number;
}

const ZOOM_CONFIGS: ZoomConfig[] = [
  { key: "clusters:1-3", precision: 2 },
  { key: "clusters:4-6", precision: 3 },
  { key: "clusters:7-10", precision: 4 },
];

const KV_TTL = 120;

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

function buildToolCounts(rows: AggregatedRow[]): ClusterPoint[] {
  const clusterMap = new Map<
    string,
    { lat: number; lng: number; count: number; tools: Record<string, number>; city: string | null; country: string | null }
  >();

  for (const row of rows) {
    const existing = clusterMap.get(row.gh_prefix);
    const tools: Record<string, number> = {};

    if (row.all_tools) {
      for (const chunk of row.all_tools.split("||")) {
        try {
          const parsed: string[] = JSON.parse(chunk);
          for (const tool of parsed) {
            tools[tool] = (tools[tool] || 0) + 1;
          }
        } catch {
          continue;
        }
      }
    }

    if (existing) {
      existing.count += row.count;
      for (const [tool, cnt] of Object.entries(tools)) {
        existing.tools[tool] = (existing.tools[tool] || 0) + cnt;
      }
    } else {
      clusterMap.set(row.gh_prefix, {
        lat: row.avg_lat,
        lng: row.avg_lng,
        count: row.count,
        tools,
        city: row.city,
        country: row.country_code,
      });
    }
  }

  return Array.from(clusterMap.values()) as ClusterPoint[];
}

export async function runAggregation(env: Env) {
  const tenMinAgo = Math.floor(Date.now() / 1000) - 600;
  let totalActive = 0;

  for (const config of ZOOM_CONFIGS) {
    const { results } = await env.DB.prepare(
      `SELECT
        substr(geohash, 1, ?) as gh_prefix,
        MAX(city) as city,
        MAX(country_code) as country_code,
        ROUND(AVG(lat), 2) as avg_lat,
        ROUND(AVG(lng), 2) as avg_lng,
        COUNT(*) as count,
        GROUP_CONCAT(tools, '||') as all_tools
      FROM heartbeats
      WHERE created_at > ?
      GROUP BY gh_prefix`,
    )
      .bind(config.precision, tenMinAgo)
      .all<AggregatedRow>();

    const clusters = buildToolCounts(results);

    if (config.key === "clusters:1-3") {
      totalActive = clusters.reduce((sum, c) => sum + c.count, 0);
    }

    const response: ClustersResponse = {
      clusters,
      total_active: totalActive,
      last_updated: new Date().toISOString(),
    };

    await env.KV.put(config.key, JSON.stringify(response), {
      expirationTtl: KV_TTL,
    });
  }

  const toolStats = await env.DB.prepare(
    `SELECT tools FROM heartbeats WHERE created_at > ?`,
  )
    .bind(tenMinAgo)
    .all<{ tools: string }>();

  const byTool: Record<string, number> = {};
  for (const row of toolStats.results) {
    try {
      const parsed: string[] = JSON.parse(row.tools);
      for (const tool of parsed) {
        byTool[tool] = (byTool[tool] || 0) + 1;
      }
    } catch {
      continue;
    }
  }

  const countryStats = await env.DB.prepare(
    `SELECT country_code, COUNT(*) as count
     FROM heartbeats
     WHERE created_at > ?
     GROUP BY country_code
     ORDER BY count DESC`,
  )
    .bind(tenMinAgo)
    .all<{ country_code: string; count: number }>();

  const byCountry: Record<string, number> = {};
  for (const row of countryStats.results) {
    if (row.country_code) {
      byCountry[row.country_code] = row.count;
    }
  }

  const statsResponse: StatsResponse = {
    total_active: totalActive,
    by_tool: byTool as StatsResponse["by_tool"],
    by_country: byCountry,
    last_updated: new Date().toISOString(),
  };

  await env.KV.put("stats", JSON.stringify(statsResponse), {
    expirationTtl: KV_TTL,
  });

  // --- Choropleth pre-aggregation ---
  const choroplethRows = await env.DB.prepare(
    `SELECT country_code, region_code, tools
     FROM heartbeats
     WHERE created_at > ? AND country_code IS NOT NULL`,
  )
    .bind(tenMinAgo)
    .all<{ country_code: string; region_code: string | null; tools: string }>();

  const countryToolCounts = new Map<string, { count: number; tools: Record<string, number> }>();
  const regionToolCounts = new Map<string, { count: number; tools: Record<string, number> }>();

  for (const row of choroplethRows.results) {
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

  const choroplethResponse: ChoroplethResponse = {
    countries,
    regions,
    last_updated: new Date().toISOString(),
  };

  await env.KV.put("choropleth", JSON.stringify(choroplethResponse), {
    expirationTtl: KV_TTL,
  });

  await env.DB.prepare(
    "DELETE FROM heartbeats WHERE created_at < ?",
  )
    .bind(tenMinAgo)
    .run();
}
