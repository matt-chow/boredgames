# Working in this repo

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first. Rules that must hold:

- **The server is the authority.** The client never decides legality, deck order, randomness or scoring. It renders
  the confirmed `RoomView` and sends intents. There are no optimistic updates; animations follow confirmed state.
- **Layers stay separate.**
  - `src/engine` and `src/games/*/rules` are pure TypeScript: no Svelte, DOM or Cloudflare imports.
  - `src/server` knows nothing about Bohnanza beyond the `GameModule` interface.
  - Game UI lives in `src/games/*/ui`.
- **Hidden information never leaves the server.** A player's view is built by `project(state, seat)`. Never put
  hands, the deck or deck order into logs, history rows, acks, error messages or debug endpoints. The projection
  tests (`tests/bohnanza/projection.test.ts`) and the leak checks in the simulations must keep passing.
- **Hand order is sacred.** The engine never reorders a hand. Insert received cards only where the rules say.
- **Rules changes need a rule ID.** Update docs/RULES.md or docs/VARIANTS.md and add or adjust a test named with
  that ID. Do not invent rules for ambiguous cases. Record the interpretation in RULES.md and test its consequences.
- **Persisted state is versioned.** If you change `BState`'s shape, bump `meta.stateVersion` and add a `migrate` step.
- **Secrets stay out of the repo.** Session tokens live only in HttpOnly cookies. The Durable Object stores SHA-256
  hashes. Nothing secret goes in `wrangler.jsonc`.
- **Free tier only.** Do not add bindings or products that require a paid plan.
- **Design.** Follow the tokens in `src/client/styles/global.css` and PRODUCT.md / DESIGN.md. Sprout green is the only
  signal colour and means "legal / your move". Animate only `transform` and `opacity`. Respect
  `settings.instant` (reduced motion).

Before finishing a change: `npm run check && npm test`, plus `npm run test:e2e` for anything touching UI, sync or
the server. Update docs/PROGRESS.md.
