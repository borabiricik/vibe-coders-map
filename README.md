# Vibe Coders Map

A live global map showing developers using AI coding tools like Cursor, Claude Code, Windsurf, and more.

## Architecture

- **Desktop Agent** (`apps/desktop`): Tauri 2.0 app that detects running AI coding tools and sends anonymous heartbeats
- **Backend API** (`apps/api`): Cloudflare Workers (Hono + D1 + KV) that ingests heartbeats and serves aggregated cluster data
- **Map Frontend** (`apps/web`): Next.js app with MapLibre GL JS showing live clusters on a world map
- **Shared Types** (`packages/shared-types`): Common TypeScript types and constants

## Getting Started

### Prerequisites

- Node.js 20+
- Rust (for desktop app)
- Wrangler CLI (`npm i -g wrangler`)

### Install dependencies

```bash
npm install
```

### Development

```bash
# Backend API (Cloudflare Workers local dev)
cd apps/api
npm run db:migrate:local
npm run dev

# Web Frontend
cd apps/web
npm run dev

# Desktop App
cd apps/desktop
npm run tauri dev
```

### Deployment

- **API**: Push to `main` triggers `wrangler deploy` via GitHub Actions
- **Web**: Connected to Vercel for auto-deploy on push
- **Desktop**: Create a Git tag (`v*`) to trigger multi-platform builds

## Privacy

- No user accounts or registration
- IP address used only for city-level geolocation, never stored
- Only process names are detected, no file contents or project info
- Users can disable sharing at any time
