# Bored Games

**Real-time multiplayer card and board games in the browser.** Create a table, share a six-letter code, and play
from any laptop or phone. No accounts, no installs.

**[Play now →](https://boredgames.mchowcl.workers.dev)**

## Games

| Game | Players | What it is |
|---|---|---|
| **Bohnanza** | 3–5 | The bean-trading classic, with the official AMIGO anniversary variants that suit those counts |
| **Kingdom & Commerce** | 2–6 | An original medieval deck-builder |
| **Miners & Saboteurs** | 2–10 | An original hidden-role tunnel-laying game in three modes: Classic, Expanded and a two-player Duel |
| **Sealed Correspondence** | 2–6 | An original deduction game of sealed letters at a Renaissance court |
| **Palazzo** | 2–6 | An original hidden-influence bluffing game: claim any role, and anyone may call your bluff |
| **Dead Drop** | 2 | An original Cold War game of secret orders and bluffing *(in preview, staging only)* |

Every game has a searchable in-game guide with three levels of detail. Open it with **?** at the table, or from the
game's panel on the home page. Short on players? Every table can be filled with computer opponents.

## Features

- **Instant rooms.** Enter a display name, open a table and share the code or invite link. The host sets the options
  in the lobby and starts when enough players are seated.
- **Seamless reconnects.** Each seat is bound to an HttpOnly cookie in the browser that took it. Refresh, close the
  tab or drop off the network, then pick up where you left off. Knowing your name or the room code is not enough to
  take your seat.
- **Fair by construction.** The server is the sole authority on legality, shuffling and scoring. Each player receives
  only their own view of the game, so hidden hands and the deck never reach another browser.
- **Practise solo.** Play a full game against bots, or add them to a lobby to fill empty seats.
- **Accessible motion.** Animations respect reduced-motion settings and can be shortened or turned off.

## How it works

| Layer | Technology |
|---|---|
| Client | Svelte 5, TypeScript, Vite, plain CSS with design tokens |
| Server | Cloudflare Workers with SQLite-backed Durable Objects, one per room |
| Rules | Pure TypeScript engines with no UI or platform dependencies, shared by server and tests |

The client renders confirmed state and sends intents; it never decides an outcome itself. The whole project runs on
Cloudflare's free tier. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the sync protocol, persistence and
security model.

## Getting started

```sh
npm install        # npm ≥ 11 may ask you to approve workerd/esbuild install scripts (see docs/DEVELOPMENT.md)
npm run dev        # http://localhost:5173 — Vite + the real Workers runtime (Durable Objects included)
```

Open the site in several browser profiles or private windows to seat a full table on one machine.

### Test

```sh
npm run check      # svelte-check + worker type-check
npm test           # Vitest: rules, variants, privacy, simulations, room core
npm run test:e2e   # Playwright (uses the Microsoft Edge channel by default; see docs/TESTING.md)
```

Rules are documented with stable IDs (for example `MS-TURN4`), and the tests are named after them. Projection tests
and simulation leak checks verify that no hidden information escapes a player's view.

### Deploy

```sh
npx wrangler login # once, in your own terminal
npm run deploy     # build + wrangler deploy
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the free-tier budget and data retention.

## Documentation

| Doc | What it covers |
|---|---|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Layers, the game-module interface, sync protocol, persistence, security |
| [DEVELOPMENT](docs/DEVELOPMENT.md) | Local setup, project layout, how to add a game |
| [TESTING](docs/TESTING.md) | Test suites, latest results and performance measurements |
| [DEPLOYMENT](docs/DEPLOYMENT.md) | Cloudflare deployment, free-tier budget, retention |
| [DECISIONS](docs/DECISIONS.md) | Design and engineering decisions with reasons |
| [ASSETS](docs/ASSETS.md) | Asset manifest and how to drop in licensed artwork |
| [PROGRESS](docs/PROGRESS.md) | Milestone status and known gaps |
| [AGENTS](AGENTS.md) | Working rules for coding agents in this repo |

**Game rules and design notes**

| Game | Docs |
|---|---|
| Bohnanza | [Rules](docs/RULES.md) · [Variants](docs/VARIANTS.md) |
| Kingdom & Commerce | [Rules, names, art and theme](docs/CLOCKWORK.md) |
| Miners & Saboteurs | [Rules](docs/MINES.md) · [Balance](docs/MINES_BALANCE.md) |
| Sealed Correspondence | [Rules](docs/SEALED.md) · [Art bible](docs/SEALED_ART.md) |
| Palazzo | [Rules](docs/PALAZZO.md) |
| Dead Drop | [Rules](docs/DEADDROP.md) · [Balance](docs/DEADDROP_BALANCE.md) |

Playtesting a release? See [HUMAN_PLAYTEST.md](HUMAN_PLAYTEST.md) for what to try and what feedback to send.

## Credits

Bohnanza is a game by Uwe Rosenberg, published by AMIGO and Rio Grande Games. This is an unofficial fan project with
no affiliation to either publisher. All other games, and all card artwork across the site, are original to this
project (see [docs/ASSETS.md](docs/ASSETS.md)).
