# Apex '66 v1.4 backlog

Deferred from v1.3 on purpose: v1.3 was rules, stability and turn feedback only.

- **Map structure.** Circuits are still eight hand-tuned splines in `content/circuits.ts`. Revisit space spacing on
  tight hairpins, a second lane on long straights, pit lane and grid geometry.
- **Scenery.** Prop placement is a fixed list per circuit. Collision with billboards and roundels is avoided by a
  fixed offset, not by layout.
- **Environmental generation.** Weather and sector modifiers are drawn per race. Generated scenery, time-of-day and
  weather visuals on the board are not started.
- **Heat card flights.** Animate Heat cards engine → discard, discard → deck, deck → hand and hand → engine
  (APEX_COMPLIANCE.md, known gaps).
- **Art.** The paused painting batch (PROGRESS.md, A10).
