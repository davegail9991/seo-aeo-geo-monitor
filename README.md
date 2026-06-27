# SEO / AEO / GEO Monitor

Cloudflare Workers + D1 backend for tracking monitored SEO targets and scheduled search/AI visibility logs.

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
