import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { heartbeat } from "./routes/heartbeat";
import { clusters } from "./routes/clusters";
import { choropleth } from "./routes/choropleth";
import { stats } from "./routes/stats";
import { runAggregation } from "./cron/aggregate";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: [
      "https://vibecodersmap.com",
      "https://vibe-coders-map-web.vercel.app",
      "http://localhost:3000",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Test-Geo"],
    maxAge: 86400,
  }),
);

app.get("/health", (c) => c.json({ status: "ok", ts: Date.now() }));

app.route("/api/v1/heartbeat", heartbeat);
app.route("/api/v1/clusters", clusters);
app.route("/api/v1/choropleth", choropleth);
app.route("/api/v1/stats", stats);

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runAggregation(env));
  },
};
