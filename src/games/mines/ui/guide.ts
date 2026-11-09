import type { GuideDoc } from '../../../hub/guide';
import { CLASSIC_POOL, REWARD_CARDS, SABOTEUR_PAY } from '../rules/cards';
import { DUEL_FINDER, DUEL_OTHER, SET_ASIDE } from '../rules/engine';

const pools = Object.entries(CLASSIC_POOL).map(([n, [m, s]]) => `${n} players: ${m} miners, ${s} saboteurs`);

export const guide: GuideDoc = {
  title: 'Miners & Saboteurs',
  levels: [
    {
      id: 'quick',
      title: 'Quick',
      sections: [
        {
          id: 'goal',
          title: 'How to win',
          body: [
            'Over several rounds, a tunnel grows from the entrance toward three face-down destinations. One is gold, two are coal. Most gold after the last round wins; a tie shares the win.',
            'Your secret role says whether you want the gold reached. In the Prospector Duel there are no roles: both of you dig.',
          ],
        },
        {
          id: 'turn',
          title: 'Your turn',
          body: [
            {
              ol: [
                '**Lay a tunnel** on a glowing square. It must match every neighbour and join the entrance. Turn it round with the R key.',
                '**Or play an action** on a player, a destination or a tunnel.',
                '**Or discard**: one card (Expanded: one to three).',
              ],
            },
            'Then draw back up while the deck lasts. A round ends when the gold is reached or every hand is empty.',
          ],
        },
        {
          id: 'modes',
          title: 'Three ways to play',
          body: [
            {
              ul: [
                '**Classic Mining** (3–10): hidden miners and saboteurs. Miners draft gold cards if the gold is reached; otherwise saboteurs are paid.',
                '**Expanded Mining** (2–10): green and blue crews, coloured gates, ladders, crystals, theft and traps. 15 roles.',
                `**Prospector Duel** (2): no roles. Whoever reaches the gold takes ${DUEL_FINDER}, the other ${DUEL_OTHER}.`,
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'full',
      title: 'Full rules',
      sections: [
        {
          id: 'mine',
          title: 'The mine',
          body: [
            'The entrance sits on the left; the three destinations wait in a column eight squares to its right, two squares apart. Which one is the gold is shuffled every round.',
            'A tunnel card must touch the mine, match every edge it shares (open to open, wall to wall) and join the entrance by an unbroken route. A card may be laid either way up, never sideways.',
            'Rubble cards (dead ends) have openings that stop at once: they must still match, but join nothing.',
            'When a joined route opens onto a face-down destination, it turns face up for everyone. Coal is turned to meet the tunnel. Reaching the gold ends the round.',
          ],
        },
        {
          id: 'actions',
          title: 'Action cards',
          body: [
            {
              ul: [
                '**Snapped Pickaxe, Doused Lantern, Cracked Cart**: break one tool of another player. Anyone with a broken tool cannot lay tunnels. One player never has the same tool broken twice.',
                '**New Haft, Fresh Wick, New Wheel**: mend that tool on anyone, yourself included. **Tinker** cards mend one of two tools.',
                '**Survey Map**: look at a face-down destination. Only you see it.',
                '**Cave-in**: remove any tunnel card, never the entrance or a destination.',
              ],
            },
          ],
        },
        {
          id: 'classic',
          title: 'Classic Mining',
          body: [
            'Roles are dealt from a pool with one more card than players, so nobody knows exactly how many saboteurs there are:',
            { ul: pools },
            'Hands: 6 cards for 3–5 players, 5 for 6–7, 4 for 8–10.',
            'If the gold is reached, as many gold cards as players (at most 9) are drawn. The finder picks one, then the rest pass against the turn order, to miners only, until all are taken. A saboteur who opens the gold hands the first pick to the next miner.',
            `If the round runs dry, each saboteur dealt is paid: ${Object.entries(SABOTEUR_PAY).map(([k, v]) => `${k} saboteur${k === '1' ? '' : 's'}: ${v} each`).join('; ')}.`,
          ],
        },
        {
          id: 'expanded',
          title: 'Expanded Mining',
          body: [
            `The classic deck plus 51 more cards, 118 in all. Each round ${SET_ASIDE} cards are set aside unseen and everyone holds 6. Roles come from 15: 4 green, 4 blue, 3 saboteurs, a foreman, an opportunist and 2 crystal seekers.`,
            {
              ul: [
                '**Gates**: a green gate bars the blue crew, a blue gate the green crew.',
                '**Ladders** count as joined to the entrance wherever they touch the mine, but never beside a destination.',
                '**Crystals** pay the seekers: the crystals showing at the end, split between the seekers dealt, rounded down.',
                '**Pickpocket**: lay it before you; when the round is paid out, steal 1 gold from someone who has any. **Strongbox** removes one.',
                '**Locked In**: the player cannot dig and is paid nothing. **Rescue Rope** frees them.',
                '**Trade Satchels** swaps hands; **Lantern Glance** shows a role; **New Badge** replaces a role with one nobody was dealt.',
              ],
            },
            'If the gold is reached, the finder’s crew wins if its own way is open, otherwise the crew whose way is. A neutral finder lets every crew with an open way win. The foreman wins with any crew, the opportunist with whoever wins. If the round runs dry, saboteurs and the opportunist win.',
            'Winners are paid by how many there are: 1 winner 5, 2 winners 4 each, 3 winners 3, 4 winners 2, 5 or more 1 each. The foreman takes 1 less, the opportunist 2 less. Locked-in players are paid nothing.',
          ],
        },
        {
          id: 'duel',
          title: 'Prospector Duel',
          body: [`Two players, the classic deck, 6 cards each, no roles. Whoever opens the gold takes ${DUEL_FINDER} gold and the other ${DUEL_OTHER}. If the cards run out first, nobody earns.`],
        },
        {
          id: 'table',
          title: 'Table settings',
          body: [
            'The host picks the mode, the number of rounds (1, 3, 5 or 10), an optional gold target (10, 15, 20 or 30), a turn timer and what happens when someone drops out. Settings are fixed once the game starts.',
            'A gold target is checked only after a whole round. When a turn timer runs out, anyone may end that turn with a single discard.',
            'After a minute away, a seat either waits for its player or passes for them, as chosen, until they return.',
          ],
        },
      ],
    },
    {
      id: 'rules',
      title: 'Fine print',
      sections: [
        {
          id: 'turns',
          title: 'Turns and rounds',
          body: [
            'Who opens the first round is drawn by lot. Each later round opens with the player after whoever played last.',
            'Once the deck is gone, a player with an empty hand is skipped. The round ends dry when every hand is empty.',
            'Discarding two cards to clear a broken tool, trap or Pickpocket in front of you is part of Expanded only.',
          ],
        },
        {
          id: 'hidden',
          title: 'What stays hidden',
          body: [
            'Destinations nobody reached stay face down, even after the round. What you surveyed or glanced at is recorded only for you, marked with its round, and may have changed since.',
            'Hands, roles and the deck never leave the server except to the player they belong to. Card numbers say nothing about the card.',
          ],
        },
        {
          id: 'gold',
          title: 'Gold',
          body: [
            `Classic gold cards: ${REWARD_CARDS.map(([v, c]) => `${c} worth ${v}`).join(', ')}. If a long game uses them all, a fresh set is shuffled in.`,
            'Expanded gold is counted as plain whole pieces. A Pickpocket held by a locked-in player does nothing. The last Pickpocket laid steals first, then the others in turn order.',
          ],
        },
      ],
    },
  ],
};
