# Deployment

One Cloudflare Worker serves the static client (Workers static assets) and the API, and hosts the `RoomDO` Durable
Object class (SQLite storage backend). Everything runs on the **Workers Free plan**. No paid product, binding or
billing upgrade is required. Do not add one without the owner's say-so.

**Current deployment:** https://boredgames.mchowcl.workers.dev (Worker `boredgames`).

**Staging:** https://boredgames-staging.mchowcl.workers.dev (Worker `boredgames-staging`). It has its own Durable Objects
and shares no data with production (D24).

## First-time setup (owner)

1. Create a free Cloudflare account and verify the email.
2. Run `npx wrangler login` in your own terminal. It opens the browser for OAuth, and the credentials stay in your
   user profile, outside this repo.
3. On first deploy, Cloudflare may ask you to choose a `workers.dev` subdomain.

## Deploy

```sh
npm run check && npm test   # don't ship red
npm run deploy              # vite build + wrangler deploy
E2E_BASE_URL=https://<worker>.<subdomain>.workers.dev npx playwright test   # smoke test the live site
```

Deploy to staging first and run the tests there:

```sh
npm run deploy:staging
E2E_BASE_URL=https://boredgames-staging.mchowcl.workers.dev npx playwright test tests/e2e/clockwork.spec.ts --workers=1
```

The staging script builds for staging and stops if the build is for anything else. `npm run deploy` always builds again,
for production, so its output can't carry over from staging.

`wrangler.jsonc` holds the whole configuration: the Durable Object binding `ROOMS`, the migration tag `v1` declaring
`RoomDO` as a SQLite class, SPA fallback for assets, and `run_worker_first` for `/api/*` and `/ws/*`. If you rename or
delete the class later, add a new migration entry. Never edit `v1`.

**Secrets.** None are needed. Session tokens are random per seat, and only their SHA-256 hashes are stored. If a future
feature needs a secret, use `npx wrangler secret put NAME`, and keep local values in `.dev.vars` (git-ignored; see
`.dev.vars.example`).

**Custom domain (optional).** Add a route or custom domain in the Cloudflare dashboard. Cookies are host-only and
`Secure`, so the site must be served over HTTPS. Same-origin checks use the request's own origin, so no configuration
change is needed.

## Free-tier budget

**Limits.** The Workers Free plan limits applied at the time of writing (check the Cloudflare docs before relying on
them) were:

- 100,000 Worker requests per day.
- For Durable Objects on the SQLite backend:
  - 100,000 requests per day.
  - 13,000 GB-s of duration per day.
  - 5 million rows read per day.
  - 100,000 rows written per day.
  - 5 GB of total storage.

**Usage per game.**

- A committed action writes about 5 rows in one transaction: meta, state blob, history, dedupe insert and trim, plus
  an undo row for undoable moves.
- A full 3–5 player game in the browser tests took about 260–400 committed actions. That is about 1,300–2,000 rows
  written, so the write budget allows roughly **50–75 full games per day**.
- WebSocket messages to a Durable Object are billed at 20:1 as requests. Keep-alive pings are answered by the
  hibernation auto-response without waking the object.
- For a private group of about 12 people, this budget is ample.
- If the limits are exceeded, Cloudflare returns errors until the daily reset. It never bills on the Free plan.

## Retention and cleanup

Every committed change re-arms a Durable Object alarm. When it fires, the room deletes all its storage
(`deleteAll()`):

| Room status | Deleted after this long without a change |
|---|---|
| lobby | 24 hours |
| playing | 30 days |
| over | 7 days |

Nothing about a room survives deletion. History rows hold only public information (action kind, seat, public data),
so they never contain hands or deck order. Cookies for deleted rooms simply stop matching anything, and they carry a
`Max-Age`, so browsers drop them.

## Rollback

`npx wrangler deployments list` lists versions, and `npx wrangler rollback <version-id>` restores one. Persisted rooms
carry `schema` and `stateVersion` numbers. When a build meets a room saved with a different
`stateVersion`, it calls the module's `migrate`. Bohnanza's `migrate` only accepts its own version (1) and throws
otherwise, so a build refuses a room it cannot read rather than misreading it.
