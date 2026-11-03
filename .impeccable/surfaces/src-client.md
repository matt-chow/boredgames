---
version: 1
slug: "src-client"
primary_target: "src/client"
related_targets: []
---

# Surface: game table + hub (src/client)

Mode: Operate (the table is a working surface played for 45–75 min). The hub and lobby inherit the same world.
Audience: 3–5 friends on separate devices. Task: plant, trade, harvest, quickly and legally.
Constraints: brief pins "premium, minimalist, dark 2.5D tabletop", fixed isometric camera, no rotation; original art only.

Grounded list (by resonance): 1 card-room felt under a lamp (rut / literal reading), 2 seed-merchant drawer cabinet,
3 grain-exchange chalk slate, 4 night-market produce stall crates, 5 black lacquer compartment tray,
6 allotment beds from above at dusk, 7 apothecary seed jars. Assigned: 4.
Challengers: boarding pass + gate board was declined, but its discipline is kept: one signal colour reserved for "act
here now", and a change holds its highlight until noticed. Airport yellow was declined; kept "show only the next
decision". Streaming wall was declined; kept focus-to-enlarge for card inspection.

## Direction contract
THESIS: The table is a night-market produce stall seen from above at a fixed tilt. Fields are shallow timber crates,
and trades happen across a shared counter. It refuses green felt, the lamp-pool and floating side panels.
OWN-WORLD:
- Charred timber ground (near-black warm brown), with crate rims as hairline highlights.
- Cards are crate labels: a flat bold bean silhouette on a solid produce colour, with stencil numerals for the beanometer.
- One signal colour, sprout chartreuse, means only "legal / your move".
- Stencil display face for numbers and labels; system UI face for prose.
STORY: Players see whose turn it is and what they must do next, see every offer on the counter, and act with one tap or drag.
FIRST VIEWPORT:
- The tilted stall fills the screen.
- Opponents' crates sit along the far edge, and the deck, face-up cards and discard are centre-left.
- The counter (trade area) sits in the centre, and your crates are near-front.
- Your hand is fanned at the bottom edge. A slim top bar holds the phase strip, coins and settings.
- The primary action button sits bottom-right above the hand.
FORM: candidate 4 of 7; seed: a18344c4001c820966ec9cdd04d6ef2e
HUB: the home page is the stall's shelf. One crate per game; cards are dealt into the crate once on load, and the hand
opens wider when you lean toward it (hover/focus). Interview skipped on the owner's instruction to proceed without
interruption; built code-led inside the established world.
SIGNATURE: Planting a card drops it into the crate with a short settle. Harvesting flips the stack into coins that roll
to the owner's coin purse.
