# Bored Games

A private board game hub for a small group of friends. Its first game is a complete online **Bohnanza** for 3–5
players. It also includes the official AMIGO anniversary variants that work at those player counts.

- Live: https://boredgames.mchowcl.workers.dev
- Stack: Svelte 5 + TypeScript + Vite on the client; Cloudflare Workers + SQLite-backed Durable Objects on the
  server. The rules engine is pure TypeScript.
- Free-tier only. No paid Cloudflare products are used.

## Play

1. Open the site and enter a display name.
2. On the game's crate, choose **Open a table**, or **Practise with bots** to play alone against simple computer
   players. You can add bots from the lobby too.
3. Share the six-letter code or the invite link. Friends join from their own devices.
4. The host picks variants in the lobby and starts the game when 3–5 players are seated.

Each seat is bound to an HttpOnly cookie in the browser that took it. You can refresh, close the tab or lose the
network, then come back and resume. Someone who only knows your name or the room code cannot take your seat.

## Run locally

```sh
npm install        # npm ≥ 11 may ask you to approve workerd/esbuild install scripts (see docs/DEVELOPMENT.md)
npm run dev        # http://localhost:5173 — Vite + the real Workers runtime (Durable Objects included)
```

Open the site in three browser profiles or private windows to play a full table on one machine.

## Test

```sh
npm run check      # svelte-check + worker type-check
npm test           # Vitest: rules, variants, privacy, simulations, room core
npm run test:e2e   # Playwright (uses the Microsoft Edge channel by default; see docs/TESTING.md)
```

## Deploy

```sh
npx wrangler login # once, in your own terminal
npm run deploy     # build + wrangler deploy
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

| Doc | What it covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, the game-module interface, sync protocol, persistence, security |
| [docs/RULES.md](docs/RULES.md) | Base rules as implemented, with rule IDs that tests reference, and every interpretation |
| [docs/VARIANTS.md](docs/VARIANTS.md) | Supported variants, combinations and why some are refused |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup, project layout, how to add a game |
| [docs/TESTING.md](docs/TESTING.md) | Test suites, latest results and performance measurements |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Cloudflare deployment, free-tier budget, retention |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Design and engineering decisions with reasons |
| [docs/ASSETS.md](docs/ASSETS.md) | Asset manifest and how to drop in licensed artwork |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Milestone status and known gaps |
| [AGENTS.md](AGENTS.md) | Working rules for coding agents in this repo |

Bohnanza is a game by Uwe Rosenberg, published by AMIGO and Rio Grande Games. This is an unofficial private project.
All card artwork is original placeholder art (see docs/ASSETS.md).
