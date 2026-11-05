import type { GuideBlock, GuideDoc } from '../../../hub/guide';
import { EDITIONS } from '../rules/editions';

/** Written from the engine and docs/CLOCKWORK.md. tests/guides.test.ts checks the numbers and replays the worked examples. */
export const guide: GuideDoc = {
  title: 'Kingdom & Commerce guide',
  levels: [
    {
      id: 'quick',
      title: 'Quick reference',
      sections: [
        { id: 'q-goal', title: 'Objective', body: ['Build a deck of cards that earns more each time round, then turn that wealth into Renown. **Most Renown when the game ends wins.**'] },
        {
          id: 'q-turn',
          title: 'Your turn',
          body: [
            {
              ol: [
                '**Royal Court:** play Actions. You start with 1 Action.',
                '**Market:** play Currency for Coins, then buy cards or complete Crown Projects. You start with 1 Buy.',
                '**Cleanup:** everything in hand and in play goes to your discard pile, and you draw 5.',
              ],
            },
          ],
        },
        {
          id: 'q-limits',
          title: 'What limits you',
          body: [
            {
              ul: [
                'Each Action card costs 1 Action to play, unless a card gave you more.',
                'Each purchase and each Crown Project costs 1 Buy.',
                'Coins and unused Actions and Buys vanish at the end of your turn.',
                'Influence stays between turns, up to **8**. You can convert up to **2** a turn into Coins, 1 for 1.',
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
                '**Play a card:** tap a highlighted card in your hand.',
                '**Play all Currency cards:** one button, in the Market phase.',
                '**Buy:** tap a highlighted pile. **Complete a Project:** tap a highlighted Crown Project.',
                '**Your Renown:** the number in your dashboard. Tap it for the breakdown and your deck overview.',
              ],
            },
          ],
        },
        {
          id: 'q-symbols',
          title: 'Symbols',
          body: [
            {
              symbols: [
                { icon: 'action', name: 'Actions', text: 'How many Action cards you can still play this turn.' },
                { icon: 'buy', name: 'Buys', text: 'How many cards you can still buy this turn.' },
                { icon: 'coin', name: 'Coins', text: 'What you have to spend this turn. Costs show the same symbol.' },
                { icon: 'influence', name: 'Influence', text: 'Carries over between turns. Convert it to Coins, or spend it on Crown Projects.' },
                { icon: 'crown', name: 'Renown', text: 'Your score. Highest at the end wins.' },
              ],
            },
          ],
        },
        { id: 'q-score', title: 'Scoring', body: ['Homestead 1, Noble Estate 3, Grand Duchy 6, plus scoring cards and the Renown of every Crown Project stage you funded. Royal Debt is −1. Your total is private until the end.'] },
        {
          id: 'q-end',
          title: 'End of the game',
          body: [
            'The ending is triggered at the end of a turn in which any of these is true:',
            { ul: ['The Grand Duchy pile is empty.', '**All 5** Crown Projects are complete.', '**3** market piles are empty (**4** with 5 or 6 players).'] },
            '**The round then finishes**, so everyone has had the same number of turns. Then Renown is counted.',
          ],
        },
      ],
    },
    {
      id: 'full',
      title: 'How to play',
      sections: [
        {
          id: 'f-setup',
          title: 'Setup and your starting deck',
          body: [
            'The game seats 2 to 6 players. Each player starts with **7 Bronze** and **3 Homesteads**, shuffles them and draws 5. A random player goes first.',
            'The host picks which card sets are in play, and can choose or ban cards. A game uses 10 Kingdom Market piles and 5 Crown Projects.',
          ],
        },
        {
          id: 'f-supply',
          title: 'The Treasury and the Kingdom Market',
          body: [
            'The **Treasury** is permanent: the same piles are available in every game, and they can’t be chosen or banned. It holds three Coins piles and three Renown piles:',
            {
              ul: [
                '**Bronze:** costs 0, gives 1 Coin. 60 in the pile.',
                '**Silver:** costs 3, gives 2 Coins. 40 in the pile.',
                '**Gold:** costs 6, gives 3 Coins. 30 in the pile.',
                '**Homestead:** costs 2, worth 1 Renown.',
                '**Noble Estate:** costs 5, worth 3 Renown.',
                '**Grand Duchy:** costs 8, worth 6 Renown.',
              ],
            },
            'Each of the three Renown piles holds 8 cards with 2 players, 12 with 3–4, 15 with 5 and 18 with 6.',
            'The **Kingdom Market** is the 10 piles chosen for this game, each of 10 cards (12 with 5 or 6 players). Each tile shows a card’s cost and how many are left. Tap and hold, or right-click, to read one.',
          ],
        },
        {
          id: 'f-cycle',
          title: 'How your deck cycles',
          body: [
            'A card you buy goes to your **discard pile**, not your hand. When you need to draw and your deck is empty, your discard pile is shuffled to make a new deck. So what you buy now comes round later, and a smaller deck comes round faster.',
            '**Improving your deck** is most of the game. Every Bronze and Homestead you own takes up a draw that could have been something better. Buying stronger cards and trashing weak ones both raise what an average hand is worth. Renown cards do the opposite until the end, so most players build first and buy Renown later.',
            'Your deck’s order is hidden, even from you. The **deck overview** shows what you own, but not where it is.',
          ],
        },
        {
          id: 'f-action',
          title: 'The Royal Court phase',
          body: [
            'Highlighted cards in your hand can be played. Tap one: it costs 1 Action and does what it says. Cards that give **+1 Action** or more let you carry on. When you’re finished, or have no Actions left, press **Move on to Market**.',
            'You don’t have to play anything. Unplayed cards are discarded at Cleanup.',
          ],
        },
        {
          id: 'f-establishment',
          title: 'Establishments',
          body: ['An Establishment is played like an Action but stays in play after your turn. It works again at the start of your next turn, then goes to your discard pile with everything else at that turn’s Cleanup, unless its text says otherwise. So its effect lasts across two of your turns.'],
        },
        {
          id: 'f-market',
          title: 'The Market phase',
          body: [
            'Tap Currency cards one at a time, or press **Play all Currency cards**. The Coins add to your total. Some Currency in the market has extra effects, so play those singly if you want to choose the order.',
            'Then spend Coins. Each purchase uses 1 Buy. You can still play more Currency after a purchase. Press **End turn** when you’re done.',
          ],
        },
        {
          id: 'f-words',
          title: 'Draw, discard, trash, gain and the rest',
          body: [
            'These words each mean something different. Cards use them exactly.',
            {
              ul: [
                '**Draw:** take from the top of your deck into your hand.',
                '**Discard:** put into your discard pile. You’ll see it again.',
                '**Trash:** remove from the game into the public trash pile. It no longer belongs to you and no longer scores.',
                '**Gain:** take from the supply without paying or using a Buy. It goes to your discard pile unless the card says otherwise.',
                '**Exchange:** a card that trashes one card and then gains another, usually a better one. If you don’t trash, you don’t gain.',
                '**Top-deck:** put on top of your deck, so you draw it next.',
                '**Reveal:** show to everyone. The card stays where it was unless told otherwise.',
                '**Set aside:** hold apart from your deck until the card says what happens to it. It still counts as yours.',
                '**Return:** put back to where the card names.',
              ],
            },
            'The discard and trash piles sit side by side at your table. Tap either to look through it. Everyone can inspect the trash.',
          ],
        },
        {
          id: 'f-attacks',
          title: 'Attacks and reactions',
          body: [
            'An **Attack** affects opponents, in turn order starting with the next player. When one is played, any target holding a **Reaction** can reveal it before the attack takes effect. Each Reaction says what it does. Royal Advocate, for one, goes to the bottom of your deck and makes you immune to that attack.',
            'You’re only asked if you hold a Reaction. Everyone can see that someone is deciding, but not what they hold. If a player must choose, the game waits for them. Only a bot playing a disconnected player’s seat chooses for them (see If a player disconnects).',
          ],
        },
        {
          id: 'f-debt',
          title: 'Royal Debt',
          body: [
            '**Royal Debt** is a burden: **−1 Renown** while you own it. You can’t buy it. You receive it from certain attacks and risky cards. Its pile only appears in games with a card that hands it out, and it holds 5 cards per opponent. Once it’s empty, nobody can receive more.',
            'Debt clogs your hand too. To clear it, play it as an Action and spend 1 Influence to trash it, or use any card that trashes.',
          ],
        },
        {
          id: 'f-influence',
          title: 'Influence',
          body: [
            'Influence is the game’s second currency. It’s shown in your dashboard as, say, 3/8: you hold 3, and the most you can hold is **8**. Extra Influence gained at the cap is lost. Unlike Coins, it stays between turns.',
            {
              ul: [
                '**Convert:** in the Market phase press **Convert Influence** for 1 Coin each, up to **2** a turn. The button shows how many you’ve used.',
                '**Build:** most Crown Projects need Influence as well as Coins.',
                '**Cards:** some cards spend Influence. That doesn’t count toward your conversion limit.',
              ],
            },
          ],
        },
        {
          id: 'f-projects',
          title: 'Crown Projects',
          body: [
            'Five Crown Projects are on the table at every player count: one with 1 stage, two with 2 stages and two with 3 stages, dealt at random when the game starts. Everyone builds them together.',
            'In the Market phase, for 1 Buy, you may pay the next unfunded stage of any Project and take that stage’s Renown. It’s yours even if the Project is never finished. Anyone can fund the next stage, so different players often share one Project. The printed reward goes to whoever funds the last stage.',
            'A Project is complete only when all its stages are funded. A Project with 2 or 3 stages costs 1 Coin more in total than its printed price. When **all 5** are complete, the ending is triggered. Crown Projects in Detailed rules has the full rule and worked examples.',
          ],
        },
        {
          id: 'f-renown',
          title: 'Renown and scoring',
          body: [
            'Your dashboard always shows your exact Renown. Tap it for a breakdown into Estates, special scoring, Crown Projects, negative cards and conditional cards. It counts every card you own in every zone. Trashed cards don’t count, and a total can go below zero.',
            'Opponents can’t see your total, and you can’t see theirs. The server doesn’t send it. Completed Projects are public, so you can estimate. The full scoring of every player appears when the game ends.',
            '**Conditional cards** score from what you own or did. Noble Council, for one, is worth 1 Renown per Homestead you own.',
          ],
        },
        {
          id: 'f-end',
          title: 'Ending the game',
          body: [
            'The game checks for the end after each player’s turn: the Grand Duchy pile empty, all 5 Crown Projects complete, or 3 market piles empty (4 with 5 or 6 players). A part-built Project doesn’t count. The permanent piles other than Grand Duchy don’t count as empty market piles.',
            'When one of these is true, the ending is triggered and can’t be undone. The player finishes their turn, and play carries on until every player has had the same number of turns. If the last seat of the round triggers it, the game ends straight away. The table shows **Final round** and how many turns are left.',
            'Those last turns are ordinary turns. You can play and buy as usual, with whatever is still in the supply, so an empty pile stays empty and an emptied Grand Duchy pile can’t be bought from. Renown is counted once the round finishes.',
            'Most Renown wins. Since everyone has had the same number of turns, equal totals share the place.',
          ],
        },
        {
          id: 'f-counts',
          title: 'Differences by player count',
          body: [{ ul: ['Renown piles grow from 8 cards (2 players) to 18 (6 players).', 'Market piles hold 10 cards, or 12 with 5 or 6 players.', 'With 5 or 6 players, 4 empty market piles end the game rather than 3.', 'The Royal Debt pile holds 5 per opponent.'] }],
        },
        {
          id: 'f-examples',
          title: 'Worked examples',
          body: [
            {
              example: 'A full first turn',
              steps: [
                'Your hand: 3 Bronze and 2 Homesteads. You have no Actions to play, so press **Move on to Market**.',
                'Press **Play all Currency cards**. You now have **3 Coins** and 1 Buy.',
                'Buy a **Silver** for 3. It goes to your discard pile.',
                'Press **End turn**. Everything goes to your discard pile and you draw 5 from your deck.',
              ],
            },
            {
              example: 'Improving your Currency',
              steps: [
                'You play **Mintmaster** (Action) with a Silver in hand. It lets you trash a Currency card.',
                'You trash the Silver (cost 3). You gain **1 Influence** and choose a Currency costing up to 6 to gain.',
                'You pick a **Gold**. It goes on top of your deck, so you’ll draw it next.',
              ],
            },
            {
              example: 'Trashing to thin your deck',
              steps: [
                'You play **Royal Confessor** with a Bronze and a Homestead in hand, and trash both.',
                'One Renown card was trashed, so you gain **1 Influence**. Your Renown falls by 1, because the Homestead no longer counts.',
                'Your deck is 2 cards smaller, so your better cards come round sooner.',
              ],
            },
            {
              example: 'Spending Influence',
              steps: [
                'In the Market you have 3 Coins and 3 Influence. You want a Noble Estate, which costs 5.',
                'Press **Convert Influence** twice. You now have **5 Coins** and **1 Influence**, and the button shows 2/2.',
                'Buy the Noble Estate. You can’t convert again this turn.',
              ],
            },
            {
              example: 'Completing a one-stage Crown Project',
              steps: [
                'River Quay has 1 stage in this game: 3 Coins and 2 Influence, for 4 Renown and a reward of 1 Influence.',
                'With 3 Coins, 1 Buy and 2 Influence, tap the highlighted River Quay.',
                'You pay, and your Influence falls to 0 and then rises to 1 from the reward. You have 0 Coins and 0 Buys. Your Renown rises by 4, and the Project is complete.',
              ],
            },
            {
              example: 'Sharing a three-stage Crown Project',
              steps: [
                'City Walls has 3 stages in this game. Its printed 8 Coins, plus 1 for being multi-stage, makes 9: Foundations 3 Coins + 1 Influence for 4 Renown, Masonry 3 + 2 for 4, Fortification 3 + 2 for 5.',
                'You pay for Foundations and take 4 Renown. Your opponent pays for Masonry on their turn and takes 4.',
                'On your next turn you pay for Fortification and take 5, and the reward of 2 Influence. Now it’s complete.',
                'You hold 9 of its Renown and your opponent 4, which is the printed 13 between you.',
              ],
            },
            {
              example: 'Finishing the round',
              steps: [
                'Four players sit in the order Ana, Ben, Cy, Dee, and Ana went first. On his turn, Ben buys the last Grand Duchy. The ending is triggered, and he finishes his turn normally.',
                'Ana has had as many turns as Ben, so she doesn’t play again. Cy and Dee each take one more ordinary turn. Nobody can buy a Grand Duchy, but anything else in the supply is fair game.',
                'After Dee’s turn everyone has had the same number of turns. Renown is counted, and if Dee has caught up to the leader, they share the win.',
              ],
            },
            {
              example: 'An attack and a defence',
              steps: [
                'You play **Tax Arrears** against two opponents. You get +1 Coin and +1 Buy.',
                'The first holds **Royal Advocate** and reveals it. It goes to the bottom of their deck, and they’re unaffected.',
                'The second has no Reaction, and chooses to discard a Currency card or gain a Royal Debt. If they hold no Currency, they gain the Debt.',
              ],
            },
            {
              example: 'Final scoring',
              steps: [
                'You end with 3 Homesteads (3), 2 Noble Estates (6) and a Grand Duchy (6): **15** from Estates.',
                'You own a Noble Council, worth 1 per Homestead: **3** conditional.',
                'You funded River Quay: **4** from Crown Projects. You still hold a Royal Debt: **−1**.',
                'Your total is **21**. A Homestead you had trashed earlier wouldn’t have counted, and would have lowered Noble Council too.',
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
                'Buying Renown too early. Renown cards do nothing in your hand, and they slow your deck.',
                'Forgetting to convert Influence before buying a card you can nearly afford.',
                'Letting Influence sit at 8. Anything more is lost.',
                'Assuming a gained card is in your hand. It’s in your discard pile unless the card says otherwise.',
                'Ignoring the Crown Project count. The last stage of the fifth Project triggers the end, whoever is ahead.',
          'Funding a Project’s last stage without checking the score. The other players still get their last turns.',
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'rules',
      title: 'Detailed rules',
      sections: [
        {
          id: 'r-types',
          title: 'Card types',
          body: [
            {
              ul: [
                '**Action:** played in the Royal Court phase, using 1 Action.',
                '**Establishment:** an Action that stays in play and works again next turn.',
                '**Currency:** played in the Market phase, without using an Action.',
                '**Renown:** does nothing when held. Scores at the end.',
                '**Attack:** an Action that also affects opponents.',
                '**Reaction:** an Action that can also be revealed from hand when you’re attacked.',
                '**Burden:** Royal Debt. Negative Renown. It can be played as an Action, but it can’t be bought.',
                'Some cards have two types, and count as both. A civic card, for instance, is an Action that’s also worth Renown.',
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
                'A card’s text happens top to bottom, and fully resolves before anything else happens.',
                'The reaction window opens when an Attack is played, before its effects. Your reaction can be revealed once per attack.',
                'An Attack’s effects resolve one opponent at a time, in turn order from the next player.',
                'Currency can be played after a purchase. A purchase doesn’t close off Currency.',
                'Influence converts any time in the Market phase, as long as no decision is waiting.',
                'The end of the game is checked once your turn has fully finished, including Cleanup.',
              ],
            },
          ],
        },
        {
          id: 'r-choice',
          title: 'Optional and mandatory',
          body: [
            {
              ul: [
                '**“You may”** is optional. A prompt lets you decline. **“Trash a card”** without “may” is mandatory if you can.',
                'If an effect has no legal target, it doesn’t ask, and does nothing. A mandatory trash with an empty hand simply passes.',
                '**“Up to”** allows zero.',
                'An exchange needs its first part. No card trashed means no card gained.',
                'If a gain’s pile is empty, nothing is gained, and the card carries on.',
                'If a draw finds your deck and discard pile both empty, you draw what’s there and no more.',
              ],
            },
          ],
        },
        {
          id: 'r-owned',
          title: 'What counts as owned',
          body: ['Your deck, hand, discard pile, cards in play and cards set aside on a mat all belong to you, and all score. Trash pile cards belong to no one. Supply cards belong to no one until gained.'],
        },
        {
          id: 'r-privacy',
          title: 'What stays hidden',
          body: [
            {
              ul: [
                'Hidden: other players’ hands, any deck’s order, and other players’ exact Renown until the game ends.',
                'Public: every discard pile’s top card, cards in play, the trash pile, hand and deck sizes, Influence totals, and who completed which Project.',
                'A card revealed by an effect, such as Edict of Inspection, is public while it’s revealed.',
              ],
            },
          ],
        },
        {
          id: 'r-disconnect',
          title: 'If a player disconnects',
          body: [
            'A player who loses their connection keeps their seat, cards, Influence, Crown Projects and score, and has **60 seconds** to return. Everyone sees them marked Away, and if it’s their decision the game waits.',
            'If they aren’t back in time, a **bot plays their seat**, marked Bot playing. It follows the same rules as everyone, sees only what that player could see, and answers any question already waiting. Nothing about the seat is reset.',
            'When they return, the seat is theirs again straight away, from whatever point the game has reached. Moves the bot already made stay made.',
            'If nobody is left in person, the table closes. That includes a game played alone with bots: if you don’t return within 60 seconds, the game is deleted. A silent network failure can take up to about 40 seconds longer to notice than a closed tab.',
            'A player who chooses to quit hands their seat to a bot for good and can’t return. If nobody else is left in person, quitting ends the game.',
            {
              example: 'Losing the connection and coming back',
              steps: [
                'It’s your turn at a table of three when your connection drops. The others see you marked Away, and the game waits.',
                'After 60 seconds a bot takes your seat, marked Bot playing, and makes your move using only what you could see.',
                'You reconnect. The seat is yours again at once and the bot stops. Its move stands, and your cards, Influence and Renown are whatever that play left them.',
              ],
            },
          ],
        },
        {
          id: 'r-debt',
          title: 'Royal Debt clarifications',
          body: [
            {
              ul: [
                'Playing it costs an Action, and you may then spend 1 Influence to trash it. You may decline.',
                'With no Influence you can’t pay. Use another card that trashes, or keep it until you can.',
                'Trashing cards can remove it, unless the card names a type it doesn’t have.',
                'Its pile running out doesn’t count toward the empty market piles that end the game.',
              ],
            },
          ],
        },
        {
          id: 'r-variants',
          title: 'Sets, variants and older rooms',
          body: [
            {
              ul: [
                'Sets: Core Set and Crown Decrees are on by default. Artisans’ Row, Rival Houses and The Chancery are optional.',
                'A market code shares a game’s market and Projects with another host.',
                '**Older rooms:** a game keeps the rules it started with, to the end. When a table began under earlier rules, its own guide says so at the top and shows those rules here instead.',
              ],
            },
          ],
        },
        {
          id: 'r-staged',
          title: 'Crown Projects in detail',
          body: [
            '**How a stage works**',
            {
              ul: [
                'Each stage has its own price in Coins and Influence, and its own Renown. Each tile shows the next stage. The eye button on a tile lists them all.',
                'In the Market phase, for 1 Buy, you may pay the next unfunded stage of any Project and keep that stage’s Renown. Stages are funded in order, by anyone. Different players can fund different stages.',
                'You can fund only one stage of a Project per turn, but stages of different Projects if you have the Buys and the price.',
                'Renown from a stage counts at the end **even if the Project is never finished**.',
                'A Project is complete when its last stage is funded. Its reward happens once, for whoever funds that stage. A one-stage Project is complete as soon as it’s funded.',
                'Who funded what is public. Your Renown total stays private.',
              ],
            },
            '**Stage counts and prices**',
            {
              ul: [
                'Every game has 5 Projects: 1 of one stage, 2 of two and 2 of three, 11 stages in all, at every player count. Which Project gets which count is dealt at random when the game starts. Price and Renown play no part in it.',
                'A Project with 2 or 3 stages costs 1 Coin more in total than its printed price. A one-stage Project costs its printed price.',
                'The total is divided evenly. Spare Coins go on the earliest stages. Spare Influence and Renown go on the latest. Influence and Renown totals are as printed.',
                'No card or market cost changes with the number of stages.',
              ],
            },
            '**Card wording**',
            {
              ul: [
                '**“Projects you completed”** on Builder’s Honour and Civic Charter counts finished Projects you funded at least one stage of. Several players can count the same one.',
                '**“When you complete”** on Royal Dedication, Bellman and Cloister Garden means funding the last stage, not every stage.',
                'Surveyor’s discount and Borough Reeve’s surcharge apply to whichever stage is next.',
              ],
            },
            {
              example: 'Renown goes to whoever funded each stage',
              steps: [
                'Three players each fund one stage of City Walls: 4, 4 and 5 Renown.',
                'Before the last stage is paid, the first two already hold their 4 each, and would keep it if the game ended there.',
                'Only the third player gets the 2 Influence reward. All three count it as a Project they completed.',
              ],
            },
            {
              example: 'Two-stage prices',
              steps: [
                'River Quay prints 3 Coins, 2 Influence and 4 Renown. In 2 stages its 4 Coins divide as 2 and 2, its Influence as 1 and 1, its Renown as 2 and 2.',
                'Piling costs 2 Coins and 1 Influence for 2 Renown. Harbour Cranes costs the same, gives 2 Renown, and brings the reward of 1 Influence.',
              ],
            },
            {
              example: 'All five complete',
              steps: [
                'Four Projects are complete and the game carries on.',
                'A player funds the last stage of the fifth Project. The ending is triggered. They finish their turn, and the round finishes as under Ending the game.',
              ],
            },
          ],
        },
        {
          id: 'r-final',
          title: 'Finishing the round',
          body: [
            {
              ul: [
                'The check happens after each turn. Anything that empties a pile or funds a stage during a turn only counts when that turn ends.',
                'Once triggered, the ending stays triggered, whatever happens to the piles after that.',
                'Each seat that has had fewer turns than the player with the most takes turns in the usual order until the counts match, then the game ends.',
                'Attacks, Reactions, Influence and Projects all work as usual in those turns. A Project can still be funded, and its Renown still counts.',
                'If a player has left the table, the usual bot takeover plays their turns.',
              ],
            },
          ],
        },
        {
          id: 'r-odd',
          title: 'Often misunderstood',
          body: [
            {
              ul: [
                'Influence given to a player at the cap is lost.',
                'Converting and buying aren’t limited to one order. You may buy, convert and then buy again, if you still have a Buy.',
                'A Crown Project isn’t a card. It doesn’t enter your deck.',
                'Currency in your hand is worth nothing until it’s played.',
                'Cards you trash go to the shared trash pile. There’s no way to take them back unless a card says so.',
              ],
            },
          ],
        },
      ],
    },
  ],
};

/** The sections a trial changes, so a trial room's guide states that room's rule rather than the live one. */
/** The ending and Project rule of a table that began before edition 4. */
const WHOLE_PROJECTS: Record<string, GuideBlock[]> = {
  'q-score': ['Homestead 1, Noble Estate 3, Grand Duchy 6, plus scoring cards and completed Crown Projects. Royal Debt is −1. Your total is private until the end.'],
  'f-projects': [
    'Five Crown Projects are on the table. Each can be completed once, by the first player to pay its price in Coins and Influence, during the Market phase. That uses 1 Buy. It gives you Renown right away, along with a one-off reward printed on it.',
    'Rewards and who built what are public. When **4** are complete, the game ends at the end of that turn, so finishing one is also a clock on everyone else.',
  ],
  'r-staged': ['This table’s Crown Projects have no stages. See Crown Projects in How to play.'],
};

function endingSections(toEnd: string, staged: boolean): Record<string, GuideBlock[]> {
  return {
    'q-end': ['The game ends at the end of the turn in which any of these is true:', { ul: ['The Grand Duchy pile is empty.', `${toEnd} Crown Projects are complete.`, '**3** market piles are empty (**4** with 5 or 6 players).'] }],
    'f-end': [
      `The game checks for the end after each player’s turn: the Grand Duchy pile empty, ${toEnd.replaceAll('*', '').toLowerCase()} Crown Projects complete, or 3 market piles empty (4 with 5 or 6 players). The current turn always finishes${staged ? '. A part-built Project doesn’t count' : ''}. The permanent piles other than Grand Duchy don’t count as empty market piles.`,
      'Most Renown wins. If totals are equal, the player who took fewer turns ranks higher. If that’s also equal, they share the place.',
    ],
    'r-final': ['This table doesn’t finish the round: the game ends at the end of the turn that meets an end condition, so later seats can have one turn fewer.'],
    'f-mistakes': [
      {
        ul: [
          'Buying Renown too early. Renown cards do nothing in your hand, and they slow your deck.',
          'Forgetting to convert Influence before buying a card you can nearly afford.',
          'Letting Influence sit at 8. Anything more is lost.',
          'Assuming a gained card is in your hand. It’s in your discard pile unless the card says otherwise.',
          `Ignoring the Crown Project count. Reaching ${toEnd.replaceAll('*', '').toLowerCase()} ends the game, whoever is ahead.`,
        ],
      },
    ],
  };
}

/** A copy of the guide with sections replaced, and examples of rules this table doesn't use taken out. */
function edit(note: string, changed: Record<string, GuideBlock[]>, dropExamples: string[]): GuideDoc {
  return {
    ...guide,
    note,
    levels: guide.levels.map((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        changed[s.id]
          ? { ...s, body: changed[s.id] }
          : s.id === 'f-examples'
            ? { ...s, body: s.body.filter((b) => !(typeof b === 'object' && 'example' in b && dropExamples.includes(b.example))) }
            : s,
      ),
    })),
  };
}

const NEW_EXAMPLES = ['Finishing the round', 'Sharing a three-stage Crown Project', 'Completing a one-stage Crown Project'];
const LIVE_VERSION = 4;

/** The guide for a room: the current rules, or those its table started on (CC-F2-5). */
export function guideFor(edition?: string | null, version?: number): GuideDoc {
  const trial = EDITIONS.find((r) => r.edition!.code === edition);
  if (trial) {
    const staged = !!trial.staged;
    return edit(
      `This table is playing trial rules. ${trial.edition!.name}: ${trial.edition!.text} It ends without finishing the round.`,
      { ...endingSections('**All 5**', staged), ...(staged ? {} : WHOLE_PROJECTS), 'f-projects': staged ? guide.levels[1].sections.find((s) => s.id === 'f-projects')!.body : ['Five Crown Projects are on the table. Each can be completed once, by the first player to pay its price in Coins and Influence, during the Market phase. That uses 1 Buy. It gives you Renown right away, along with a one-off reward printed on it.', 'Rewards and who built what are public. When **all 5** are complete, the game ends at the end of that turn.'] },
      ['Finishing the round', ...(staged ? [] : NEW_EXAMPLES)],
    );
  }
  if (version !== undefined && version < LIVE_VERSION) {
    return edit(
      'This table began under an earlier edition and keeps its original rules to the end: Crown Projects are claimed whole, the fourth ends the game, and the round doesn’t finish.' + (version < 3 ? ' It has no Crown Decree cards, and its Royal Debt pile holds 10 per opponent.' : ''),
      { ...endingSections('**4**', false), ...WHOLE_PROJECTS },
      NEW_EXAMPLES,
    );
  }
  return guide;
}
