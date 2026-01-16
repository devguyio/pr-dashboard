# PR Dashboard

Multi-dashboard GitHub PR monitor. Fully configurable.

Forked from [mattmontgomery/pr-dashboard](https://github.com/mattmontgomery/pr-dashboard).

## Features

- **Multi-Dashboard Support** - Configure multiple dashboards with different repository sets and default filters
- **URL-Based Filter State** - Share filtered views via URL parameters
- **Advanced Filtering** - Filter by state, labels, authors, branches, and search text
- **Label Grouping** - Group PRs by label prefixes for organized views
- **PR Age Highlighting** - Visual indicators for PRs older than 7 days
- **Server-Side Caching** - Reduces GitHub API calls with configurable TTL

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4

## Quick Start

### Prerequisites

- Node.js 20.x or later
- pnpm

### Local Development

```bash
# Install dependencies
pnpm install

# Configure environment (see envrc.example)
cp envrc.example .envrc
vim .envrc  # Set GITHUB_TOKEN and other values
direnv allow

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token (required) | `ghp_xxxx` |
| `GITHUB_DEFAULT_REPOS` | Comma-separated list of repos for the main dashboard | `openshift/hypershift,org/repo2` |
| `GITHUB_DASHBOARDS` | JSON array of dashboard configurations | See below |

### Dashboard Configuration

Configure multiple dashboards via the `GITHUB_DASHBOARDS` environment variable:

```json
[
  {
    "id": "hypershift",
    "name": "HyperShift PRs",
    "repos": "openshift/hypershift",
    "filter": "states=open"
  },
  {
    "id": "bot-prs",
    "name": "Bot PRs",
    "repos": "openshift/hypershift",
    "filter": "states=open&authors=dependabot[bot],renovate[bot]"
  },
  {
    "id": "docs",
    "name": "Documentation",
    "repos": "openshift/hypershift",
    "filter": "states=open&labels=area/documentation"
  }
]
```

Each dashboard is accessible at `/<dashboard-id>` (e.g., `/hypershift`, `/bot-prs`).

### Filter URL Parameters

Filters are synced to URL for easy sharing:

- `states` - PR states: `open`, `closed`, `merged` (comma-separated)
- `labels` - Label names (comma-separated, AND logic)
- `authors` - Author logins (comma-separated)
- `branches` - Target branches (comma-separated)
- `search` - Search query

Example: `/?states=open&labels=area/aws,priority/critical&authors=user1`

## Build & Deploy

The application is currently deployed on OpenShift. A `Taskfile.yml` is provided for build and deployment automation.

### Prerequisites

- [go-task](https://taskfile.dev/) - `brew install go-task`
- [gum](https://github.com/charmbracelet/gum) - `brew install gum`
- [podman](https://podman.io/) - `brew install podman`
- [direnv](https://direnv.net/) - `brew install direnv`
- `oc` CLI for OpenShift deployment

### Environment Setup

```bash
# Copy the example and fill in your values
cp envrc.example .envrc
vim .envrc

# Allow direnv to load the environment
direnv allow
```

### Available Tasks

```bash
task --list
```

| Task | Description |
|------|-------------|
| `dev` | Run development server |
| `build` | Build container image with podman |
| `push` | Push image to registry |
| `container-run` | Run container locally |
| `container-stop` | Stop local container |
| `container-logs` | Show local container logs |
| `deploy` | Deploy to OpenShift (secrets, configmap, app, route) |
| `deploy-custom-domain` | Create route for custom domain with optional TLS |
| `deploy-status` | Show deployment status |
| `deploy-logs` | Stream pod logs |
| `rollout` | Restart deployment |
| `undeploy` | Delete all resources |
| `status` | Show environment status |
| `all` | Build, push, and deploy |

### Container Build

```bash
# Build with default settings (quay.io/abdalla/pr-dashboard:latest)
task build

# Override image settings
IMAGE_REGISTRY=quay.io IMAGE_REPO=myorg IMAGE_TAG=v1.0.0 task build

# Push to registry
task push
```

### OpenShift Deployment

```bash
# Create the namespace (if it doesn't exist)
oc new-project pr-dashboard

# Ensure environment is configured (via direnv or .envrc)
# Edit GITHUB_TOKEN, GITHUB_DEFAULT_REPOS, GITHUB_DASHBOARDS in .envrc

# Deploy
task deploy

# Check status
task deploy-status
```

### Custom Domain with TLS

To use a custom domain (e.g., `pr.hypershift.dev`):

1. **Add CNAME record** in your DNS provider:
   ```
   pr  CNAME  <your-openshift-route-hostname>
   ```

2. **Get TLS certificate** from Let's Encrypt:
   ```bash
   sudo certbot certonly --manual --preferred-challenges dns -d pr.hypershift.dev
   ```

3. **Deploy with certificate**:
   ```bash
   # Set in .envrc or export directly
   export TLS_CERT="/etc/letsencrypt/live/pr.hypershift.dev/fullchain.pem"
   export TLS_KEY="/etc/letsencrypt/live/pr.hypershift.dev/privkey.pem"

   task deploy-custom-domain
   ```

Note: Let's Encrypt certificates expire every 90 days and require manual renewal.

## Project Structure

```
pr-dashboard/
├── app/
│   ├── [dashboard]/       # Dynamic dashboard routes
│   ├── api/github/        # GitHub API routes with caching
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and cache
│   └── types/             # TypeScript definitions
├── envrc.example         # direnv environment template
├── Containerfile          # Multi-stage container build (UBI9)
├── Taskfile.yml           # Build and deploy automation
└── README.md
```

## License

This project is open source and available under the MIT License.
