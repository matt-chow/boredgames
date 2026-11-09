/**
 * True only on a dev server started with `--mode bench` (see vite.config.ts); it decides whether the deck bench can be
 * hosted. Vite replaces it with a plain literal, so guard with it directly: a build then drops the branch.
 * `scripts/no-bench.mjs` checks that nothing of the bench is left in the bundles.
 */
declare const __DECK_BENCH__: boolean;

/**
 * True on a dev server and in a staging build; false in a production build. Decides whether Dead Drop is listed and
 * can be hosted. Its rules stay registered either way, so a room that already exists still loads.
 */
declare const __DEAD_DROP__: boolean;
