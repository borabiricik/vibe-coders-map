import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

import SEED_LOCATIONS from "../test/seed-locations.json" with { type: "json" };

const API_BASE_URL = process.env.LOCAL_API_URL ?? "http://127.0.0.1:8787";
const API_DIR = new URL("..", import.meta.url);
const WAIT_TIMEOUT_MS = Number(process.env.LOCAL_PIPELINE_TIMEOUT_MS ?? "90000");
const POLL_INTERVAL_MS = 3000;

// Keep in sync with @vibe/shared-types KNOWN_TOOLS
const KNOWN_TOOLS = [
  "aider",
  "antigravity",
  "claude_code",
  "cline",
  "codex",
  "continue",
  "cursor",
  "zed",
];

const COUNTRY_EXPECTATIONS = {
  TR: 4,
  GB: 3,
  US: 6,
  CN: 3,
  AU: 3,
};

const REGION_EXPECTATIONS = {
  "TR-34": 1,
  "GB-ENG": 2,
  "US-CA": 2,
  "CN-44": 1,
};

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runLocalQuery(sql) {
  const output = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "vibe-coders-db", "--local", "--json", "--command", sql],
    {
      cwd: API_DIR,
      encoding: "utf8",
    },
  );

  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].success) {
    throw new Error(`Local D1 query failed: ${output}`);
  }

  return parsed[0].results ?? [];
}

async function fetchJson(pathname) {
  const response = await fetch(`${API_BASE_URL}${pathname}`);
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`);
  }
  return response.json();
}

async function ensureLocalApiRunning() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Local API is not healthy at ${API_BASE_URL}`);
  }
}

async function postHeartbeat(location, anonId, tool) {
  const response = await fetch(`${API_BASE_URL}/api/v1/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Test-Geo": "1",
    },
    body: JSON.stringify({
      anon_id: anonId,
      tools: [tool],
      lat: location.lat,
      lng: location.lng,
      city: location.city,
      country: location.country,
      region_code: location.region_code || undefined,
    }),
  });

  if (response.status !== 204) {
    throw new Error(`Heartbeat failed for ${location.city}: ${response.status}`);
  }
}

async function waitFor(label, check) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < WAIT_TIMEOUT_MS) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await sleep(POLL_INTERVAL_MS);
    }
  }

  throw new Error(`${label} did not become healthy in time: ${lastError?.message ?? lastError}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  await ensureLocalApiRunning();

  const seedHeartbeats = SEED_LOCATIONS.map((location, index) => ({
    anonId: randomUUID(),
    tool: KNOWN_TOOLS[index % KNOWN_TOOLS.length],
    location,
  }));
  const expectedToolCounts = seedHeartbeats.reduce((acc, heartbeat) => {
    acc[heartbeat.tool] = (acc[heartbeat.tool] ?? 0) + 1;
    return acc;
  }, {});

  for (const heartbeat of seedHeartbeats) {
    await postHeartbeat(heartbeat.location, heartbeat.anonId, heartbeat.tool);
  }

  const insertedRows = runLocalQuery(
    `SELECT COUNT(DISTINCT anon_id) AS count
     FROM heartbeats
     WHERE anon_id IN (${seedHeartbeats.map((item) => sqlString(item.anonId)).join(", ")})`,
  );
  const insertedCount = insertedRows[0]?.count ?? 0;
  assert(insertedCount === seedHeartbeats.length, `Expected 50 inserted rows, got ${insertedCount}`);

  const stats = await waitFor("stats aggregation", async () => {
    const data = await fetchJson("/api/v1/stats");
    assert(typeof data.total_active === "number", "stats.total_active must be a number");
    assert(data.total_active >= insertedCount, "stats.total_active does not include inserted rows");

    for (const [country, minCount] of Object.entries(COUNTRY_EXPECTATIONS)) {
      assert(
        Number(data.by_country?.[country] ?? 0) >= minCount,
        `stats.by_country.${country} is below expected minimum ${minCount}`,
      );
    }

    for (const tool of KNOWN_TOOLS) {
      const expectedCount = expectedToolCounts[tool] ?? 0;
      assert(
        Number(data.by_tool?.[tool] ?? 0) >= expectedCount,
        `stats.by_tool.${tool} is below expected minimum ${expectedCount}`,
      );
    }

    return data;
  });

  const choropleth = await waitFor("choropleth aggregation", async () => {
    const data = await fetchJson("/api/v1/choropleth");

    for (const [country, minCount] of Object.entries(COUNTRY_EXPECTATIONS)) {
      assert(
        Number(data.countries?.[country]?.count ?? 0) >= minCount,
        `choropleth.countries.${country} is below expected minimum ${minCount}`,
      );
    }

    for (const [region, minCount] of Object.entries(REGION_EXPECTATIONS)) {
      assert(
        Number(data.regions?.[region]?.count ?? 0) >= minCount,
        `choropleth.regions.${region} is below expected minimum ${minCount}`,
      );
    }

    return data;
  });

  const clusters = await waitFor("cluster aggregation", async () => {
    const data = await fetchJson("/api/v1/clusters?zoom=8");
    assert(Array.isArray(data.clusters), "clusters.clusters must be an array");
    assert(data.total_active >= insertedCount, "clusters.total_active does not include inserted rows");
    assert(data.clusters.length >= 20, "clusters result is unexpectedly sparse");

    const clusterCountries = new Set(
      data.clusters.map((cluster) => cluster.country).filter((country) => typeof country === "string"),
    );
    for (const country of ["TR", "GB", "US", "CN", "AU"]) {
      assert(clusterCountries.has(country), `No cluster found for ${country}`);
    }

    return data;
  });

  console.log(
    JSON.stringify(
      {
        inserted_count: insertedCount,
        api_base_url: API_BASE_URL,
        stats_total_active: stats.total_active,
        choropleth_countries: Object.keys(choropleth.countries).length,
        choropleth_regions: Object.keys(choropleth.regions).length,
        cluster_count: clusters.clusters.length,
        cluster_total_active: clusters.total_active,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
