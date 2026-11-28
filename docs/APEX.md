# Apex '66: rules as implemented

Apex '66 is an original card-driven motor race for 1–6 people and up to 8 cars. Its title, rules text, circuits,
cars, sponsors, upgrades and art are all made for this hub (D57). The engine is `src/games/apex/rules`, a pure
reducer with seeded randomness. Every rule below has an ID (AX-…); a Vitest test carries that ID in its name.
Lines marked **Interpretation** settle a case the design leaves open. Numbers marked *(tuned)* were set by the seeded
simulations in APEX_BALANCE.md, not guessed.

Content (circuits, upgrades, sponsors, press objectives, events, rivals) is in [APEX_CONTENT.md](APEX_CONTENT.md).
How it is built is in [APEX_ARCHITECTURE.md](APEX_ARCHITECTURE.md); the plan is [APEX_MILESTONES.md](APEX_MILESTONES.md).

## 1. Cars, decks and the engine (AX-CAR)

- **AX-CAR-1** Every car starts identical. Its race deck has 16 cards: Pace 1 ×3, Pace 2 ×3, Pace 3 ×3, Pace 4 ×3,
  Pace 5 ×1, Coast ×1 and Stress ×2. Liveries and numbers are cosmetic only.
- **AX-CAR-2** Beside the deck sits the **engine**: 6 Heat cards *(tuned)*. (Heat was called Strain before v1.3; saved
  games and replays still load, AX-STATE-2.) Heat is a physical card. It moves
  engine → discard when you pay for something, discard → deck when the deck is rebuilt, deck → hand when drawn, and
  hand → engine when you cool. Heat in hand is dead weight: it can't be committed or discarded.
- **AX-CAR-3** Hand size is 7. The deck is shuffled from the race seed; nobody, including the owner, sees its order.
- **AX-CAR-4** Card values: Pace *n* is *n*; Coast is 1 and cools 1 when committed; Stress is uncertain (AX-STR-1).
  Upgrade cards have their own values and effects (APEX_CONTENT.md §2).

## 2. Gears and planning (AX-GEAR, AX-PLAN)

Every round all drivers plan at the same time and in secret.

- **AX-GEAR-1** There are four gears. Cars start the race in gear 1.
- **AX-GEAR-2** Each round you may stay in gear or shift one gear up or down for free. Shifting two gears costs 1
  Heat from the engine. Shifting three is not allowed. With an empty engine only ±1 is allowed.
- **AX-PLAN-1** Your gear is the number of cards you commit, exactly.
- **AX-PLAN-2** Heat can't be committed. If you hold fewer committable cards than the gear you want, you can't
  choose that gear.
- **AX-PLAN-3** **Clogged hand:** with no committable card at all you *limp*: gear 1, no cards, distance 1, speed 1,
  and you still cool as gear 1. **Interpretation:** you limp whenever no legal plan exists (too few committable
  cards for any reachable gear, or too little Heat to pay for one), and a limping car cannot boost.
- **AX-PLAN-4** A plan is a gear and the cards for it, nothing else. Boost, cooling, catch-up, slipstream and throwing
  cards away are decided in your turn (AX-TURN), after you see your move.
- **AX-PLAN-5** A plan stays hidden until every car has locked one. Until then you may retract it and plan again
  (AX-UNDO-1). Computer cars plan from what their own driver could know.
- **AX-PLAN-6** **Timer (off by default).** A host may set 30/60/90 seconds. When it expires, an unlocked human gets the
  cautious computer plan, and the table says so. The timer stops while any driver it waits for is offline (AX-NET-2).

## 3. Resolution (AX-RES)

- **AX-RES-1** After the reveal, cars take their turns one at a time in race order, leader first. The order is fixed
  when the round starts: progress (laps × circuit length + space), then lane (the racing line, lane 0, is ahead), then
  who arrived first.
- **AX-RES-2** Each turn, in order (AX-TURN-3): reveal the cards, pay the shift, turn Stress, move, react, slipstream,
  check the corners, throw away and refill. Then the next car.
- **AX-TURN-1** **Authority.** The server applies every decision. Each one carries the table's step; a stale, repeated
  or out-of-turn one is refused and changes nothing. Locking the same plan twice changes nothing.
- **AX-TURN-2** Whose turn it is, its stage (react, slipstream, discard) and what that driver may do are public.
- **AX-TURN-3** A turn: pay the shift and card costs, turn Stress, then move the full distance (AX-MOV). No corner is
  checked yet.
- **AX-TURN-4** **React.** Then, in any order and as many as are open: cool (AX-COOL-1), boost (AX-BST-1), take
  catch-up (AX-ADR-1). Continue ends reacting. Anything with no choice left is done for you, and a stage with nothing
  to decide is skipped. The board shows each step before the next choice; the server never waits for an animation.
- **AX-TURN-5** Cooling and catch-up happen before the corner check, so cooling can refill the engine that the corners
  then pay from.
- **AX-TURN-6** **Corner check.** After the slipstream, every corner between where the move started and where the car
  now stands is checked once at the turn's final speed (AX-CRN-2).
- **AX-TURN-7** **Finish turn.** Throw away any cards you like (never Heat, unless an upgrade allows it), then refill.
  A car past the line, or a hand with nothing that may go, finishes the turn without asking.
- **AX-STR-1** **Stress.** For each committed Stress card, turn over cards from the top of your deck until a card
  with a pace value appears (Pace, Coast or a valued upgrade). Add its value; every turned card goes to your discard.
  If the deck runs out it is rebuilt from the discard (AX-DECK-1). If there is no valued card anywhere, Stress adds 0.
- **AX-BST-1** **Boost.** Once per turn, after your move, you may pay 1 Heat and turn over a card like Stress. Its
  value adds to speed and distance and you move on at once. You need Heat in the engine (or a free boost upgrade).
- **AX-SPD-1** **Speed vs distance.** *Speed* is the total of your committed values plus boost. Only speed is checked at
  corners. *Distance* is your committed values plus boost, catch-up (AX-ADR-1) and any slipstream (AX-DRF-1). Some upgrades change one and not
  the other (brakes lower speed, not distance).

## 4. Movement and blocking (AX-MOV, AX-LAP)

- **AX-MOV-1** You move forward exactly your distance in spaces. Passing other cars is always allowed.
- **AX-MOV-2** **Blocked destination.** Each space has one or two lanes. If every lane of the space you'd stop on is
  taken, you stop on the nearest space behind it with a free lane, in its lowest free lane.
- **AX-MOV-3** You never end behind where you started. If every space between is full you stay put.
- **AX-LAP-1** The start/finish line sits before space 0. Crossing it adds a lap. Corners repeat every lap. A move can
  cross the line and several corners at once.

## 5. Corners and spins (AX-CRN, AX-SPN)

- **AX-CRN-1** A restricted corner is a line on the track with a speed limit (2–7). A painted bend without a marker is
  not a corner, whatever it looks like.
- **AX-CRN-2** Work out where you stop (AX-MOV-2, after boost, catch-up and slipstream) first, then check every corner
  line between where you started and where you stop, in order. At each one where speed > limit, pay the difference in Heat, engine → discard.
- **AX-SPN-1** If the engine can't pay a corner in full, you **spin**: you go back to the last free space before that
  corner. Nothing is paid for it; earlier corners stay paid.
- **AX-SPN-2** A spinning car takes Stress cards straight into its hand from the pit stock (unlimited): 1 in gear 1–2,
  2 in gear 3–4, fewer with the marshals' help. It resets to gear 1 for the next round's shift. **v1.3 correction:**
  this was Heat before; the board game's spin puts Stress, not Heat, in the hand.
- **AX-CRN-3** Several corners in one move are checked in order; you can pay for one and spin at the next.

## 6. Drafting and overtaking (AX-DRF, AX-OVT)

- **AX-DRF-1** After reacting, if another car is level with you or on the next space ahead, you are offered a
  slipstream of 2 more spaces. It is not speed, but corners it crosses are checked with your speed.
  **Interpretation:** a car that did not move this turn (blocked, or distance 0) cannot slipstream.
- **AX-DRF-2** The offer shows how much extra corner Heat it would add. Take it or decline it; it is always a choice.
- **AX-OVT-1** An overtake is counted for every car you were behind before resolving and ahead of after. It feeds the
  statistics, press objectives and sponsors, never the rules.

## 7. Cooling, catch-up and the end of the round (AX-COOL, AX-ADR, AX-END, AX-DECK)

- **AX-COOL-1** After moving, cool by your gear: gear 1 up to 3, gear 2 up to 1, gears 3–4 none *(tuned)*. Coast and
  upgrades add more. Cooling returns Heat from hand to the engine.
- **AX-COOL-2** Cooling takes the most it can, by itself. A driver may switch on "Cool by hand" to choose instead.
- **AX-ADR-1** **Catch-up.** At the reveal, the last car (the last two with 5 or more cars) is offered +1 distance
  (not speed) and +1 cooling in its turn. It is optional: the extra space can carry you into a corner.
- **AX-END-1** At the end of each turn, committed and thrown-away cards go to the discard and the car draws back up
  to 7.
- **AX-DECK-1** When you must draw or turn a card and the deck is empty, shuffle the discard into a new deck (cards in
  play this round stay out). If both are empty you simply stop.

## 8. The finish (AX-FIN)

- **AX-FIN-1** A car that crosses the line at the end of its last lap has finished. It moves its full distance past
  the line and stays on the board, faded, with its provisional place.
- **AX-FIN-2** Finishers in the same round rank by how far past the line they went, then by lane (the racing line
  first), then by driving order. Earlier rounds' finishers rank ahead.
- **AX-FIN-5** A finished car holds its space until its finishing round ends, then never blocks anyone.
- **AX-FIN-6** No slipstream across the line or after it. Corners beyond the line are not checked.
- **AX-END-2** The race ends when every car has finished (replaces the old two-round limit, AX-FIN-3). The podium
  shows only then. A safety stop at 200 rounds ranks any car still running by race order.
- **AX-FIN-4** Laps default per circuit (2 or 3) and the host may choose 1–5.

## 9. Undo, timers and absent drivers (AX-UNDO, AX-NET)

- **AX-UNDO-1** Before the reveal, retracting a plan is the only undo. Nothing can be undone after a reveal.
- **AX-NET-1** Every game action carries the table's step number; a late or repeated one is refused (AX-TURN-1).
- **AX-NET-2** **Pause on disconnect.** When the table needs a decision from a person who is offline, it pauses for
  everyone. It resumes when they return.
- **AX-NET-3** While paused, the host may hand the absent car to the computer driver. Interpretation: the host is the
  first seat; if the host is the one away, any connected player may approve it. The car's owner
  takes it back simply by reconnecting and pressing "Drive again". Nothing is done for an absent player otherwise.
- **AX-NET-4** No spectators: the room only admits seated players.

## 10. Grids and modes (AX-GRID, AX-MODE)

- **AX-GRID-1** 1–6 people plus computer cars, at most 8 cars in all. Cars line up two abreast behind the start line.
- **AX-GRID-2** Quick Race and Solo grids are drawn from the seed. In a championship the grid is reverse standings
  (the leader starts last), round one drawn.
- **AX-MODE-1** **Quick Race**: one race, any grid. **Solo**: one person and computer cars. **Championship**: a season.
  **Driving School**: a guided single-lap race at Ashford Aerodrome with lessons, fixed seed, two gentle computer cars.

## 11. Computer drivers (AX-AI)

- **AX-AI-1** One driver serves every computer car, bot seat and handed-over car. It sees only what its own driver
  could: its hand, its own deck's contents (not order), the public table. It plans and takes its turn decisions the
  same way a person does.
- **AX-SIM-1** Seeded races with 1–4 seats and varied grids and laps always run to the end.
- **AX-AI-2** It has a risk setting (cautious, balanced, bold) and a difficulty (novice, club, works) that limits how
  many plans it considers.
- **AX-AI-3** Racing Rivals (module) give named computer drivers one ability each. Without it they are plain.

## 12. Modules (AX-MOD)

Four modules, each independent and on by default. Every circuit plays with any combination, including none.

- **AX-MOD-1 Storm Front.** Weather is drawn before the race and never changes during it. Sectors may get modifiers.
  See APEX_CONTENT.md §4.
- **AX-MOD-2 Through the Mountains.** A circuit's tunnel spaces become one lane wide; no drafting from or into a
  tunnel; no boost when you start your move in one. Mountain passes cap speed. With the module off, tunnels are
  scenery.
- **AX-MOD-3 Dust & Gravel.** Each deck gets one more Stress. Ending a move on gravel at speed 7 or more puts 1 Heat
  from the pit stock in your discard. Corners in gravel sectors cost 1 more when you overspeed.
- **AX-MOD-4 Racing Rivals.** Named computer drivers with abilities. Basic computer drivers are always available.

## 13. Championship (AX-CH)

- **AX-CH-1** Seasons of 3, 5 or 8 races, or a custom list of circuits.
- **AX-CH-2** Points by finishing place: 9, 6, 4, 3, 2, 1, 0, 0. Ties in the standings break on wins, then on most
  second places and so on, then on the last race's finish.
- **AX-CH-3** After every race but the last, an upgrade draft: cars+1 upgrades are revealed and drivers pick one each
  in reverse standings order. Computer cars pick too. **Interpretation:** a driver may pass; unpicked and returned
  upgrades go to the bottom of the season's face-down stack, so nothing is lost or duplicated.
- **AX-CH-4** A car holds at most 4 upgrades. Taking a fifth means returning one. Upgrades last for this season only.
- **AX-CH-5** Before each race the weather and one pre-race event are drawn (if those are on).
- **AX-CH-6** Sponsors and press objectives (on by default): each driver holds one sponsor for the season; each race
  shows two press objectives. **Interpretation:** with more than six cars, sponsors go to people first, then computer
  cars, until the six run out. Each pays 1 point at most once per race per driver, and a driver can earn at most 2
  bonus points per race (anti-farming). In a single race they pay press stars, shown on the podium only.
- **AX-CH-7** A season can be shelved between races and resumed later from the same room.

## 14. Persistence and privacy (AX-PRV, AX-REP, AX-RET)

- **AX-PRV-1** A projection never holds another car's hand, any deck's order, or the seed while a race is running.
  After the reveal, committed cards are public.
- **AX-PRV-2** No race view holds a deck, another hand, the locked plans or the replay.
- **AX-PLAN-7** The dashboard preview is built from your own view only. A fully known plan shows one speed and one
  landing space; Stress shows a range from the least and most valued card left in your deck and discard (their
  contents, never their order). It accounts for cars still to move, laps and modifiers, leaves out boost, catch-up and
  slipstream, and labels the corners safe, possible overspeed or certain overspeed. No cards chosen, no ghost.
- **AX-STATE-2** Saved state is versioned (now 2). A v1 race in progress migrates and plays on.
- **AX-REP-1** Every finished race keeps a compact, versioned replay: the seed, the setup and each round's revealed
  plans and turn decisions. Replaying it through the engine reproduces the race exactly.
- **AX-REP-3** Replays recorded before v1.3 (version 1) still play back through the old resolver, which is kept frozen.
- **AX-REP-2** A replay is available only once its race is over.
- **AX-RET-1** Retention after the last change: lobby 24 h, race in progress 7 days, finished single race 24 h,
  season between races 30 days, shelved season 90 days, finished season 7 days. Expiry deletes the room's storage,
  index rows and alarm. The host can delete the room at any time.
