import type { GuideDoc } from '../../../hub/guide';
import { DELIVERIES_TO_WIN, INTERCEPTIONS_TO_WIN, MAX_ROUNDS, STATEMENTS_PER_BRIEFING } from '../rules/engine';

export const guide: GuideDoc = {
  title: 'Dead Drop',
  levels: [
    {
      id: 'quick',
      title: 'Quick',
      sections: [
        {
          id: 'goal',
          title: 'How to win',
          body: [
            `**${DELIVERIES_TO_WIN} deliveries** with at least one at each of your two secret locations, or **${INTERCEPTIONS_TO_WIN} interceptions**.`,
            `After ${MAX_ROUNDS} rounds: most deliveries, then most interceptions, then most Challenge Points, otherwise a draw.`,
          ],
        },
        {
          id: 'round',
          title: 'Each round',
          body: [
            {
              ol: [
                '**Briefing.** Chat freely. File at least one formal statement and acknowledge your rival’s.',
                '**Secret orders.** Both choose an action and a location, then lock. Nobody sees the other’s until both have locked.',
                '**Report.** Public signals show locations, never actions. Your private findings are always true.',
              ],
            },
          ],
        },
        {
          id: 'actions',
          title: 'The four orders',
          body: [
            {
              ul: [
                '**Deliver** at one of your mission locations: +1 delivery, unless your rival intercepts there.',
                '**Investigate** anywhere: learn in private whether it is a rival mission location.',
                '**Intercept** anywhere: catch a delivery there for +1 interception. Catch a decoy and your rival gains Cover.',
                '**Decoy** anywhere: the signal looks like any other. If intercepted, you gain Cover.',
              ],
            },
            '**Cover:** hold at most one. Spend it on a delivery to broadcast a false location. Interception still checks where you really are.',
          ],
        },
      ],
    },
    {
      id: 'full',
      title: 'Full rules',
      sections: [
        {
          id: 'missions',
          title: 'Missions',
          body: ['There are four locations: Embassy, Rail Station, Grand Hotel and Harbour. Each player is dealt two different ones at random and independently, so your missions can overlap with your rival’s. They stay private until the match ends.'],
        },
        {
          id: 'briefing',
          title: 'Briefing',
          body: [
            'Chat is open from start to finish. Nothing in it is checked.',
            `You must file at least one formal statement, up to ${STATEMENTS_PER_BRIEFING}, and acknowledge every statement your rival files. When you both have, orders begin. A new statement must be acknowledged too.`,
            {
              ul: [
                '“I delivered at [location] last round”',
                '“I investigated [location] last round”',
                '“I deployed a decoy at [location] last round”',
                '“I did not deliver last round”',
                '“Nothing to report”: the only choice in round 1, and it can’t be challenged.',
              ],
            },
            'Statements can be false. “Delivered” means you issued the Deliver order there, even if it was intercepted.',
          ],
        },
        {
          id: 'challenges',
          title: 'Challenges',
          body: [
            'You have one Challenge token for the whole match. During any briefing, spend it on one of your rival’s statements that hasn’t been challenged.',
            'If the statement was false you earn a Challenge Point. If it was true, your rival does. Points only break a tie after the last round, and never end the match.',
            '**Sealed findings.** Whether someone delivered can’t be revealed without giving away their orders, so a challenge to a “delivered” or “did not deliver” statement stays sealed until the match ends, whatever the answer. Challenges to “investigated” or “decoy” statements are announced at once.',
          ],
        },
        {
          id: 'report',
          title: 'What gets revealed',
          body: [
            {
              ul: [
                '**Public:** each signal’s location, every successful interception and where it was, who holds Cover, and who spent or gained it.',
                '**Private:** your own results, your delivery count and your investigation journal.',
                '**At the end:** both missions, every order and every sealed challenge.',
              ],
            },
            'Spending Cover shows that you attempted a delivery, but not where. A delivery is never announced as a success.',
          ],
        },
        {
          id: 'away',
          title: 'If someone goes quiet',
          body: [
            'Once you have done your part you can call time: after 2 minutes in a briefing, 1 minute for orders and 30 seconds for a report, or 15 seconds if time was called on them before and they haven’t acted since.',
            'A called briefing moves to orders, a called report moves on, and called orders resolve the round with no order from them. Quitting ends the game for both players.',
          ],
        },
      ],
    },
    {
      id: 'rules',
      title: 'Fine print',
      sections: [
        {
          id: 'res',
          title: 'Resolution',
          body: [
            'Both orders resolve at once: the order you locked them in changes nothing. If both players reach victory in the same round, the match is drawn.',
            'A round that ends the match goes straight to the results, with no report.',
            'Intercepting a decoy is not a successful interception and scores nothing. A player already holding Cover gains none. Interceptions at the wrong place, or on an investigation or another interception, do nothing and look the same to the interceptor.',
          ],
        },
        {
          id: 'cover',
          title: 'Cover',
          body: ['Spending Cover requires a delivery, and a false location different from your true one. A delivery under Cover that your rival catches is blocked as usual, and the interception shows the true location.'],
        },
      ],
    },
  ],
};
