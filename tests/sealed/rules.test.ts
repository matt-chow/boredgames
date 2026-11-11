/** Sealed Correspondence rules (SC-*), as defined in docs/SEALED.md. */
import { describe, expect, it } from 'vitest';
import { sealed } from '../../src/games/sealed';
import { deckKinds, KINDS, ORDER } from '../../src/games/sealed/rules/cards';
import { setup } from '../../src/games/sealed/rules/engine';
import { Table } from './helpers';

const cfg = (ruleset: 'classic' | 'expanded' = 'classic', target = 0) => ({ ruleset, target, timer: 0 });
const count = (list: string[]) => list.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {});

describe('SC-DECK', () => {
  it('SC-DECK1: Classic is exactly 16 cards', () => {
    expect(deckKinds('classic')).toHaveLength(16);
    expect(count(deckKinds('classic'))).toEqual({ heir: 1, dowager: 1, ambassador: 1, magistrate: 2, confessor: 2, duelist: 2, scribe: 2, censor: 5 });
  });

  it('SC-DECK2: Expanded is exactly 21 cards', () => {
    expect(deckKinds('expanded')).toHaveLength(21);
    expect(count(deckKinds('expanded'))).toEqual({ heir: 1, dowager: 1, ambassador: 1, archivist: 2, magistrate: 2, confessor: 2, duelist: 2, scribe: 2, censor: 6, informant: 2 });
  });

  it('SC-DECK3: values run 9 to 0, one character per value', () => {
    expect(ORDER.map((k) => KINDS[k].value)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  });
});

describe('SC-SET', () => {
  for (const [ruleset, n] of [['classic', 2], ['classic', 3], ['classic', 4], ['expanded', 2], ['expanded', 3], ['expanded', 4], ['expanded', 5], ['expanded', 6]] as const) {
    it(`SC-SET1–4: ${ruleset}, ${n} players: one reserve, ${n === 2 ? 'three face up, ' : ''}one card each and a draw for the opener`, () => {
      const s = setup(n, `set-${ruleset}-${n}`, cfg(ruleset));
      expect(s.reserve).not.toBeNull();
      expect(s.faceUp).toHaveLength(n === 2 ? 3 : 0);
      s.seats.forEach((x, i) => expect(x.hand).toHaveLength(i === s.current ? 2 : 1));
      const all = [s.reserve!, ...s.faceUp, ...s.deck, ...s.seats.flatMap((x) => x.hand)];
      expect(all).toHaveLength(deckKinds(ruleset).length);
      expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
      expect(count(all.map((c) => c.kind))).toEqual(count(deckKinds(ruleset)));
    });
  }

  it('SC-SET6: five or six players need Expanded; the ruleset is never switched for the host', () => {
    expect(sealed.validateConfig(cfg('classic'), 4)).toBeNull();
    expect(sealed.validateConfig(cfg('classic'), 5)).toMatch(/switch to the Expanded/);
    expect(sealed.validateConfig(cfg('expanded'), 6)).toBeNull();
    expect(sealed.validateConfig(cfg('expanded'), 1)).not.toBeNull();
  });

  it('SC-SET7: settings are cleaned at the trust boundary', () => {
    expect(sealed.sanitizeConfig!({ ruleset: 'expanded', target: 9, timer: 30 })).toEqual({ config: { ruleset: 'expanded', target: 9, timer: 30 } });
    for (const bad of [{ ruleset: 'house' }, { target: 16 }, { target: -1 }, { target: 2.5 }, { target: '3' }, { timer: 20 }])
      expect(sealed.sanitizeConfig!(bad)).toHaveProperty('error');
  });

  it('SC-TURN1: the first opener is drawn by lot from the seed', () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, i) => setup(4, `lot-${i}`, cfg()).current));
    expect(firsts.size).toBe(4);
    expect(setup(4, 'same', cfg()).current).toBe(setup(4, 'same', cfg()).current);
  });
});

describe('SC-WIN targets', () => {
  it('SC-WIN1: recommended targets by player count, or the host’s 1–15', () => {
    expect([2, 3, 4, 5, 6].map((n) => setup(n, 'w', cfg('expanded')).target)).toEqual([6, 5, 4, 3, 3]);
    expect(setup(3, 'w', cfg('classic', 1)).target).toBe(1);
    expect(setup(3, 'w', cfg('classic', 15)).target).toBe(15);
  });
});

describe('SC-TURN and targeting', () => {
  it('SC-TURN2: only the current player acts, with the turn they saw', () => {
    const t = new Table({ hands: ['censor', 'scribe', 'duelist'], deck: ['confessor', 'censor', 'censor'] });
    expect(t.code(1, { type: 'play', card: t.s.seats[1].hand[0].id })).toBe('not-your-turn');
    expect(t.code(0, { type: 'play', card: t.id(0, 'confessor'), turn: t.s.turn + 1 })).toBe('stale');
    expect(t.code(0, { type: 'play', card: 999 })).toBe('bad-card');
    t.play('confessor');
    expect(t.s.current).toBe(1);
    expect(t.s.seats[1].hand).toHaveLength(2);
  });

  it('SC-TGT1: a player under the Confessor cannot be chosen by others', () => {
    const t = new Table({ hands: ['censor', 'scribe', 'duelist'], deck: ['confessor', 'censor', 'censor', 'censor'] });
    t.play('confessor');
    expect(t.s.seats[0].guarded).toBe(true);
    expect(t.code(1, { type: 'play', card: t.id(1, 'scribe'), target: 0 })).toBe('bad-target');
    t.play('scribe', 2);
    expect(t.s.seats[1].secrets).toEqual([{ t: 'read', seat: 2, kind: 'duelist' }]);
  });

  it('SC-TGT2: a player who is out cannot be chosen', () => {
    const t = new Table({ hands: ['censor', 'scribe', 'duelist'], deck: ['censor', 'censor', 'censor', 'censor'] });
    t.play('censor', 1, 'scribe');
    expect(t.s.seats[1].out).toBe(true);
    expect(t.code(2, { type: 'play', card: t.id(2, 'censor'), target: 1, guess: 'heir' })).toBe('bad-target');
  });

  it('SC-CON2: protection lasts until its owner’s next turn begins', () => {
    const t = new Table({ n: 2, hands: ['censor', 'scribe'], deck: ['confessor', 'censor', 'censor', 'censor'] });
    t.play('confessor');
    t.play('censor');
    expect(t.s.log.at(-1)).toMatchObject({ t: 'play', kind: 'censor', idle: true });
    expect(t.s.seats[0].guarded).toBe(false);
  });

  it('SC-TGT3: with every opponent protected, a choosing card is played for no effect, without a target', () => {
    const t = new Table({ n: 2, hands: ['duelist', 'heir'], deck: ['confessor', 'ambassador', 'censor'] });
    t.play('confessor');
    expect(t.code(1, { type: 'play', card: t.id(1, 'ambassador'), target: 0 })).toBe('bad-target');
    t.play('ambassador');
    expect(t.kinds(1)).toEqual(['heir']);
    expect(t.kinds(0)).toEqual(['duelist', 'censor']);
    expect(t.s.log.at(-1)).toMatchObject({ kind: 'ambassador', idle: true });
  });
});

describe('SC cards', () => {
  it('SC-HEIR1: playing the Heir puts you out, and shows your other card', () => {
    const t = new Table({ hands: ['heir', 'scribe', 'duelist'], deck: ['censor', 'censor', 'censor'] });
    t.play('heir');
    expect(t.s.seats[0].out).toBe(true);
    expect(t.s.seats[0].pile.map((p) => [p.card.kind, p.how])).toEqual([['heir', 'played'], ['censor', 'discarded']]);
  });

  it('SC-HEIR1: an Heir discarded to the Magistrate puts its holder out', () => {
    const t = new Table({ hands: ['censor', 'heir', 'duelist'], deck: ['magistrate', 'censor', 'censor'] });
    t.play('magistrate', 1);
    expect(t.s.seats[1].out).toBe(true);
    expect(t.s.seats[1].hand).toEqual([]);
  });

  it('SC-DOW1: the Dowager must be played beside the Ambassador or the Magistrate', () => {
    for (const other of ['ambassador', 'magistrate'] as const) {
      const t = new Table({ hands: ['dowager', 'scribe', 'duelist'], deck: [other, 'censor', 'censor'] });
      expect(t.code(0, { type: 'play', card: t.id(0, other), target: 1 })).toBe('dowager');
      t.play('dowager');
      expect(t.kinds(0)).toEqual([other]);
    }
  });

  it('SC-DOW2: the Dowager may be played by choice, and the log never says whether it was forced', () => {
    const free = new Table({ hands: ['dowager', 'scribe', 'duelist'], deck: ['censor', 'censor', 'censor'] });
    free.play('dowager');
    const forced = new Table({ hands: ['dowager', 'scribe', 'duelist'], deck: ['magistrate', 'censor', 'censor'] });
    forced.play('dowager');
    const strip = (x: object) => JSON.stringify(x).replace(/"id":\d+/g, '');
    expect(strip(free.s.log.at(-1)!)).toBe(strip(forced.s.log.at(-1)!));
  });

  it('SC-AMB1: the Ambassador trades hands, and both players learn their new card', () => {
    const t = new Table({ hands: ['censor', 'heir', 'duelist'], deck: ['ambassador', 'censor', 'censor'] });
    t.play('ambassador', 1);
    expect(t.kinds(0)).toEqual(['heir']);
    expect(t.kinds(1)[0]).toBe('censor'); // then it drew for its own turn
    expect(t.s.seats[0].secrets).toEqual([{ t: 'trade', seat: 1, gave: 'censor', got: 'heir' }]);
    expect(t.s.seats[1].secrets).toEqual([{ t: 'trade', seat: 0, gave: 'heir', got: 'censor' }]);
    expect(t.s.seats[2].secrets).toEqual([]);
  });

  it('SC-ARC1–2: the Archivist draws two, keeps one, files the rest under the deck in the chosen order', () => {
    const t = new Table({ ruleset: 'expanded', hands: ['censor', 'scribe', 'duelist'], deck: ['archivist', 'heir', 'magistrate', 'confessor'] });
    t.play('archivist');
    expect(t.s.phase).toBe('file');
    expect(t.kinds(0).sort()).toEqual(['censor', 'heir', 'magistrate']);
    const [keep, a, b] = [t.id(0, 'heir'), t.id(0, 'magistrate'), t.id(0, 'censor')];
    expect(t.code(0, { type: 'file', keep, under: [a] })).toBe('bad-file');
    expect(t.code(0, { type: 'file', keep, under: [a, a] })).toBe('bad-file');
    expect(t.code(0, { type: 'file', keep, under: [a, keep] })).toBe('bad-file');
    expect(t.code(0, { type: 'play', card: keep })).toBe('wrong-phase');
    t.do(0, { type: 'file', keep, under: [a, b] });
    expect(t.kinds(0)).toEqual(['heir']);
    // seat 1 drew the confessor; the filed cards are now the whole deck, top to bottom as chosen.
    expect(t.s.deck.map((c) => c.kind)).toEqual(['magistrate', 'censor']);
    expect(t.s.log.at(-1)).toMatchObject({ t: 'file', seat: 0, n: 2 });
  });

  it('SC-ARC3: with one card left the Archivist draws one; with none it does nothing', () => {
    const one = new Table({ ruleset: 'expanded', hands: ['censor', 'scribe', 'duelist'], deck: ['archivist', 'heir'] });
    one.play('archivist');
    expect(one.kinds(0)).toHaveLength(2);
    one.do(0, { type: 'file', keep: one.id(0, 'heir'), under: [one.id(0, 'censor')] });
    expect(one.s.phase).toBe('play');
    expect(one.s.deck).toHaveLength(0);
    expect(one.s.current).toBe(1);
    const none = new Table({ ruleset: 'expanded', hands: ['censor', 'scribe', 'duelist'], deck: ['archivist'] });
    none.play('archivist');
    expect(none.s.phase).not.toBe('file');
    expect(none.s.rounds).toHaveLength(1);
  });

  it('SC-ARC4: the Dowager rule does not bind the Archivist’s keep', () => {
    const t = new Table({ ruleset: 'expanded', hands: ['dowager', 'scribe', 'duelist'], deck: ['archivist', 'magistrate', 'censor', 'censor'] });
    t.play('archivist');
    t.do(0, { type: 'file', keep: t.id(0, 'magistrate'), under: [t.id(0, 'dowager'), t.id(0, 'censor')] });
    expect(t.kinds(0)).toEqual(['magistrate']);
  });

  it('SC-MAG1–2: the Magistrate may choose its owner, even under the Confessor', () => {
    const t = new Table({ n: 2, hands: ['duelist', 'scribe'], deck: ['confessor', 'censor', 'magistrate', 'heir', 'censor'] });
    t.play('confessor'); // seat 0 guarded; seat 1 drew censor
    t.play('censor'); // nobody to choose
    t.play('magistrate', 0); // seat 0 drew magistrate (still guarded? no: guard ends at turn start)
    expect(t.s.seats[0].pile.at(-1)).toMatchObject({ card: { kind: 'duelist' }, how: 'discarded' });
    expect(t.kinds(0)).toEqual(['heir']);
  });

  it('SC-MAG2: with every opponent protected, the Magistrate must choose its owner', () => {
    const t = new Table({ n: 2, hands: ['duelist', 'scribe'], deck: ['confessor', 'magistrate', 'censor', 'censor'] });
    t.play('confessor');
    expect(t.code(1, { type: 'play', card: t.id(1, 'magistrate'), target: 0 })).toBe('bad-target');
    expect(t.code(1, { type: 'play', card: t.id(1, 'magistrate') })).toBe('bad-target');
    t.play('magistrate', 1);
    expect(t.kinds(1)).toEqual(['censor']);
  });

  it('SC-MAG3: with the deck empty the replacement is the reserve card', () => {
    const t = new Table({ hands: ['censor', 'scribe', 'duelist'], deck: ['magistrate'], reserve: 'heir' });
    t.play('magistrate', 1);
    expect(t.kinds(1)).toEqual(['heir']);
    expect(t.s.reserve).toBeNull();
    expect(t.s.rounds.at(-1)).toMatchObject({ end: 'showdown', winners: [1], reserve: null });
  });

  it('SC-MAG4: a discarded card has no effect of its own', () => {
    const t = new Table({ hands: ['confessor', 'scribe', 'duelist'], deck: ['magistrate', 'censor', 'censor'] });
    t.play('magistrate', 0);
    expect(t.s.seats[0].guarded).toBe(false);
    expect(t.kinds(0)).toEqual(['censor']);
  });

  it('SC-DUE1: the lower card is out; only the two players see both cards', () => {
    const t = new Table({ hands: ['heir', 'scribe', 'duelist'], deck: ['duelist', 'censor', 'censor'] });
    t.play('duelist', 1);
    expect(t.s.seats[1].out).toBe(true);
    expect(t.s.seats[0].secrets).toEqual([{ t: 'duel', seat: 1, mine: 'heir', theirs: 'scribe' }]);
    expect(t.s.seats[1].secrets).toEqual([{ t: 'duel', seat: 0, mine: 'scribe', theirs: 'heir' }]);
    expect(t.s.log.find((l) => l.t === 'duel')).toMatchObject({ seat: 0, on: 1, loser: 1 });
    expect(JSON.stringify(t.s.log)).not.toContain('"heir"');
  });

  it('SC-DUE2: the challenger can lose; a tie puts no one out and shows nothing', () => {
    const lose = new Table({ hands: ['censor', 'heir', 'duelist'], deck: ['duelist', 'censor', 'censor'] });
    lose.play('duelist', 1);
    expect(lose.s.seats[0].out).toBe(true);
    const tie = new Table({ hands: ['scribe', 'scribe', 'duelist'], deck: ['duelist', 'censor', 'censor'] });
    tie.play('duelist', 1);
    expect(tie.s.seats.map((x) => x.out)).toEqual([false, false, false]);
    expect(tie.s.log.find((l) => l.t === 'duel')).toMatchObject({ loser: null });
    expect(tie.s.log.some((l) => l.t === 'discard')).toBe(false);
  });

  it('SC-SCR1: the Scribe shows a card to its player only', () => {
    const t = new Table({ hands: ['censor', 'heir', 'duelist'], deck: ['scribe', 'censor', 'censor'] });
    t.play('scribe', 1);
    expect(t.s.seats[0].secrets).toEqual([{ t: 'read', seat: 1, kind: 'heir' }]);
    expect(t.s.seats[1].secrets).toEqual([]);
    expect(JSON.stringify(t.s.log)).not.toContain('heir');
  });

  it('SC-CEN1: a right guess puts the target out; a wrong one does nothing; the Censor cannot be named', () => {
    const t = new Table({ hands: ['censor', 'heir', 'duelist'], deck: ['censor', 'censor', 'censor', 'censor'] });
    expect(t.code(0, { type: 'play', card: t.id(0, 'censor'), target: 1, guess: 'censor' })).toBe('bad-guess');
    expect(t.code(0, { type: 'play', card: t.id(0, 'censor'), target: 1 })).toBe('bad-guess');
    t.play('censor', 2, 'heir');
    expect(t.s.seats[2].out).toBe(false);
    expect(t.s.log.at(-1)).toMatchObject({ kind: 'censor', on: 2, guess: 'heir', hit: false });
    t.play('censor', 2, 'duelist');
    expect(t.s.seats[2].out).toBe(true);
  });

  it('SC-CEN2: the Informant can be named', () => {
    const t = new Table({ ruleset: 'expanded', hands: ['censor', 'informant', 'duelist'], deck: ['censor', 'censor', 'censor'] });
    t.play('censor', 1, 'informant');
    expect(t.s.seats[1].out).toBe(true);
  });
});

describe('SC-END rounds and scoring', () => {
  it('SC-END1: a sole survivor wins the round without a showdown', () => {
    const t = new Table({ n: 2, hands: ['censor', 'heir'], deck: ['censor', 'censor', 'censor'] });
    t.play('censor', 1, 'heir');
    expect(t.s.rounds[0]).toMatchObject({ end: 'last', winners: [0], shown: [null, null] });
    expect(t.s.seats[0].favors).toBe(1);
    expect(t.s.phase).toBe('between');
    expect(t.s.next).toBe(0);
  });

  it('SC-END2: at a showdown every player tied for the highest card wins a favor', () => {
    const u = new Table({ hands: ['magistrate', 'magistrate', 'censor'], deck: ['confessor'] });
    u.play('confessor');
    expect(u.s.rounds[0]).toMatchObject({ end: 'showdown', shown: ['magistrate', 'magistrate', 'censor'], winners: [0, 1] });
    expect(u.s.seats.map((x) => x.favors)).toEqual([1, 1, 0]);
    expect([0, 1]).toContain(u.s.next);
  });

  it('SC-TURN3: the round winner deals and opens the next round; nobody else can', () => {
    const t = new Table({ n: 2, hands: ['censor', 'heir'], deck: ['censor', 'censor', 'censor'] });
    t.play('censor', 1, 'heir');
    expect(t.code(1, { type: 'deal' })).toBe('not-your-turn');
    t.do(0, { type: 'deal' });
    expect(t.s.round).toBe(2);
    expect(t.s.current).toBe(0);
    expect(t.s.seats.every((x) => !x.out && !x.guarded && !x.secrets.length)).toBe(true);
    expect(t.s.seats[0].favors).toBe(1);
  });

  it('SC-INF1: the only surviving Informant player gains a favor, alongside any round win', () => {
    const t = new Table({ ruleset: 'expanded', hands: ['censor', 'scribe', 'heir'], deck: ['informant', 'censor'] });
    t.play('informant');
    t.play('censor', 2, 'scribe'); // a miss; the deck is now empty
    expect(t.s.rounds[0]).toMatchObject({ winners: [2], informant: 0 });
    expect(t.s.seats.map((x) => x.favors)).toEqual([1, 0, 1]);
  });

  it('SC-INF2: two surviving Informant players gain nothing; an Informant who went out does not count', () => {
    const both = new Table({ ruleset: 'expanded', hands: ['censor', 'censor', 'heir'], deck: ['informant', 'informant', 'censor'] });
    both.play('informant').play('informant').play('censor', 0, 'heir');
    expect(both.s.rounds[0].informant).toBeNull();
    const out = new Table({ ruleset: 'expanded', hands: ['scribe', 'censor', 'heir'], deck: ['informant', 'informant', 'censor', 'confessor'] });
    out.play('informant').play('informant').play('censor', 0, 'scribe');
    expect(out.s.seats[0].out).toBe(true);
    out.play('confessor');
    expect(out.s.rounds[0].informant).toBe(1);
  });

  it('SC-INF3: an Informant discarded to the Magistrate counts', () => {
    const t = new Table({ ruleset: 'expanded', hands: ['censor', 'informant', 'heir'], deck: ['magistrate', 'censor'] });
    t.play('magistrate', 1); // seat 1 discards the informant and draws the last card
    expect(t.s.rounds[0].informant).toBe(1);
  });

  it('SC-WIN2: reaching the target ends the game; players reaching it together win jointly', () => {
    const t = new Table({ target: 1, hands: ['magistrate', 'magistrate', 'censor'], deck: ['confessor'] });
    t.play('confessor');
    expect(t.s.phase).toBe('over');
    const r = sealed.results(t.s)!;
    expect(r.filter((x) => x.winner).map((x) => x.seat)).toEqual([0, 1]);
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3]);
    expect(t.code(0, { type: 'deal' })).toBe('over');
    expect(sealed.actors(t.s)).toEqual([]);
  });

  it('SC-WIN2: below the target the game goes on', () => {
    const t = new Table({ target: 2, hands: ['magistrate', 'censor', 'censor'], deck: ['confessor'] });
    t.play('confessor');
    expect(t.s.phase).toBe('between');
    expect(sealed.results(t.s)).toBeNull();
  });
});

describe('SC-NET actions', () => {
  it('SC-NET2: malformed actions are refused, never thrown', () => {
    const t = new Table({ hands: ['censor', 'scribe', 'duelist'], deck: ['censor', 'censor'] });
    for (const bad of [null, 3, {}, { type: 'nope', turn: t.s.turn }, { type: 'play', turn: t.s.turn, card: 'x' }, { type: 'file', turn: t.s.turn, keep: 1, under: 'x' }])
      expect(sealed.apply(t.s, 0, bad as never).ok).toBe(false);
    expect(sealed.apply(t.s, 9, { type: 'deal', turn: t.s.turn }).ok).toBe(false);
  });

  it('SC-NET4: apply never mutates its input', () => {
    const t = new Table({ hands: ['censor', 'scribe', 'duelist'], deck: ['censor', 'censor'] });
    const before = JSON.stringify(t.s);
    sealed.apply(t.s, 0, { type: 'play', turn: t.s.turn, card: t.id(0, 'censor'), target: 1, guess: 'scribe' });
    expect(JSON.stringify(t.s)).toBe(before);
  });

  it('SC-NET5: nothing is undoable', () => {
    const t = new Table({ hands: ['censor', 'scribe', 'duelist'], deck: ['confessor', 'censor'] });
    expect(t.try(0, { type: 'play', card: t.id(0, 'confessor') })).toMatchObject({ ok: true, undoable: false });
  });

  it('SC-CHAT1: chat and reactions work in every phase and never touch the turn', () => {
    const t = new Table({ n: 2, hands: ['censor', 'heir'], deck: ['censor', 'censor'] });
    const turn = t.s.turn;
    t.do(1, { type: 'chat', text: '  hello  ' }).do(0, { type: 'react', key: 'bluff' });
    expect(t.s.chat.map((c) => c.text ?? c.react)).toEqual(['hello', 'bluff']);
    expect(t.s.turn).toBe(turn);
    expect(t.code(0, { type: 'react', key: 'boo' })).toBe('bad-react');
    expect(t.code(0, { type: 'chat', text: '   ' })).toBe('bad-chat');
  });
});
