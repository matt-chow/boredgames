import type { GuideDoc } from '../../../hub/guide';

/** Written from docs/RULES.md and docs/VARIANTS.md. tests/guides.test.ts replays the worked examples on the engine. */
export const guide: GuideDoc = {
  title: 'Bohnanza guide',
  levels: [
    {
      id: 'quick',
      title: 'Quick reference',
      sections: [
        { id: 'q-goal', title: 'Objective', body: ['Plant beans, trade them, and harvest fields for coins. **Most coins wins.**'] },
        {
          id: 'q-turn',
          title: 'Your turn',
          body: [
            {
              ol: [
                '**Plant** the front card of your hand. You must. You may then plant the next one too.',
                '**Turn over** two cards from the deck, then trade with the other players.',
                '**Plant** every kept and received card. All players do this.',
                '**Draw** three cards to the back of your hand.',
              ],
            },
          ],
        },
        {
          id: 'q-limits',
          title: 'What you can’t do',
          body: [
            {
              ul: [
                'Reorder your hand, or plant from anywhere but the front.',
                'Mix beans in a field.',
                'Trade unless it is the trading step, or trade with anyone but the active player when it isn’t your turn.',
                'Re-trade a card you just received, or trade a card already in a field.',
                'Harvest a field with one bean while another of your fields holds more than one.',
              ],
            },
          ],
        },
        {
          id: 'q-actions',
          title: 'Key actions',
          body: [
            {
              ul: [
                '**Plant:** drag a card onto a highlighted field, or tap the card and then the field.',
                '**Offer:** press Offer, tap what you’ll give and pick what you want back.',
                '**Harvest:** use a field’s harvest control. You can do this at any time, even on another player’s turn.',
              ],
            },
          ],
        },
        { id: 'q-score', title: 'Scoring', body: ['A field pays the highest number its bean card’s beanometer reaches for the beans in it. Those coins are yours. The rest go to the discard pile.'] },
        { id: 'q-end', title: 'End of the game', body: ['The game ends when the deck runs out for the **third** time. Every field is harvested once more. Cards left in hands are worth nothing.'] },
      ],
    },
    {
      id: 'full',
      title: 'How to play',
      sections: [
        {
          id: 'f-setup',
          title: 'Setup and components',
          body: [
            'The game seats 3 to 5 players. The deck has 104 bean cards in 8 kinds. The rarer a bean, the fewer you need to earn a coin.',
            { ul: ['**3 players:** three bean fields each.', '**4 or 5 players:** two bean fields each.', 'Everyone is dealt five cards, and a random player starts. Play then passes to the left.'] },
          ],
        },
        {
          id: 'f-hand',
          title: 'Hand order',
          body: [
            'This is the rule that makes the game. Your hand has a **front** (marked FRONT) and a back. You can only plant from the front, and new cards go to the back. Nobody can rearrange a hand, you included.',
            'Trading is how you get rid of a bad card before it reaches the front. When you give away a card from the middle, the cards behind it move up.',
          ],
        },
        {
          id: 'f-fields',
          title: 'Fields and planting',
          body: [
            'A field holds one kind of bean, in any number. Two of your fields may hold the same kind.',
            'When you must plant a bean and no field fits, you must harvest a field first to make room. That can cost you beans before they’re worth anything, so plan ahead.',
          ],
        },
        {
          id: 'f-phase1',
          title: 'Step 1: plant from your hand',
          body: ['Plant your front card. This is required, and you can’t turn over cards until you do. You may plant the new front card as well, or stop. If your hand is empty, you skip this step.'],
        },
        {
          id: 'f-trade',
          title: 'Step 2: turn over two cards and trade',
          body: [
            'The active player turns over the top two cards of the deck. They belong to the active player, who may keep them or trade them.',
            'Every trade involves the active player. Other players can’t trade with each other.',
            {
              ul: [
                '**Making an offer:** press Offer, tap cards from your hand to give (or a turned-over card, on your turn), and pick the beans you want in return.',
                '**Offers are proposals:** a dashed slip is an offer. No card moves until the receiver accepts.',
                '**Counteroffers:** Counter turns an offer around and closes the one it answers.',
                '**Gifts:** leave one side empty to give a card for nothing or to ask for a gift. The receiver still has to accept.',
                '**Which cards move:** if you hold more copies of a requested bean than you need to give, you choose which ones go. That decides which of your cards move up.',
                'Several offers can be open at once. If a card is used by a trade that goes through, any other offer needing it disappears.',
              ],
            },
            'Only the active player ends trading. Trading may go on after both turned-over cards have gone.',
          ],
        },
        {
          id: 'f-phase3',
          title: 'Step 3: plant traded and turned-over cards',
          body: ['When trading ends, open offers are cancelled and the active player keeps any turned-over cards still unused. Every player then plants all the cards they kept or received, in any order. They can’t go into your hand, and they must be planted before the turn can continue. Harvest first if you need the room.'],
        },
        { id: 'f-draw', title: 'Step 4: draw', body: ['The active player draws three cards, one at a time, to the back of the hand. Play passes to the left.'] },
        {
          id: 'f-harvest',
          title: 'Harvesting and scoring',
          body: [
            'You may harvest any of your own fields at any time, including on other players’ turns. The bean card’s beanometer shows how many beans earn 1, 2, 3 or 4 coins. You get the highest it reaches.',
            'That number of cards turn over to become your coins, and the remaining beans go to the discard pile. A field too small to pay gives nothing.',
            '**Bean protection:** a field with a single bean can’t be harvested while another of your fields holds more than one. A **forced harvest** happens when a bean must be planted and fits nowhere: you must harvest something legal first.',
            {
              example: 'Example: a harvest',
              steps: ['A field holds 5 Chili Beans. Chili pays 1 coin at 3, 2 at 6, 3 at 8 and 4 at 9.', 'The highest it reaches is 3 beans, so it pays **1 coin**.', 'One card becomes a coin. The other four go to the discard pile. One more bean would have made it worth 2.'],
            },
          ],
        },
        {
          id: 'f-end',
          title: 'Reshuffles and the end',
          body: [
            'When the deck runs out, the discard pile is shuffled into a new deck. The game ends when the deck runs out for the **third** time.',
            {
              ul: [
                'If that happens while turning over cards, trading and planting finish with what was turned over, and then the game ends without a draw.',
                'If it happens while drawing, the game ends at once.',
              ],
            },
            'Every field is then harvested once more. Most coins wins. On a tie, the tied player furthest clockwise from the starting player wins.',
          ],
        },
        {
          id: 'f-examples',
          title: 'Worked examples',
          body: [
            {
              example: 'A full turn',
              steps: [
                'You have two fields: 2 Red Beans and an empty one. Your hand, front to back: Red, Blue, Soy.',
                'You plant the Red, so that field holds 3. You don’t plant the Blue, because you’d rather trade it, and move on.',
                'You turn over a Green and a Garden Bean. You offer the Garden to a neighbour in return for a Red from their hand, and they accept.',
                'You end trading. You must now plant the Green you kept and the Red you received. The Red joins your Reds and the Green takes the empty field.',
                'You draw three cards to the back of your hand. The turn passes on.',
              ],
            },
            {
              example: 'A gift that helps you both',
              steps: [
                'You have planted, and your new front card is a Stink Bean. Both your fields hold other beans, so planting it next turn would force a harvest.',
                'During your trading step you offer that Stink Bean with nothing asked in return. A player collecting Stink accepts.',
                'They must plant it in step 3. Your next card moves to the front, and you lose nothing from a field.',
              ],
            },
            {
              example: 'A forced harvest',
              steps: [
                'Your fields hold 1 Soy and 4 Blue. Your front card is a Green Bean, and it fits neither field.',
                'You can’t harvest the single Soy, because the Blue field holds more than one. Bean protection blocks it.',
                'You must harvest the Blue field. Four Blue Beans pay 1 coin, and the Green Bean takes its place.',
              ],
            },
          ],
        },
        {
          id: 'f-variants',
          title: 'Variants',
          body: [
            'The host can switch these on in the room before the game starts. The lobby explains anything that can’t be combined.',
            {
              ul: [
                '**Three New Bean Types (3–5 players):** adds new beans. In step 4 every player draws one card instead. With 3 players the game ends on the second run through the deck.',
                '**The Field Bean (4–5 players):** harvest exactly two Field Beans to gain a permanent third field. Every player draws one card in step 4.',
                '**AMIGO Bean Coin (3–5 players):** when your fields are worth enough, claim the coin. Its holder draws four cards, and a player whose fields are worth nothing draws two. It breaks ties.',
                '**Magpie Bean (3–5 players):** a Magpie at the front of your hand is played rather than planted, and steals the top bean from a field of up to two players.',
              ],
            },
          ],
        },
        {
          id: 'f-mistakes',
          title: 'Common mistakes',
          body: [
            {
              ul: [
                'Forgetting that received cards must be planted now, rather than kept for later.',
                'Planting a second card out of habit. The second plant is optional.',
                'Holding a field too long. Harvest before a forced harvest wastes it.',
                'Asking for too much. A trade helps both sides, and a player whose card is awkward may give it to you for free.',
              ],
            },
          ],
        },
        {
          id: 'f-controls',
          title: 'Controls',
          body: ['Drag a card onto a highlighted field, or tap the card and then the field. Long-press or right-click any card to read it. On the table, drag the background to pan, and scroll or pinch to zoom.'],
        },
      ],
    },
    {
      id: 'rules',
      title: 'Detailed rules',
      sections: [
        {
          id: 'r-beans',
          title: 'Bean counts and beanometers',
          body: [
            'Beans needed for 1, 2, 3 and 4 coins. A dash means that amount can’t be earned.',
            {
              ul: [
                '**Blue** (20 cards): 4, 6, 8, 10',
                '**Chili** (18): 3, 6, 8, 9',
                '**Stink** (16): 3, 5, 7, 8',
                '**Green** (14): 3, 5, 6, 7',
                '**Soy** (12): 2, 4, 6, 7',
                '**Black-eyed** (10): 2, 4, 5, 6',
                '**Red** (8): 2, 3, 4, 5',
                '**Garden** (6): –, 2, 3, –',
              ],
            },
          ],
        },
        {
          id: 'r-timing',
          title: 'Timing',
          body: [
            {
              ul: [
                'Harvesting is allowed at any time, except that a victim can’t harvest to dodge a Magpie steal in progress.',
                'Trading exists only in step 2. Offers still open when trading ends are cancelled.',
                'Undo covers only your own plant or harvest, and only before anything else happens. Turning over cards, drawing and trading reveal information, so they can’t be undone.',
              ],
            },
          ],
        },
        {
          id: 'r-trade',
          title: 'Trading clarifications',
          body: [
            {
              ul: [
                'A card received in a trade can’t be traded again. It must be planted in step 3.',
                'Cards in fields can never be traded.',
                'The active player may offer any hand card from any position, plus either turned-over card.',
                'Other players may ask for a specific turned-over card, because those are face up. They may ask for hand beans by kind only, because hands are hidden.',
                'An open offer is visible to the table, but hand cards in it show their kind only.',
                'Accepting re-checks every card, so a card can’t be spent twice, even if two people click at once.',
              ],
            },
          ],
        },
        {
          id: 'r-end',
          title: 'Ending edge cases',
          body: [
            {
              ul: [
                'If a reshuffle finds an empty discard pile, that counts as the deck running out again.',
                'If the deck ends after only one of the two cards is turned over, trading continues with that one.',
                'Cards in hand at the end score nothing. Every field is harvested for what it pays.',
              ],
            },
          ],
        },
        {
          id: 'r-counts',
          title: 'Player counts',
          body: ['This version plays with 3 to 5 people. Other counts are refused, and the two-player Duel variant isn’t offered. Computer players can fill seats.'],
        },
        {
          id: 'r-coin',
          title: 'Bean Coin details',
          body: [
            {
              ul: [
                'The coin starts with the player to the right of the starting player.',
                'The active player can claim it when no other decision is waiting and their fields are worth at least 6 coins (3 players) or 5 (4–5 players).',
                'The holder may hand it over. If they resist, the claimant draws a random card from their hand, shows it and must plant it. A Blue Bean blocks the claim, and the claimant can’t try again this turn.',
                'A holder with no cards can’t resist. The coin moves at once.',
                'When drawing, the holder rule (4 cards) wins over the worth-nothing rule (2 cards).',
                'It can’t be combined with other variants, because their draw rules don’t fit its thresholds.',
              ],
            },
          ],
        },
        {
          id: 'r-field',
          title: 'Field Bean details',
          body: [{ ul: ['Exactly two Field Beans pay no coins and give a permanent third field.', 'Three pay 3 coins. A player who already has a third field never gets a second extra one.', 'A single Field Bean pays nothing.'] }],
        },
        {
          id: 'r-magpie',
          title: 'Magpie details',
          body: [
            {
              ul: [
                'A Magpie can’t be planted. At the front in step 1 it must be played, and counts as one of the two cards for that step.',
                'It steals the top bean of one field from each of up to two different players. Each stolen bean is planted at once, harvesting first if needed. You can stop early.',
                'If no other player has a bean in a field, it’s simply discarded.',
                'A Magpie you received or kept in step 2 goes to the back of your hand in step 3.',
              ],
            },
          ],
        },
      ],
    },
  ],
};
