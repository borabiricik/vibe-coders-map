# Vibe Coders Map

Vibe Coders Map is a live map of developers using AI coding tools such as Cursor, Claude Code, Windsurf, GitHub Copilot, Aider, Zed, Cline, Roo Code, Continue, and JetBrains AI.

The project combines a lightweight desktop agent, a Cloudflare-powered API, and a Next.js map UI to show real-time activity at both country and admin-1 level.

## What it does

- Detects supported AI coding tools running on a user's machine
- Sends anonymous heartbeats from the desktop app at a fixed interval
- Aggregates live activity in Cloudflare D1 and KV
- Renders a global MapLibre view with live clusters, stats, filters, and choropleth overlays

## Monorepo structure

- `apps/desktop`: Tauri desktop agent that detects tools and sends heartbeats
- `apps/api`: Cloudflare Worker API built with Hono, D1, and KV
- `apps/web`: Next.js frontend that renders the live map
- `packages/shared-types`: Shared TypeScript types, tool metadata, and constants

## Tech stack

- `Next.js 15`, `React 19`, `MapLibre GL`, `TanStack Query`
- `Cloudflare Workers`, `Hono`, `D1`, `KV`
- `Tauri 2`, `Rust`, `React`
- `Turbo` workspaces with a shared TypeScript package

## Quick start

### Prerequisites

- `Node.js 20+`
- `npm 10+`
- `Rust` and `cargo`

Install dependencies from the repo root:

```bash
npm install
```

### One-command local development

The fastest way to run the full stack locally is:

```bash
./dev.sh
```

This script:

- checks required tooling
- installs dependencies if needed
- uses the repo-local Wrangler installation via `npx`
- applies all local D1 migrations automatically
- boots the local Cloudflare Worker on `http://localhost:8787`
- starts the Next.js app on `http://localhost:3000`
- launches the Tauri desktop app
- writes logs into `.dev-logs/`

## Manual local development

If you prefer to run each app yourself:

### 1. Start the API

```bash
cd apps/api
npm run db:migrate:local
npm run dev
```

### 2. Start the web app

In a new terminal:

```bash
cd apps/web
NEXT_PUBLIC_API_URL="http://localhost:8787" npm run dev
```

### 3. Start the desktop agent

In another terminal:

```bash
cd apps/desktop
VIBE_API_URL="http://localhost:8787" npx tauri dev
```

## Useful scripts

From the repo root:

```bash
npm run dev:api
npm run dev:web
npm run build
npm run type-check
```

## Data flow

1. The desktop app detects supported AI coding tools by process name.
2. It generates or reuses an anonymous local ID.
3. Heartbeats are sent to the API when tools are detected.
4. The API stores and aggregates recent activity.
5. The web app fetches cluster, stats, and choropleth data and renders the live map.

## Deployment notes

### API

The API deploys with Cloudflare Workers. The repository keeps safe placeholder IDs in `apps/api/wrangler.toml`, and the GitHub Actions workflow injects the real production binding IDs at deploy time.

Provision these Cloudflare resources in your own account:

- one D1 database
- one KV namespace

Then add these GitHub repository variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_KV_NAMESPACE_ID`

And this GitHub repository secret:

- `CLOUDFLARE_API_TOKEN`

The repository includes a GitHub Actions workflow that:

- injects the real D1 and KV IDs into `wrangler.toml` during CI
- applies all pending D1 migrations remotely
- deploys the Worker with Wrangler

### Web

The web app expects `NEXT_PUBLIC_API_URL` to point to the deployed API.

Web deployment is intentionally not handled by this repository anymore.
Deploy the web app directly from Vercel and set `NEXT_PUBLIC_API_URL` in your Vercel project settings.

### Desktop

The repository includes a release workflow for tagged desktop builds.

The desktop agent now supports a configurable build-time API base URL through `VIBE_API_URL`.

For tagged desktop releases, the workflow writes `apps/desktop/.env.production`
from the `DESKTOP_ENV_PRODUCTION` GitHub secret before building the app.

Example secret value:

```env
VIBE_API_URL=https://your-api.example.com
```

## Known limitations

- Production deploys still require you to create and scope a Cloudflare API token manually.
- `apps/api/wrangler.toml` intentionally keeps placeholder resource IDs so the repo stays fork-friendly and safe to publish.

## Privacy

Vibe Coders Map is designed to collect only the minimum data needed to render live activity.

- No user accounts
- No source code collection
- No project file inspection
- No content from open editors or terminals
- Only tool presence is detected from running processes
- IP address is used for coarse geolocation and is not intended to be stored as user identity

## Current status

The project is already functional as a full-stack prototype with:

- a working desktop agent
- a live web map
- stats and choropleth aggregation
- local development tooling
- CI, API deployment, and desktop release workflows

## Contributing

If you want to experiment locally, start with `./dev.sh`, verify the API and map are running, and then iterate inside the relevant app folder.
