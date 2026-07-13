# SEO / AEO / GEO Monitor

Cloudflare Workers + D1 application for authenticated SEO target auditing, reports, connector status, and scheduled monitoring. Cloudflare Workers and D1 are the production runtime.

## Requirements

- Node.js 22
- A Cloudflare account with Workers and D1 enabled
- Wrangler 4.110.0
- A D1 database bound as `seo_monitor_db` (the configured database name is also `seo_monitor_db`)

## Secure Admin Bootstrap

There are no usable default credentials. A fresh database requires a Cloudflare Worker secret named `ADMIN_BOOTSTRAP_PASSWORD`; the value must be at least 14 characters. Set `ADMIN_BOOTSTRAP_USER` too when you want an explicit login identifier. Never put production values in `wrangler.toml`, the repository, workflow logs, or GitHub Actions variables. Local development may use distinct non-production values in the ignored `.dev.vars` file; commit only placeholder examples.

Wrangler prompts for secret values without placing them in the command itself:

```bash
npx wrangler@4.110.0 secret put ADMIN_BOOTSTRAP_PASSWORD
npx wrangler@4.110.0 secret put ADMIN_BOOTSTRAP_USER
```

`ADMIN_BOOTSTRAP_USER` is optional, but setting it is recommended for an unambiguous first login. Configure the secrets before the first authentication request. When `admin_users` is empty, the Worker creates one owner from the bootstrap values; it refuses bootstrap when the password is absent or shorter than 14 characters. Bootstrap values never overwrite an existing non-legacy administrator.

After the owner can sign in, remove the password secret so it is not retained as standing bootstrap material:

```bash
npx wrangler@4.110.0 secret delete ADMIN_BOOTSTRAP_PASSWORD
```

Keep at least one working owner account before deleting it. The optional username secret can also be deleted after bootstrap.

## Legacy Upgrade

Older deployments may contain an account whose password uses the historical SHA-256 format. Existing accounts are preserved so an upgrade cannot lock out production administrators. After a successful login, the Worker immediately replaces that account's stored verifier with a per-account PBKDF2-SHA256 verifier; the plaintext password is never stored.

1. Export the remote D1 database as described below.
2. Apply `schema.sql`, then deploy the hardened Worker.
3. Sign in once with each existing administrator account to trigger the transparent password-hash upgrade.
4. Create a new owner/admin with a unique password of at least 14 characters, verify that login, and retire any historical shared credential operationally.

`ADMIN_BOOTSTRAP_PASSWORD` is used only when `admin_users` is empty. It does not overwrite or replace an existing account. This keeps D1 upgrades non-destructive while requiring operators to rotate legacy credentials promptly.

## Security Controls

Authentication is rate limited by both IP address and IP-plus-username. Requests over the applicable limit receive `429 Too Many Requests` with a `Retry-After` header. Audits use an expiring per-host lock; a duplicate concurrent audit receives `409 Conflict`. These controls are defense in depth, and Cloudflare WAF/rate-limiting rules should still be configured for the public hostname.

User-supplied audit URLs and connector endpoints are treated as SSRF inputs. Outbound requests are restricted to HTTP(S) public destinations; loopback, private, link-local, reserved, localhost-style, credential-bearing, and unsafe IP-literal destinations are rejected. Redirect targets are validated again, and outbound requests use bounded redirects, timeouts, and response-size limits. Do not weaken these checks to reach a private service; publish a narrowly scoped authenticated gateway instead.

Sessions are stored as hashes in D1 and delivered in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Administrative and monitoring data endpoints require an authenticated session.

## D1 Setup And Non-Destructive Upgrades

The schema uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`; applying it adds missing objects without dropping tables or deleting rows. Export production data before every schema change:

```bash
npx wrangler@4.110.0 d1 export seo_monitor_db --remote --output=./seo_monitor_db-backup.sql
npx wrangler@4.110.0 d1 execute seo_monitor_db --remote --file=./schema.sql
```

Do not use `DROP TABLE`, database reset commands, or a local database as the source of truth for a production upgrade. Review `schema.sql` before execution and verify the target database name and account. Cloudflare D1 Time Travel provides additional recovery, but it does not replace validating an export.

For a fresh environment, create the D1 database, update the `database_id` in `wrangler.toml`, apply `schema.sql`, configure bootstrap secrets, and then deploy.

## Deployment

Manual deployment:

```bash
npx wrangler@4.110.0 deploy
```

The Worker runs its scheduled monitor every 10 minutes through the Cron Trigger in `wrangler.toml`.

The GitHub Actions workflow at `.github/workflows/deploy-worker.yml` deploys pushes to `main`. Configure these GitHub repository secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Use a narrowly scoped Cloudflare API token that can deploy this Worker. Runtime secrets such as `ADMIN_BOOTSTRAP_PASSWORD` belong in Cloudflare Worker secrets, not GitHub repository secrets. The workflow has read-only repository permissions and pins its actions and Wrangler version to immutable releases.

## Endpoints

The deployed Worker serves the web UI at `/`. Unless noted otherwise, API routes require an authenticated session.

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Login and application UI |
| `GET` | `/health` | Public | Service health and version |
| `POST` | `/api/login` | Public, rate limited | Create a session |
| `POST` | `/api/logout` | Session cookie | Delete the current session |
| `GET` | `/api/session` | Public | Return current authentication state |
| `GET` | `/api/targets` | Required | List monitored targets |
| `POST` | `/api/targets` | Required, per-host lock | Add and audit a target |
| `DELETE` | `/api/targets/:id` | Required | Delete a target and its reports/logs |
| `GET` | `/api/logs` | Required | List monitor logs |
| `GET` | `/api/reports` | Required | List audit reports |
| `GET` | `/api/reports/:id` | Required | Read one audit report |
| `GET` | `/api/admins` | Required | List administrators without password hashes |
| `POST` | `/api/admins` | Required | Create an administrator |
| `GET` | `/api/integrations` | Required | List connector configuration and status |
| `POST` | `/api/integrations` | Required | Configure a connector endpoint |

Example target request body:

```json
{
  "url": "https://example.com"
}
```

## Live Worker

The configured production Worker is:

```text
https://seomonitor-api.davegail9991.workers.dev
```

Treat the production URL as operational metadata only; never add credentials, session cookies, API tokens, or secret values to this README.
