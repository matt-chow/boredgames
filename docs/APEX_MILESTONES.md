# Apex '66: milestones

Each milestone ends with `npm run check && npm test` green and a commit. Steps inside a milestone are committed as they
pass their tests. Status is kept in docs/PROGRESS.md.

| # | Milestone | Done when |
|---|---|---|
| A0 | Design documents | APEX.md, APEX_CONTENT.md, APEX_ARCHITECTURE.md, this file, D57 |
| A1 | Content data and circuit geometry | 8 circuits, validation tests (AX-TRK-*); 64 upgrades, 6 sponsors, 10 press, 16 events, 6 weather, 8 rivals with count tests |
| A2 | Race engine | every AX-CAR/GEAR/PLAN/RES/STR/BST/SPD/MOV/LAP/CRN/SPN/DRF/OVT/COOL/ADR/END/DECK/FIN rule tested |
| A3 | Computer driver | AX-AI-*; AI-only races finish on every circuit; never reads hidden state |
| A4 | Modules | AX-MOD-1..4 tested; all 16 module combinations simulate cleanly on every circuit |
| A5 | Championship | AX-CH-*; full 3/5/8-race seasons simulate; anti-farming caps |
| A6 | Room integration | GameModule, retention hook, host delete, pause/autopilot, privacy and replay tests |
| A7 | Table UI | board with zoom/pan/fit/follow, dashboard, gear selector, fanned hand, setup, interlude, podium, replay viewer, guide, Driving School tutorial |
| A8 | Balance and storage | seeded simulations per circuit and grid; APEX_BALANCE.md; storage measurement |
| A9 | Browser tests and staging | desktop and phone e2e; staging deploy and smoke run |
