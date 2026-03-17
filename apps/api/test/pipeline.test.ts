import { SELF } from "cloudflare:test";
import { describe, expect, it, beforeAll } from "vitest";
import { KNOWN_TOOLS } from "@vibe/shared-types";
import SEED_LOCATIONS from "./seed-locations.json";

interface StatsResponse {
  total_active: number;
  by_tool: Record<string, number>;
  by_country: Record<string, number>;
  last_updated: number;
}

interface ChoroplethResponse {
  countries: Record<string, { count: number; dominantTool: string }>;
  regions: Record<string, { count: number; dominantTool: string }>;
  last_updated: number;
}

interface ClustersResponse {
  clusters: Array<{
    lat: number;
    lng: number;
    count: number;
    tools: string[];
  }>;
  total_active: number;
  last_updated: number;
}

function randomUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

describe("pipeline", () => {
  beforeAll(async () => {
    for (let i = 0; i < SEED_LOCATIONS.length; i++) {
      const loc = SEED_LOCATIONS[i];
      const tools = [KNOWN_TOOLS[i % KNOWN_TOOLS.length]];
      const res = await SELF.fetch("https://example.com/api/v1/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Test-Geo": "1",
        },
        body: JSON.stringify({
          anon_id: randomUUID(),
          tools,
          lat: loc.lat,
          lng: loc.lng,
          city: loc.city,
          country: loc.country,
          region_code: loc.region_code || undefined,
        }),
      });
      expect(res.status).toBe(204);
    }
  });

  it("stats returns correct total and structure", async () => {
    const res = await SELF.fetch("https://example.com/api/v1/stats");
    expect(res.status).toBe(200);
    const data = await res.json() as StatsResponse;
    expect(data).toHaveProperty("total_active");
    expect(data).toHaveProperty("by_tool");
    expect(data).toHaveProperty("by_country");
    expect(data).toHaveProperty("last_updated");
    expect(typeof data.total_active).toBe("number");
    expect(data.total_active).toBeGreaterThanOrEqual(50);
    expect(typeof data.by_tool).toBe("object");
    expect(typeof data.by_country).toBe("object");
    const countryCodes = Object.keys(data.by_country);
    expect(countryCodes.length).toBeGreaterThan(10);
    expect(data.by_country["TR"]).toBeDefined();
    expect(data.by_country["US"]).toBeDefined();
    expect(data.by_country["GB"]).toBeDefined();
  });

  it("choropleth returns countries and regions", async () => {
    const res = await SELF.fetch("https://example.com/api/v1/choropleth");
    expect(res.status).toBe(200);
    const data = await res.json() as ChoroplethResponse;
    expect(data).toHaveProperty("countries");
    expect(data).toHaveProperty("regions");
    expect(data).toHaveProperty("last_updated");
    expect(typeof data.countries).toBe("object");
    expect(typeof data.regions).toBe("object");
    const countryCodes = Object.keys(data.countries);
    expect(countryCodes.length).toBeGreaterThan(10);
    expect(data.countries["TR"]).toMatchObject({
      count: expect.any(Number),
      dominantTool: expect.any(String),
    });
    const regionKeys = Object.keys(data.regions);
    expect(regionKeys.some((k) => k.startsWith("TR-"))).toBe(true);
  });

  it("clusters returns clusters and total_active", async () => {
    const res = await SELF.fetch("https://example.com/api/v1/clusters?zoom=3");
    expect(res.status).toBe(200);
    const data = await res.json() as ClustersResponse;
    expect(data).toHaveProperty("clusters");
    expect(data).toHaveProperty("total_active");
    expect(data).toHaveProperty("last_updated");
    expect(Array.isArray(data.clusters)).toBe(true);
    expect(data.total_active).toBeGreaterThanOrEqual(50);
    expect(data.clusters.length).toBeGreaterThan(0);
    const first = data.clusters[0];
    expect(first).toHaveProperty("lat");
    expect(first).toHaveProperty("lng");
    expect(first).toHaveProperty("count");
    expect(first).toHaveProperty("tools");
  });

  it("rate limits heartbeat writes after 10 requests per minute for the same user", async () => {
    const anonId = randomUUID();
    const payload = {
      anon_id: anonId,
      tools: [KNOWN_TOOLS[0]],
      lat: 41.01,
      lng: 28.97,
      city: "Istanbul",
      country: "TR",
      region_code: "34",
    };

    for (let i = 0; i < 10; i++) {
      const res = await SELF.fetch("https://example.com/api/v1/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Test-Geo": "1",
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(204);
    }

    const limited = await SELF.fetch("https://example.com/api/v1/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Test-Geo": "1",
      },
      body: JSON.stringify(payload),
    });

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");

    const error = await limited.json<{ error: string; retry_after_seconds: number }>();
    expect(error.error).toBe("Heartbeat rate limit exceeded");
    expect(error.retry_after_seconds).toBe(60);
  });

  it("derives region code from client coordinates without test geo headers", async () => {
    const anonId = randomUUID();
    const response = await SELF.fetch("https://example.com/api/v1/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        anon_id: anonId,
        tools: [KNOWN_TOOLS[0]],
        lat: 40.1885,
        lng: 29.061,
      }),
    });

    expect(response.status).toBe(204);

    const choroplethRes = await SELF.fetch("https://example.com/api/v1/choropleth");
    expect(choroplethRes.status).toBe(200);

    const data = await choroplethRes.json() as ChoroplethResponse;
    expect(data.regions["TR-16"]).toMatchObject({
      count: expect.any(Number),
      dominantTool: expect.any(String),
    });
  });
});
