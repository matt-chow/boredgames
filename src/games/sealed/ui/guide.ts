import type { GuideDoc } from '../../../hub/guide';
import { DEFAULT_TARGET, KINDS, ORDER, RULESET_NAMES, RULESET_PLAYERS, deckKinds, type Ruleset } from '../rules/cards';
import { TARGET_MAX } from '../rules/types';

/** The guide for one ruleset: only its characters, its card counts and its player range. */
export function guideFor(r: Ruleset): GuideDoc {
  const kinds = ORDER.filter((k) => KINDS[k].count[r] > 0);
  const [lo, hi] = RULESET_PLAYERS[r];
  const other: Ruleset = r === 'classic' ? 'expanded' : 'classic';
  const extra = ORDER.filter((k) => KINDS[k].count[other] > 0 && KINDS[k].count[r] === 0);
  const targets = Object.entries(DEFAULT_TARGET)
    .filter(([n]) => +n >= lo && +n <= hi)
    .map(([n, t]) => `${n} players: ${t} favors`);
  return {
    title: 'Sealed Correspondence',
    note: `These rules are for the ${RULESET_NAMES[r]} ruleset: ${deckKinds(r).length} cards, ${lo} to ${hi} players.`,
    levels: [
      {
        id: 'quick',
        title: 'Quick',
        sections: [
          {
            id: 'goal',
            title: 'How to win',
            body: [
              'Each round you hold one sealed letter: a member of the court. Be the last one still in, or hold the highest card when the deck runs out, to win a **favor**. The first to reach the target number of favors wins the game; players who reach it together win together.',
            ],
          },
          {
            id: 'turn',
            title: 'Your turn',
            body: [
              { ol: ['You draw a card, so you hold two.', '**Play one** of them face up. Its ability happens at once; some ask you to choose a player or name a character.', 'Keep the other, hidden, until your next turn.'] },
              'A card that puts you out shows what you held. Nothing you play can be taken back.',
            ],
          },
          {
            id: 'court',
            title: 'The court',
            body: [{ ul: kinds.map((k) => `**${KINDS[k].value} ${KINDS[k].name}** (×${KINDS[k].count[r]}): ${KINDS[k].text}`) }],
          },
        ],
      },
      {
        id: 'full',
        title: 'Full rules',
        sections: [
          {
            id: 'setup',
            title: 'Each round',
            body: [
              'All cards are shuffled. One is set aside face down, unseen by anyone: the reserve. With two players, three more are set aside face up for everyone to see. Everyone is dealt one card.',
              'The first round’s opener is chosen at random. After that the winner of the last round opens; if several won, one of them is chosen at random.',
            ],
          },
          {
            id: 'choosing',
            title: 'Choosing players',
            body: [
              'Some cards choose another player. You can never choose a player who is out, or one under the Confessor’s protection.',
              'If everyone else is protected or out, the card is still played, with no effect. The Magistrate is the exception: it must then choose you.',
              'A card discarded because of another card (the Magistrate, or being put out) does nothing, except that discarding the Heir always puts its holder out.',
            ],
          },
          {
            id: 'dowager',
            title: 'The Dowager',
            body: [
              'If you hold the Dowager with the Ambassador or the Magistrate, you must play the Dowager. You may also play it whenever you like, so nobody can tell from the table whether you had to.',
              ...(r === 'expanded' ? ['The Dowager rule does not apply while you choose which card to keep for the Archivist.'] : []),
            ],
          },
          {
            id: 'end',
            title: 'End of a round',
            body: [
              'The round ends when only one player is still in, or when a turn ends with the deck empty. Then everyone still in shows their card; the highest wins. Players tied for the highest all win a favor.',
              ...(r === 'expanded' ? ['**Informant:** if exactly one player still in at the end of the round played or discarded an Informant this round, they gain a favor too, even if they also won the round.'] : []),
              'The reserve card is turned up when the round ends.',
            ],
          },
          {
            id: 'target',
            title: 'Favors to win',
            body: [{ ul: targets }, `The host may set any target from 1 to ${TARGET_MAX} instead.`],
          },
        ],
      },
      {
        id: 'rules',
        title: 'Details',
        sections: [
          {
            id: 'r-cards',
            title: 'Card by card',
            body: [
              {
                ul: [
                  '**Heir:** playing it, or discarding it for any reason, puts you out.',
                  '**Ambassador:** you and the chosen player swap your remaining cards. Only the two of you see them.',
                  ...(r === 'expanded' ? ['**Archivist:** draw up to two cards; keep one of the cards in your hand and put the others under the deck in an order you choose. With an empty deck it does nothing.'] : []),
                  '**Magistrate:** the chosen player (you may choose yourself) discards their card and draws a new one. If the deck is empty they take the reserve card.',
                  '**Confessor:** until your next turn begins, no one else can choose you.',
                  '**Duelist:** you and the chosen player compare cards in secret. The lower is out; a tie does nothing.',
                  '**Scribe:** you see the chosen player’s card. Nobody else does.',
                  '**Censor:** name any character except the Censor. If the chosen player holds it, they are out.',
                ],
              },
            ],
          },
          {
            id: 'r-table',
            title: 'At the table',
            body: [
              'The server deals and checks every move; a move sent twice, or for a turn that has passed, is refused.',
              'If someone loses their connection the game waits for them. Nobody plays for them, and the optional turn timer only warns. Anyone may end an abandoned game for everyone from the menu; no winner is named.',
              ...(extra.length ? [`The ${RULESET_NAMES[other]} ruleset ${r === 'classic' ? 'adds' : 'leaves out'} ${extra.map((k) => `the ${KINDS[k].name}`).join(' and ')}${r === 'classic' ? ', one more Censor, and allows 2 to 6 players' : ''}.`] : []),
            ],
          },
        ],
      },
    ],
  };
}

export const guide = guideFor('classic');
