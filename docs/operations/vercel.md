# Vercel deployment

Target project: `zpee/wsrms-inventory`. Production URL: https://wsrms-inventory.vercel.app. Deploy from the `wsrms` repository root. The existing `vercel.json` builds the Vite client and routes `/api/*` to the Express API function.

## Requirements

- Access to the existing Vercel project; authenticate with `npx vercel login`.
- Node.js 24.x in Vercel project settings.
- A hosted PostgreSQL database reachable from Vercel. A local `localhost` database will not work.
- Set private server environment variables in Vercel; never use `VITE_` for database credentials or passwords.

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | Hosted PostgreSQL connection; use Neon's pooled URL when available |
| `DATABASE_URL_UNPOOLED` | Direct PostgreSQL connection for initialization/migrations on Neon |
| `NODE_ENV` | `production` |
| `SEED_DEMO` | `false` |
| `APP_ORIGIN` | Canonical production HTTPS URL, without a trailing slash |
| `ADMIN_PASSWORD` | Strong private initial administrator password |
| `STAFF_PASSWORD` | Strong private initial staff password |
| `BACKUP_INTERVAL_HOURS` | `0` on Vercel |
| `BACKUP_WARNING_HOURS` | `6`, or the warehouse's monitoring threshold |

Initial account password variables seed a new database; they do not change passwords of existing users. Change existing demonstration credentials before production use. Use a separate database for preview deployments so preview initialization and warehouse transactions cannot modify production records.

Build settings: framework Vite, install `npm ci --include=dev`, build `npm run build`, output `client/dist`. Keep the API rewrites and database include rule in `vercel.json`. Root Directory is `.` when importing the `wsrms-inventory` repository.

## Deploy and verify

```powershell
npx vercel link --project wsrms-inventory --scope zpee
npx vercel deploy --scope zpee
# After checking the preview and production environment configuration:
npx vercel deploy --prod --scope zpee
```

Set environment variables through Vercel project settings or `vercel env add`. Do not paste secrets into source files or command arguments. Redeploy after changing environment variables.

Verify login, role restrictions, check-in compatibility, route visibility, QR-gated dispatch, profile image requests, and database health. Confirm the production URL matches `APP_ORIGIN`. The database health screen should show real worker results or Unavailable until a worker is configured.

## Backup host

Vercel hosts the UI and transactional API. Run backups on the backup VPS with Node.js 24, PostgreSQL client tools, and durable recovery storage. Use the same primary `wsrms_inventory_db` connection and set `BACKUP_DATABASE_URL` to the separate `wsrms_inventory_backup` server only on that host. Run `npm run db:backup-worker` under a service manager, or the persistent administrative application with its schedule enabled. See [Backup and recovery](recovery.md).

Vercel local backup and restore actions are disabled. It reads monitoring metadata written by the backup worker. No replication or automatic failover is provisioned by deploying this application.

References: [Vercel CLI deployment](https://vercel.com/docs/cli/deploy), [environment variables](https://vercel.com/docs/environment-variables), [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), and [function runtime filesystem limits](https://vercel.com/docs/functions/runtimes).
