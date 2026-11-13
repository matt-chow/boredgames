import type { GuideDoc } from '../../../hub/guide';
import { KINDS, MUST_DEPOSE, ROLE_ORDER, ROLES } from '../rules/roles';
import { TIMER_CHOICES } from '../rules/types';

const role = (r: (typeof ROLE_ORDER)[number]) => {
  const x = ROLES[r];
  return `**${x.name}**: ${KINDS[x.action].text.replace(/^[^:]+: /, '')}${x.blocks ? ` Blocks ${KINDS[x.blocks].name}.` : ' Blocks nothing.'}`;
};

export const guide: GuideDoc = {
  title: 'Palazzo',
  levels: [
    {
      id: 'quick',
      title: 'Quick',
      sections: [
        {
          id: 'goal',
          title: 'How to win',
          body: ['You hold two hidden **influence** cards: courtiers of the palazzo. Lose both and you are out. The last player with influence wins.'],
        },
        {
          id: 'turn',
          title: 'Your turn',
          body: [
            'Take one action. Anyone can take the general actions. The role actions need you to **claim** a role, and you may claim one you don’t hold.',
            {
              ul: [
                `**Income**: ${KINDS.income.text}`,
                `**Levy**: ${KINDS.levy.text}`,
                `**Depose**: ${KINDS.depose.text} With ${MUST_DEPOSE} or more coins you must Depose.`,
              ],
            },
          ],
        },
        { id: 'roles', title: 'The roles (3 of each)', body: [{ ul: ROLE_ORDER.map(role) }] },
        {
          id: 'answer',
          title: 'Challenges and blocks',
          body: [
            'When someone claims a role, anyone else may **challenge**. If the claim was true, the challenger loses an influence and the claimant swaps the proven card for a new one from the deck. If it was a bluff, the claimant loses an influence and the action fails.',
            'Some actions can be **blocked** by claiming a role. A block is a claim too, so it can be challenged.',
          ],
        },
      ],
    },
    {
      id: 'full',
      title: 'Full rules',
      sections: [
        {
          id: 'setup',
          title: 'Setting up',
          body: [
            'The deck holds 15 cards, three of each role. Everyone is dealt two cards and 2 coins. In a two-player game the first player starts with 1 coin.',
            'The first player is chosen at random. In a rematch the last winner goes first, if they are still at the table.',
            'In a two-player game the host may turn on the **draft**: each player is dealt three cards, keeps two and returns one to the deck, which is shuffled.',
          ],
        },
        {
          id: 'order',
          title: 'How an action resolves',
          body: [
            {
              ol: [
                'You declare the action and its target, and pay its cost.',
                'If it claims a role, everyone else may challenge it. The first challenge counts.',
                'If it can be blocked, the players allowed to block may do so. Levy can be blocked by any opponent, Seize and Strike only by the target.',
                'A block may be challenged by anyone except the blocker.',
                'If nothing stopped it, the action happens.',
              ],
            },
            `Each question stays open for the time the host chose (${TIMER_CHOICES.join(', ')} seconds). It closes early once everyone has let it stand. When time runs out, anyone who hasn’t answered lets it stand.`,
          ],
        },
        {
          id: 'losing',
          title: 'Losing influence',
          body: [
            'When you lose an influence, you choose which of your hidden cards to reveal. With only one hidden card left it is revealed for you. Revealed cards stay face up for the rest of the game.',
            'With no hidden cards left you are out. You keep watching what everyone can see, and your chat reaches only other players who are out until the game ends.',
          ],
        },
        {
          id: 'strike',
          title: 'Strikes',
          body: [
            'A Strike costs 3 coins, paid when it is declared. If the Strike is challenged and turns out to be a bluff, the coins come back. If it is blocked, they stay spent.',
            'The target can be hit twice. They may claim the Sentinel to block. If that block is challenged and shown to be a bluff, they lose an influence for the bluff and then another to the Strike.',
            'If the target is out before the Strike resolves, it does nothing and the coins stay spent.',
          ],
        },
        {
          id: 'parley',
          title: 'Parley',
          body: ['Take 1 coin and draw a card. Then return one card to the deck: the drawn card or one of your hidden cards. The deck is shuffled. Nobody sees what you returned.'],
        },
        {
          id: 'inspect',
          title: 'Inspect',
          body: [
            'Choose a player with two hidden cards. One of them, picked at random, is shown to you alone. Nobody else learns which role it was.',
            'What you saw is marked out of date as soon as that player’s hidden cards change: when they reveal or replace a card, or Parley.',
          ],
        },
      ],
    },
    {
      id: 'rules',
      title: 'Details',
      sections: [
        {
          id: 'r-seize',
          title: 'Seize and Levy',
          body: ['Seize takes up to 2 coins, as many as the target has. It is legal against a player with no coins. Levy is the only general action that can be blocked: any opponent may claim the Magistrate.'],
        },
        {
          id: 'r-out',
          title: 'Targets who are out',
          body: ['Any targeted action does nothing if its target is out by the time it resolves: Seize, Strike, Depose and Inspect alike.'],
        },
        {
          id: 'r-table',
          title: 'At the table',
          body: [
            'The server deals, shuffles and checks every move. An answer sent after its question closed, or sent twice, is refused.',
            'If someone disconnects, the host’s setting decides. **Pause** stops the clock until they return. **Carry on** keeps the table moving and waits only when the decision is theirs. A paused question resumes with the time it had left, never less than 5 seconds. Nobody plays for anyone, and the host cannot see anyone’s cards.',
            'Opening the reference or the rules never pauses the clock.',
          ],
        },
      ],
    },
  ],
};
