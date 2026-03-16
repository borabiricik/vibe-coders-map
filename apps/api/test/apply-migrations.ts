import { applyD1Migrations, env } from "cloudflare:test";

const testEnv = env as {
  DB: D1Database;
  TEST_MIGRATIONS: Array<{ name: string; queries: string[] }>;
};

await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
