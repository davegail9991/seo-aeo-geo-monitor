# SEO / AEO / GEO Monitor

Cloudflare Workers + D1 backend for tracking monitored SEO targets and scheduled search/AI visibility logs.

This project is designed to run on Cloudflare, not as a local FastAPI/SQLite service. GitHub is the source of truth for code, and Cloudflare Workers + D1 are the production runtime.

## Live Worker

https://seomonitor-api.davegail9991.workers.dev

## API

### Health

```http
GET /health
```

### Targets

```http
GET /api/targets
POST /api/targets
```

Example body:

```json
{
  "url": "https://example.com",
  "keyword": "example keyword"
}
```

### Logs

```http
GET /api/logs
```

## Database

D1 database name:

```text
seo_monitor_db
```

Apply the database schema with:

```bash
npx wrangler d1 execute seo_monitor_db --file=./schema.sql --remote
```

## Deploy

```bash
npx wrangler deploy
```

The Worker also runs a scheduled monitor every 10 minutes through Cloudflare Cron Triggers.

Production deployment should be handled through GitHub Actions after Cloudflare secrets are configured.

## GitHub Auto Deploy

This repository includes `.github/workflows/deploy-worker.yml`.

Add these GitHub repository secrets before using automatic deployment:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

After the secrets are configured, every push to `main` deploys the Worker automatically.
