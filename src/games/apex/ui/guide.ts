import type { GuideDoc } from '../../../hub/guide';
import { CIRCUITS } from '../rules/content/circuits';
import { EVENTS, PRESS, RIVALS, SECTOR_MODS, SPONSORS, WEATHER } from '../rules/content/paddock';
import { UPGRADES } from '../rules/content/upgrades';
import { POINTS } from '../rules/season';
import { cardText } from './text';

const named = (list: { name: string; text: string }[]) => ({ ul: list.map((x) => `**${x.name}**: ${x.text}`) });

export const guide: GuideDoc = {
  title: 'Apex ’66',
  levels: [
    {
      id: 'quick',
      title: 'Quick',
      sections: [
        {
          id: 'goal',
          title: 'How to win',
          body: ['Race identical cars round a circuit for 2 or 3 laps. The first across the line after the last lap wins. Every round, all drivers plan in secret at the same time, then the plans are revealed and the cars move leader first.'],
        },
        {
          id: 'gears',
          title: 'Gear and cards',
          body: [
            'Choose a **gear** from 1 to 4 and commit exactly that many cards from your hand. Their values add up to your **speed**, and you move that many spaces.',
            { ul: ['Shifting one gear up or down is free. Two gears costs 1 Strain. Three is not allowed.', 'Gear 1 cools 3 Strain, gear 2 cools 1, gears 3 and 4 cool nothing.', 'After the round everyone draws back up to 7 cards.'] },
          ],
        },
        {
          id: 'corners',
          title: 'Corners',
          body: [
            'Only the round **roundels** on the track are corners. Each shows a speed limit. Crossing one faster than its limit costs the difference in **Strain**. Bends without a roundel are free, however sharp they look.',
            'If your engine cannot pay a corner, you **spin**: you stop before it, take extra Strain into your hand and restart from gear 1.',
            { example: 'You commit 4 + 3 in gear 2 and cross a limit-5 corner.', steps: ['Speed is 7.', '7 is 2 over the limit: pay 2 Strain from the engine.', 'Your engine needle drops by 2.'] },
          ],
        },
        {
          id: 'strain',
          title: 'Strain',
          body: ['Your **engine** holds 6 Strain cards. Paying moves them into your discard; later they come back into your hand, where they cannot be played and take up room. **Cooling** returns Strain from your hand to the engine. Driving hard now clogs your hand later.'],
        },
        {
          id: 'controls',
          title: 'Controls',
          body: [
            {
              ul: [
                'Pick a gear on the gear gate, then tap cards to commit them. "Throw away" mode marks cards to discard at the end of the round.',
                'The dashed line on the board shows where your plan goes and what each corner costs. **Lock in** sends the plan; **Take back** retracts it until everyone has locked in.',
                'Board: drag to pan, pinch or scroll to zoom. Keys: arrows pan, + and − zoom, 0 fits the board, C centres your car.',
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'full',
      title: 'Full',
      sections: [
        { id: 'cards', title: 'The cards', body: ['Every car starts with the same 16-card deck: Pace 1, 2, 3 and 4 three times each, one Pace 5, one Coast and two Stress.', { ul: ['**Pace n**: worth n.', '**Coast**: worth 1 and cools 1.', '**Stress**: when revealed, turn cards from your deck until one with a value appears and add that value. Every turned card goes to your discard.', '**Strain**: cannot be committed or thrown away. Cool it back into the engine.'] }] },
        { id: 'boost', title: 'Boost', body: ['Once per round you may plan a **boost**: pay 1 Strain and turn cards like a Stress card for extra speed. With an empty engine when your car resolves, the boost is cancelled for free.'] },
        { id: 'order', title: 'Who moves first', body: ['After the reveal, cars resolve one at a time, leader first. Each pays its shift, turns Stress and boosts, moves, checks corners, drafts and cools before the next car goes. Passing is always allowed. If the space you would stop on is full, you stop on the nearest free space behind it.'] },
        { id: 'speed', title: 'Speed and distance', body: ['**Speed** is what corners check: your committed values plus any boost. **Distance** is how far you move: speed plus catch-up and drafting. Some upgrades change one and not the other.'] },
        { id: 'draft', title: 'Slipstream', body: ['After moving, if another car is level with you or on the next space ahead, you may **draft** 2 more spaces. Corners on the way are checked at your speed. A draft that would overspeed a corner is your choice; any other draft is taken for you. Rain and drizzle stop drafting.'] },
        { id: 'catchup', title: 'Catch-up', body: ['At the reveal the last car (the last two with 5 or more cars) gets +1 distance and +1 cooling for the round.'] },
        { id: 'limp', title: 'Clogged hand', body: ['With no legal plan (too few playable cards or too little Strain), you **limp**: gear 1, no cards, 1 space at speed 1, and you still cool as gear 1.'] },
        { id: 'finish', title: 'The finish', body: ['A car that crosses the line on its last lap has finished and leaves the track. Finishers in the same round rank by how far past the line they would have gone. After the first car finishes, the others get 2 more rounds.'] },
        { id: 'absent', title: 'Timers and absent drivers', body: ['The planning timer is off unless the host sets one. When it runs out, a careful plan is locked for anyone still planning. If a driver loses connection, the table waits for them; the host may let the computer drive their car until they return and press **Drive again**.'] },
        { id: 'modes', title: 'Modes', body: [{ ul: ['**Quick Race**: one race; computer cars fill the grid up to 8 cars.', '**Solo**: you against the computer cars.', '**Championship**: a season of races with points, upgrade drafts, sponsors and press.', '**Driving School**: one lap at Ashford Aerodrome with a coach.'] }] },
        { id: 'circuits', title: 'Circuits', body: [{ ul: CIRCUITS.map((c) => `**${c.name}** (${c.level}, ${c.corners.length} corners, ${c.laps} laps): ${c.blurb}`) }] },
      ],
    },
    {
      id: 'rules',
      title: 'Reference',
      sections: [
        { id: 'modules', title: 'Modules', body: ['Each module is on by default and can be switched off on its own. Every circuit plays with any combination.', { ul: ['**Storm Front**: weather is drawn before the race and never changes during it; sectors may get modifiers.', '**Through the Mountains**: tunnels are one lane wide, with no drafting from or into them and no boost started in one. Mountain passes cap speed.', '**Dust & Gravel**: one more Stress in each deck. Ending a move on gravel at speed 7 or more puts 1 Strain in your discard. Corners in gravel cost 1 more when you overspeed.', '**Racing Rivals**: named computer drivers with one ability each.'] }] },
        { id: 'weather', title: 'Weather', body: [named(WEATHER), 'Sector modifiers:', named(SECTOR_MODS.filter((s) => s.id !== 'none'))] },
        { id: 'rivals', title: 'Rivals', body: [named(RIVALS)] },
        { id: 'season', title: 'Championship', body: [`Points by place: ${POINTS.join(', ')}. Ties in the standings break on wins, then second places and so on, then the last race.`, 'After every race but the last, an upgrade draft: one more upgrade than there are cars is revealed, and drivers pick in reverse standings order. You may pass. A car carries at most 4 upgrades; taking a fifth means handing one back. Upgrades last for the season only.', 'Sponsors and press objectives each pay 1 point at most once per race, with at most 2 bonus points per driver per race.'] },
        { id: 'sponsors', title: 'Sponsors', body: [named(SPONSORS)] },
        { id: 'press', title: 'Press objectives', body: [named(PRESS)] },
        { id: 'events', title: 'Pre-race events', body: [named(EVENTS)] },
        { id: 'upgrades', title: 'Upgrades', body: [{ ul: UPGRADES.map((u) => `**${u.name}** (${u.pool}): ${cardText(u.id)}`) }] },
      ],
    },
  ],
};
