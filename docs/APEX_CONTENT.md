# Apex '66: content

Everything here is original to this hub: names, numbers, layouts and wording. The data lives in
`src/games/apex/rules/content/*.ts`; `tests/apex/content.test.ts` checks counts, ids and the filters below.

## 1. Circuits

Each circuit is data in four separate layers (APEX_ARCHITECTURE.md §3):

1. **Geometry:** a closed Catmull-Rom spline through hand-placed control points. It is only drawn.
2. **Logical spaces:** the spline is cut into `length` spaces of equal arc length, each with 1–2 lanes.
3. **Corner markers:** a space index and a speed limit. Only these are corners. Most bends have none.
4. **Scenery:** grandstands, trees, buildings and props placed off the tarmac by the circuit's own list.

Overlays used only by modules: sectors (always 3), tunnels and passes (Through the Mountains), gravel (Dust & Gravel).

| Circuit | Level | Spaces | Laps | Corners | Limits in order | Overlays | Character |
|---|---|---|---|---|---|---|---|
| Ashford Aerodrome | beginner | 60 | 3 | 4 | 5 3 4 6 | gravel by the hairpin | Runways and perimeter roads of a wartime airfield; two very long straights, one tight hairpin round the control tower |
| Autodromo Bellavista | intermediate | 64 | 2 | 7 | 6 4 2 5 3 4 7 | gravel at the hairpin | Royal parkland; the fast Curva dei Pini sweeper is unrestricted, a slow hairpin by the villa, a flat-out Curva Grande before the line |
| Belle-Rive | advanced | 72 | 2 | 12 | 3 4 2 5 3 4 2 3 5 4 3 6 | tunnel under the old bridge | Riverside town streets; chicanes, a quay hairpin, an S down the hill, a tunnel and the harbour front |
| Redwood Raceway | intermediate | 66 | 2 | 8 | 5 3 6 4 2 5 4 6 | rock tunnel, a mountain pass, gravel | Forest road with a long uphill esses, a double-apex left and a cliff tunnel |
| Mizukawa | advanced | 70 | 2 | 11 | 4 6 3 5 2 4 3 5 6 3 4 | mountain tunnel, pass, gravel | Hillside course by a lake; a double-apex spoon, flowing esses and a hairpin under the shrine steps |
| Puerto del Sol | advanced | 74 | 2 | 13 | 4 3 5 2 4 3 6 3 2 4 5 3 4 | underpass, gravel | Harbour and old town; a stadium section of tight corners, a seafront straight, a sharp hairpin at the lighthouse |
| Noordzee Ring | intermediate | 66 | 2 | 9 | 5 3 4 6 3 5 2 4 6 | gravel in the dunes | Dunes and polders; a banked hairpin, wind-blown sweepers and long straights past the windmills |
| Kalahari | advanced | 70 | 2 | 10 | 4 6 3 5 2 4 6 3 5 4 | gravel everywhere, a pass through the kopje | Desert plateau; wide fast sweepers, gravel run-offs, a rocky pass and a sudden hairpin at the waterhole |

**Validation** (`tests/apex/circuits.test.ts`, AX-TRK-*): the spline never crosses itself; every pair of spaces more
than 3 apart is at least two lane widths away from each other; corners are at least 2 spaces apart (a chicane is two corners 2 apart) and never on the
grid or the first space after the line; every space has 1–2 lanes and narrow runs are at most 4 spaces; the start grid
holds 8 cars; every overlay index is in range; the corner count matches this table; at least three unrestricted
bends (peaks of heading change of 0.3 rad or more over five spaces, more than one space from any corner marker); and the seeded simulations finish every circuit in 8–26 rounds.

## 2. Upgrades (64)

An upgrade is either a **card** shuffled into your race deck (it has a value and an effect when committed) or a
**fitting** that changes your car while you hold it. Three pools, each switchable in the lobby: 24 basic, 24 advanced,
16 environmental (each tied to a module; filtered out when its module is off). A car holds at most 4 (AX-CH-4).

Card fields: value; speed (when it differs from value); cool (when committed); cost (Strain paid when committed);
grip (+limit at corners this move); draft (+draft distance); flips (turns over cards like Stress).

### Basic
| Id | Name | Kind | Effect |
|---|---|---|---|
| b01 | Twin-Choke Carburettor | card | value 5 |
| b02 | Sprint Gearing | card | value 6, cost 1 |
| b03 | Disc Brakes | card | value 4, speed 2 |
| b04 | Drum Brakes Mk II | card | value 3, speed 1 |
| b05 | Oil Cooler | fitting | gear 2 cools 1 more |
| b06 | Header Tank | fitting | engine +1 |
| b07 | Big Radiator | fitting | engine +2, gear 1 cools 1 less |
| b08 | Slipstream Fairing | fitting | draft +1 |
| b09 | Quick-Release Hubs | card | value 2, cool 1 |
| b10 | Coasting Clutch | card | value 1, cool 2 |
| b11 | Close-Ratio Box | fitting | two-gear shifts are free |
| b12 | Bucket Seat | fitting | hand size +1 |
| b13 | Braided Lines | card | value 3, grip 1 |
| b14 | Lightened Flywheel | card | value 4 |
| b15 | Hairpin Tyres | fitting | +1 limit at corners of limit 3 or less |
| b16 | Tuned Exhaust | card | value 4, draft 1 |
| b17 | Spare Plugs | card | value 0, cool 3 |
| b18 | Rev Counter | fitting | first boost each lap is free |
| b19 | Driver Coaching | fitting | catch-up +1 distance |
| b20 | Rear Wing | card | value 3, grip 2 |
| b21 | Tall Gearing | card | value 7, cost 2 |
| b22 | Kickdown Switch | card | value 2, flips 1 |
| b23 | Mechanic's Toolkit | fitting | remove one Stress from your deck |
| b24 | Lucky Mascot | fitting | spins put 1 Strain fewer in hand |

### Advanced
| Id | Name | Kind | Effect |
|---|---|---|---|
| a01 | Fuel Injection | card | value 6 |
| a02 | Overdrive | card | value 8, speed 6, cost 2 |
| a03 | Ventilated Discs | card | value 5, speed 2 |
| a04 | Dry Sump | fitting | engine +2 |
| a05 | Twin Radiators | fitting | gears 1 and 2 cool 1 more |
| a06 | Limited-Slip Diff | card | value 4, grip 2 |
| a07 | Ground-Effect Skirts | fitting | +1 limit at every corner, engine −1 |
| a08 | Supercharger | fitting | boost turns over two cards |
| a09 | Nitrous Bottle | card | value 0, flips 2, cost 1 |
| a10 | Sequential Linkage | fitting | two-gear shifts free, three-gear shifts for 2 |
| a11 | Heat Exchanger | card | value 3, cool 2 |
| a12 | Magnesium Wheels | card | value 5, cool 1 |
| a13 | Telemetry Clipboard | fitting | hand size +1 |
| a14 | Pit Board | fitting | throw away up to 1 Strain a round |
| a15 | Works Engine | card | value 7, cost 1 |
| a16 | Endurance Pistons | fitting | engine +3, hand size −1 |
| a17 | Spaceframe Chassis | card | value 6, speed 4 |
| a18 | Polished Ports | card | value 4, flips 1 |
| a19 | Trailing Throttle | card | value 2, speed 0, cool 1 |
| a20 | Cold-Air Box | fitting | gear 3 cools 1 |
| a21 | Racing-Line Notes | card | value 3, grip 3 |
| a22 | Factory Mechanic | fitting | spins put no Strain in hand |
| a23 | Second Wind | fitting | catch-up +1 distance and +1 cooling |
| a24 | Rally Launch | fitting | +2 distance in the first round |

### Environmental
| Id | Name | Module | Kind | Effect |
|---|---|---|---|---|
| e01 | Grooved Tyres | Storm Front | fitting | ignore the rain penalty to limits |
| e02 | Wiper Motor | Storm Front | fitting | may draft in rain |
| e03 | Storm Vents | Storm Front | fitting | +1 cooling in rain |
| e04 | Aquaplane Guard | Storm Front | fitting | flooded sectors cost nothing |
| e05 | Spray Line | Storm Front | card | value 3, grip 2 |
| e06 | Fog Lamps | Storm Front | fitting | catch-up +1 distance |
| e07 | Tunnel Lamps | Mountains | fitting | may draft in tunnels |
| e08 | High-Altitude Jets | Mountains | fitting | pass speed cap +2 |
| e09 | Short-Stroke Engine | Mountains | fitting | may boost from a tunnel |
| e10 | Hill-Climb Gearing | Mountains | card | value 5, speed 3 |
| e11 | Engine Brake | Mountains | fitting | pass overspeed costs 1 less |
| e12 | Skid Plate | Dust & Gravel | fitting | no gravel Strain |
| e13 | Rally Dampers | Dust & Gravel | fitting | gravel corners cost no extra |
| e14 | Mud Flaps | Dust & Gravel | fitting | remove the extra Dust Stress |
| e15 | Knobbly Tyres | Dust & Gravel | card | value 4, grip 1 |
| e16 | Dust Filter | Dust & Gravel | fitting | engine +1 |

## 3. Sponsors, press objectives and events

### Sponsors (6, one per driver for a season)
| Id | Sponsor | Pays when you… |
|---|---|---|
| velox | Velox Motor Oil | finish without spinning |
| marlowe | Marlowe Tyre Co. | make 5 overtakes in the race |
| aurora | Aurora Chronometers | lead at the end of any lap |
| castellan | Castellan Petroleum | finish with at least 4 Strain in the engine |
| kestrel | Kestrel Spark Plugs | spend 4 rounds in gear 4 |
| halden | Halden Assurance | finish never having paid more than 1 Strain at one corner |

### Press objectives (10, two drawn per race)
| Id | Headline | Condition |
|---|---|---|
| holeshot | Hole Shot | lead after round 1 |
| charge | Charge of the Day | overtake 3 cars in one round |
| cool | Cool Customer | cool 6 Strain in the race |
| limit | On the Limit | cross 3 corners at exactly their limit |
| slip | Slipstream Artist | draft 3 times |
| flat | Flat Out | reach speed 14 in one move |
| comeback | Comeback Drive | finish 3 or more places above your grid slot |
| fastest | Fastest Round | the longest distance in one round (ties share) |
| nerve | Nerves of Steel | boost 3 times |
| clean | Gentleman Driver | finish without paying Strain at a corner |

### Pre-race events (16, one drawn per race when on)
| Id | Event | Effect | Needs |
|---|---|---|---|
| rubber | Fresh Rubber | hand size 8 | — |
| ration | Fuel Rationing | engine −1 | — |
| morning | Cool Morning | gear 2 cools 2 | — |
| oil | Oil on the Line | one drawn corner −1 (min 1) | — |
| resurfaced | Resurfaced | one drawn corner +1 | — |
| fever | Grandstand Fever | one more car gets catch-up | — |
| shuffle | Shuffled Grid | grid drawn at random | Championship |
| pressday | Press Day | three press objectives | press on |
| gala | Sponsor Gala | sponsors pay 2 | sponsors on, Championship |
| paddock | Tight Paddock | two-gear shifts cost 2 | — |
| tailwind | Tailwind | draft +1 | — |
| marshals | Alert Marshals | spins put 1 Strain fewer in hand | — |
| haze | Heat Haze | gear 1 cools 2 | — |
| practice | Practice Laps | everyone starts in gear 2 | — |
| parts | Parts Lorry | the next draft reveals 2 more | Championship, not the last race |
| duststorm | Dust Storm | gravel Strain from speed 5 | Dust & Gravel |

Incompatible content is filtered before the draw: an event whose need is missing is never drawn, and an upgrade whose
module is off is never revealed.

## 4. Weather and sectors (Storm Front)

| Weather | Weight | Effect |
|---|---|---|
| Clear | 3 | none |
| Overcast | 2 | gear 1 cools 1 more |
| Heatwave | 2 | engine −1 |
| Drizzle | 2 | no drafting |
| Rain | 2 | no drafting; every limit −1 (min 1) |
| Storm | 1 | as Rain, and each sector may flood |

Each of the three sectors also draws a modifier: none (weight 4), Wet Patch (limits in the sector −1, min 1; weight 1),
Tailwind (draft +1 when the draft starts in the sector; weight 1). Under Storm every sector draws Flooded with weight 2
as well: ending a move there at speed 8 or more puts 1 Strain from the pit stock in your discard.

## 5. Racing Rivals (8)

| Id | Driver | Ability |
|---|---|---|
| ortega | Ines "La Flecha" Ortega | draft +1 |
| weiss | Baron Ottokar Weiss | the first overspeed each lap costs 1 less |
| whitlock | Dot Whitlock | +1 cooling every round |
| arashiro | Kenji Arashiro | +2 distance in the first round |
| delacroix | Marguerite Delacroix | engine +2 |
| bellini | Sandro Bellini | boost turns over two cards |
| vanaalst | Pieter van Aalst | ignores the rain penalty |
| mokoena | Thandiwe Mokoena | no gravel Strain |

Without the module, computer cars are numbered works entries with no ability.
