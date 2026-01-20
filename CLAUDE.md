# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm dev              # Start dev server at http://localhost:3000
pnpm check            # Run linting & formatting checks (Biome)
pnpm check:fix        # Fix all lint/format issues
```

## Build & Deploy Workflow

When user asks to build, push, or deploy, use these `task` commands:

```bash
task dev              # Start dev server (pnpm dev)
task build            # Build container image (tagged with git SHA)
task push             # Push to quay.io/abdalla/pr-dashboard
task deploy           # Full OpenShift deploy (secrets, configmap, app, routes)
task deploy-status    # Show deployment URLs and replica count
task deploy-logs      # Stream pod logs
task rollout          # Restart deployment to pick up new image
task undeploy         # Delete all OpenShift resources
task all              # Build → push → deploy (full workflow)
task status           # Check image exists, oc login, deployment status
```

**Typical deployment flow:**
1. `task build` - builds with current git SHA as tag
2. `task push` - pushes to registry
3. `task deploy` - deploys to OpenShift (or `task rollout` if already deployed)

**Override image tag:** `IMAGE_TAG=v1.0.0 task build`

**Environment:** Assumes `.envrc` is sourced (GITHUB_TOKEN, GITHUB_DASHBOARDS). If tasks fail due to missing env vars, check `.envrc` exists.

## Architecture

Next.js 16 App Router (React 19, TypeScript, Tailwind CSS 4) for displaying GitHub PRs across multiple repositories with multi-dashboard support.

### Data Flow

1. **Authentication**: Dual token sources - `GITHUB_TOKEN` env var (server-side) or browser localStorage (client-side). Server checks `/api/github/auth` on load; if server has token, client uses `'server-configured'` sentinel value.
2. **API Layer** (`app/api/github/`): Server-side routes with caching (5 min PRs, 10 min labels/repos)
   - `pulls/` - Fetches PRs with pagination, supports `?refresh=true` to bypass cache
   - `labels/` - Fetches labels for repos
   - `defaults/` - Returns `GITHUB_DEFAULT_REPOS` and `GITHUB_DASHBOARDS`
   - `auth/` - Returns whether server has a token configured
3. **Hooks** (`app/hooks/`): State management
   - `usePullRequests` - Fetches PRs, auto-fetches all pages for `open` state (up to 10), exposes `refresh()` for cache bypass
   - `useUrlFilters` - Syncs filter state to URL params, loads defaults from server
   - `useRepositories` - Fetches user's repositories when using client-side token
4. **Pages**: Main page (`app/page.tsx`) shows dashboard selector if `GITHUB_DASHBOARDS` configured, otherwise shows PR table. Dynamic dashboards at (`app/[dashboard]/page.tsx`).

### Key Patterns

- **State as tabs, not filters**: PR state (open/closed/merged) is selected via `StateSelector` tabs, not filter chips
- **Server-side caching**: `app/lib/cache.ts` with TTL-based in-memory cache, `cachedAt` timestamp returned to clients
- **Refresh indicator**: Shows data freshness with color-coded timestamp, auto-refresh on tab focus if stale (>5 min)
- **Client-side filtering**: PRs fetched by state from server, then filtered client-side by labels/authors/branches/search

### GitHub Client (`app/lib/github.ts`)

`GitHubClient` class handles GitHub API calls with pagination and rate limit tracking. Transforms GitHub API responses (snake_case) to internal `PullRequest` type (camelCase) via `app/types/index.ts`.

### Types (`app/types/`)

- `github.ts` - Raw GitHub API response types (snake_case)
- `index.ts` - App types (`PullRequest`, `Repository`, `Label`, `FilterOptions`) and transform/rehydrate functions for JSON date handling

## Environment Variables

```bash
GITHUB_TOKEN=ghp_xxx                      # Required: GitHub PAT
GITHUB_DEFAULT_REPOS=org/repo1,org/repo2  # Repos for main dashboard
GITHUB_DASHBOARDS='[{"id":"bots","name":"Bot PRs","repos":"org/repo","filter":"authors=dependabot[bot]"}]'
```

## Multi-Dashboard Configuration

Dashboards are configured via `GITHUB_DASHBOARDS` JSON array. Each dashboard accessible at `/<id>`. Filter params in URL: `labels`, `authors`, `branches`, `search`, `repos`.
