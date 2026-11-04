/** Private Renown (KC3-RENOWN) and the edition a game is played under (KC3-VER). See docs/CLOCKWORK.md. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createDeckGame, type DeckState, type DeckView } from '../../src/engine/deckbuilder';
import { botMove, PROFILES } from '../../src/games/clockwork/rules/bot';
import { RULES, RULES_V2 } from '../../src/games/clockwork/rules/ruleset';
import { ALL_SETS, game, Table } from './helpers';

const v2 = createDeckGame(RULES_V2);
const newGame = (players = 2, seed = 'kc3') => game.setup({ playerCount: players, seed, config: { market: [], bans: [], sets: ALL_SETS, projects: [] } });

function playOut(start: DeckState, onStep: (s: DeckState) => void) {
  let s = start;
  for (let steps = 0; steps < 30_000 && !s.over; steps++) {
    const [seat] = game.actors(s);
    const move = botMove(game.project(s, seat) as DeckView, PROFILES[(seat * 3 + 1) % PROFILES.length], 0);
    let done = false;
    for (const a of move?.actions ?? []) {
      const r = game.apply(s, seat, a);
      if (!r.ok) continue;
      s = JSON.parse(JSON.stringify(r.state));
      done = true;
      break;
    }
    if (!done) throw new Error(`seat ${seat} has no legal move`);
    onStep(s);
  }
  return s;
}

describe('private Renown', () => {
  it('KC3-RENOWN-1: your own total counts every owned card in every zone, by source', () => {
    const t = new Table(['blueprint', 'rust', 'rust']);
    const score = t.view().score!;
    expect(score.estates).toBe(3 + 3); // 3 Homesteads from the starting deck, and the Noble Estate
    expect(score.negative).toBe(-2);
    expect(score.total).toBe(4);
    expect(score.estates + score.special + score.projects + score.negative + score.conditional).toBe(score.total);
  });

  it('KC3-RENOWN-2: a trashed card stops counting at once, and totals can go below zero', () => {
    const t = new Table(['royal_confessor', 'notebook', 'blueprint']);
    t.play('royal_confessor').cards('notebook', 'blueprint');
    expect(t.view().score!.estates).toBe(3);
    const low = new Table(['rust', 'rust', 'rust', 'rust', 'rust', 'rust']);
    for (const z of [low.s.players[low.me]]) z.deck = z.deck.filter((id) => low.s.cards[id] !== 'notebook');
    low.s.players[low.me].discard = low.s.players[low.me].discard.filter((id) => low.s.cards[id] !== 'notebook');
    expect(low.view().score!.total).toBe(-6);
  });

  it('KC3-RENOWN-3: conditional cards and completed projects land in their own lines', () => {
    const t = new Table(['noble_council'], { works: ['canal_lights', 'public_clock', 'makers_fair', 'tram_extension', 'skybridge'], spark: 2 });
    t.toMarket();
    t.s.turn.coins = 3;
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    t.s.players[t.me].vp = 2;
    const score = t.view().score!;
    expect(score.projects).toBe(4);
    expect(score.conditional).toBe(3);
    expect(score.special).toBe(2);
  });

  it('KC3-RENOWN-4: a rival’s tokens and score never reach you, and direct gains are hidden in the log', () => {
    const t = new Table(['patron_circle'], { players: 3 });
    t.s.players[(t.me + 1) % 3].vp = 7;
    t.s.log.push({ n: 999, seat: (t.me + 1) % 3, kind: 'vp', count: 7 });
    const me = t.view(t.me);
    expect(me.players[(t.me + 1) % 3].vp).toBeUndefined();
    expect(me.log.some((e) => e.kind === 'vp')).toBe(false);
    expect(me.final).toBeNull();
    const owner = t.view((t.me + 1) % 3);
    expect(owner.players[(t.me + 1) % 3].vp).toBe(7);
    expect(owner.score!.special).toBe(7);
    expect(owner.log.some((e) => e.kind === 'vp')).toBe(true);
    const watcher = game.project(t.s, null) as DeckView;
    expect(watcher.score).toBeNull();
    expect(watcher.players.every((p) => p.vp === undefined)).toBe(true);
    expect(game.results!(t.s)).toBeNull();
  });

  it('KC3-RENOWN-5: through a whole game, nothing sent to any seat gives away another score, then all of it is shown', () => {
    const start = newGame(3);
    const final = playOut(start, (s) => {
      if (s.over) return;
      for (const seat of [0, 1, 2, null]) {
        const v = game.project(s, seat) as DeckView;
        expect(v.final).toBeNull();
        v.players.forEach((p, i) => {
          if (i !== seat) expect(p).not.toHaveProperty('vp');
        });
        expect(v.log.filter((e) => e.kind === 'vp' && e.seat !== seat)).toEqual([]);
        const text = JSON.stringify(v);
        expect(text).not.toContain('"rng"');
        expect(text).not.toContain('"breakdown"');
      }
    });
    const end = game.project(final, 1) as DeckView;
    expect(end.final!.length).toBe(3);
    for (const f of end.final!) {
      const b = f.breakdown;
      expect(b.estates + b.special + b.projects + b.negative + b.conditional).toBe(f.total);
      expect(end.players[f.seat].vp).toBe(f.tokens);
    }
    expect(end.score!.total).toBe(end.final![1].total);
  }, 120_000);
});

describe('rules editions', () => {
  const original: DeckState = JSON.parse(readFileSync('tests/clockwork/saved-rooms-v1.json', 'utf8')).attack;

  it('KC3-VER-1: new games start on the new edition with the Crown Decrees on by default', () => {
    expect(game.rules).toBe(RULES);
    expect(newGame().rulesVersion).toBe(3);
    expect(RULES.defaultSets).toContain('crown');
    expect(game.rulesFor(3)).toBe(RULES);
    expect(game.rulesFor(2)).toBe(RULES_V2);
    expect((game.project(newGame(), 0) as DeckView).rulesVersion).toBe(3);
  });

  it('KC3-VER-2: a save from before editions migrates to v2 and changes nothing else', () => {
    expect(original.rulesVersion).toBeUndefined();
    const before = JSON.stringify(original);
    const migrated = game.migrate!(original, 1);
    expect(JSON.stringify(original)).toBe(before);
    const { rulesVersion, ...rest } = migrated;
    expect(rulesVersion).toBe(2);
    expect(JSON.stringify(rest)).toBe(before);
    expect(game.migrate!(migrated, 2)).toBe(migrated);
    expect(() => game.migrate!(original, 9)).toThrow();
  });

  it('KC3-VER-3: a v2 game keeps v2 piles, and never sees a Crown Decree', () => {
    const s = v2.setup({ playerCount: 4, seed: 'old', config: { market: ['corrosion_crew'], bans: [], sets: ['core', 'night'], projects: [] } });
    expect(s.rulesVersion).toBe(2);
    expect(s.supply.rust.length).toBe(30);
    const view = game.project(s, 0) as DeckView;
    expect(view.rulesVersion).toBe(2);
    expect(RULES_V2.cards.some((c) => c.set === 'crown')).toBe(false);
    expect(RULES_V2.projects!.some((p) => p.set === 'crown')).toBe(false);
    // Crown cards can't be named into an old game's rules at all.
    expect(game.rulesFor(view.rulesVersion).cards.find((c) => c.key === 'tax_arrears')).toBeUndefined();
    playOut(s, () => {});
  }, 60_000);

  it('KC3-VER-4: an edition this build does not know is refused, not guessed at', () => {
    expect(() => game.project({ ...newGame(), rulesVersion: 99 }, 0)).toThrow(/version 99/);
    const r = () => game.apply({ ...newGame(), rulesVersion: 99 }, 0, { type: 'end-phase' });
    expect(r).toThrow(/version 99/);
  });

  it('KC3-VER-5: the same seed plays a new game to the end on the new edition', () => {
    const s = playOut(newGame(4, 'crown-4'), () => {});
    expect(s.over).toBe(true);
    expect(s.rulesVersion).toBe(3);
  }, 60_000);
});
