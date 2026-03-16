import { Hono } from "hono";
import type { Env } from "../types";
import type { ClusterPoint, ClustersResponse } from "@vibe/shared-types";

const clusters = new Hono<{ Bindings: Env }>();

function zoomToGeohashPrecision(zoom: number): number {
  if (zoom <= 3) return 2;
  if (zoom <= 6) return 3;
  return 4;
}

function zoomToKvKey(zoom: number): string {
  if (zoom <= 3) return "clusters:1-3";
  if (zoom <= 6) return "clusters:4-6";
  return "clusters:7-10";
}

clusters.get("/", async (c) => {
  const zoom = parseInt(c.req.query("zoom") || "3", 10);
  const clampedZoom = Math.max(1, Math.min(18, zoom));
  const kvKey = zoomToKvKey(clampedZoom);

  const cached = await c.env.KV.get(kvKey, "json");

  if (cached) {
    return c.json(cached);
  }

  const tenMinAgo = Math.floor(Date.now() / 1000) - 600;
  const precision = zoomToGeohashPrecision(clampedZoom);

  const { results } = await c.env.DB.prepare(
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
    .bind(precision, tenMinAgo)
    .all<{
      gh_prefix: string;
      city: string | null;
      country_code: string | null;
      avg_lat: number;
      avg_lng: number;
      count: number;
      all_tools: string;
    }>();

  const clusterPoints: ClusterPoint[] = results.map((row) => {
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

    return {
      lat: row.avg_lat,
      lng: row.avg_lng,
      count: row.count,
      tools,
      city: row.city,
      country: row.country_code,
    } as ClusterPoint;
  });

  const totalActive = clusterPoints.reduce((sum, cp) => sum + cp.count, 0);

  const response: ClustersResponse = {
    clusters: clusterPoints,
    total_active: totalActive,
    last_updated: new Date().toISOString(),
  };

  return c.json(response);
});

export { clusters };
