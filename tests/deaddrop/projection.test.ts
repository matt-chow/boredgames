/** Hidden information (DD-VIEW-*): what each player's view may and may not hold. */
import { describe, expect, it } from 'vitest';
import { deaddrop } from '../../src/games/deaddrop';
import { project } from '../../src/games/deaddrop/rules/engine';
import { LOCATIONS, type DView, type Loc } from '../../src/games/deaddrop/rules/types';
import { Match, decoy, deliver, intercept, investigate } from './helpers';

const json = (x: unknown) => JSON.stringify(x);
/** Everything in a view that the opponent is meant to know. */
const publicPart = (v: DView) => {
  const { you: _y, mine: _m, callAt: _c, ...rest } = v;
  return rest;
};

describe('DD-VIEW', () => {
  it('DD-VIEW1: your missions are yours alone', () => {
    const m = new Match([['embassy', 'station'], ['hotel', 'harbour']]);
    expect(project(m.s, 0).mine!.missions).toEqual(['embassy', 'station']);
    expect(project(m.s, 1).mine!.missions).toEqual(['hotel', 'harbour']);
    expect(json(project(m.s, 0))).not.toMatch(/hotel|harbour/);
    expect(json(project(m.s, 1))).not.toMatch(/embassy|station/);
  });

  it('DD-VIEW2: an observer sees no mission and no private report', () => {
    const m = new Match().resolve(investigate('hotel'), deliver('hotel'));
    const v = project(m.s, null);
    expect(v.mine).toBeNull();
    expect(v.final).toBeNull();
    expect(json(v)).not.toContain('deliveries');
  });

  it('DD-VIEW3: a locked order shows as locked and nothing more, even with the opponent still to commit', () => {
    const m = new Match().brief().order(0, deliver('embassy'));
    const other = project(m.s, 1);
    expect(other.done).toEqual([true, false]);
    expect(other.mine!.order).toBeNull();
    expect(json(other)).not.toMatch(/embassy|deliver"/);
    expect(project(m.s, 0).mine!.order).toEqual(deliver('embassy'));
  });

  it('DD-VIEW4: the report shows signals, not actions', () => {
    const shown = (o: Parameters<Match['resolve']>[0]) => publicPart(project(new Match().resolve(o, decoy('harbour')).s, 1));
    const a = shown(deliver('embassy'));
    expect(a.rounds[0].signals).toEqual(['embassy', 'harbour']);
    // Same public record whichever action made the signal.
    expect(json(shown(investigate('embassy')))).toBe(json(a));
    expect(json(shown(decoy('embassy')))).toBe(json(a));
    expect(json(shown(intercept('embassy')))).toBe(json(a));
  });

  it('DD-VIEW5: Cover shows that it was spent, with the broadcast only: the true location stays out', () => {
    const m = new Match().round(decoy('hotel'), intercept('hotel')).resolve(deliver('embassy', 'harbour'), decoy('hotel'));
    const v = project(m.s, 1);
    expect(v.rounds[1].coverSpent).toEqual([true, false]);
    expect(v.rounds[1].signals[0]).toBe('harbour');
    expect(json(v)).not.toContain('embassy');
    expect(project(m.s, 0).mine!.rounds[1].order).toEqual(deliver('embassy', 'harbour'));
  });

  it('DD-VIEW6: an investigation result reaches the investigator only', () => {
    const m = new Match([['embassy', 'station'], ['hotel', 'harbour']]).resolve(investigate('hotel'), decoy('station'));
    expect(project(m.s, 0).mine!.rounds[0].found).toBe(true);
    expect(project(m.s, 1).mine!.rounds[0].found).toBeNull();
    expect(json(publicPart(project(m.s, 1)))).not.toContain('found');
    expect(json(project(m.s, 1).mine)).not.toContain('investigate');
  });

  it('DD-VIEW7: deliveries are private: the opponent cannot tell one from a decoy', () => {
    const m = new Match().resolve(deliver('embassy'), decoy('hotel'));
    expect(project(m.s, 0).mine!.deliveries).toEqual({ embassy: 1 });
    expect(project(m.s, 1).mine!.deliveries).toEqual({});
    expect(json(publicPart(project(m.s, 1)))).not.toContain('delivered');
    expect(project(m.s, 1).final).toBeNull();
  });

  it('DD-VIEW8: an interception and its score are public; both players see them', () => {
    const m = new Match().resolve(deliver('embassy'), intercept('embassy'));
    for (const seat of [0, 1]) {
      const v = project(m.s, seat);
      expect(v.interceptions).toEqual([0, 1]);
      expect(v.rounds[0].captures).toEqual([{ seat: 1, loc: 'embassy' }]);
    }
    expect(project(m.s, 0).mine!.rounds[0].blocked).toBe(true);
    expect(project(m.s, 1).mine!.rounds[0].captured).toBe(true);
  });

  it('DD-VIEW9: an interceptor on a decoy learns only that the Cover changed hands', () => {
    const m = new Match().resolve(decoy('hotel'), intercept('hotel'));
    const hit = project(m.s, 1);
    expect(hit.mine!.rounds[0].captured).toBe(false);
    expect(hit.rounds[0].coverGained).toEqual([true, false]);
    expect(hit.interceptions).toEqual([0, 0]);
    expect(project(m.s, 0).mine!.rounds[0]).toMatchObject({ drew: true, coverGained: true });
  });

  it('DD-VIEW10: an interceptor who found nothing cannot tell what was there', () => {
    const view = (o: Parameters<Match['resolve']>[0]) => project(new Match().resolve(o, intercept('hotel')).s, 1).mine!.rounds[0];
    const miss = { delivered: false, blocked: false, captured: false, drew: false, coverGained: false, found: null };
    expect(view(investigate('hotel'))).toMatchObject(miss);
    expect(view(intercept('hotel'))).toMatchObject(miss);
    expect(view(deliver('embassy'))).toMatchObject(miss);
  });

  it('DD-VIEW11: a sealed challenge carries neither verdict nor point, in either player’s view', () => {
    for (const [order, claim] of [
      [deliver('embassy'), { kind: 'delivered', loc: 'embassy' }],
      [decoy('embassy'), { kind: 'delivered', loc: 'embassy' }],
    ] as const) {
      const m = new Match().round(order, decoy('hotel')).claim(0, claim);
      m.do(1, { type: 'challenge', round: 2, statement: m.s.statements.at(-1)!.id });
      for (const seat of [0, 1, null]) {
        const v = project(m.s, seat);
        expect(json(v.statements)).not.toContain('correct');
        expect(v.challengePoints).toEqual([0, 0]);
      }
    }
  });

  it('DD-VIEW12: a true and a false sealed challenge give the same public view', () => {
    const view = (order: Parameters<Match['round']>[0]) => {
      const m = new Match().round(order, decoy('hotel')).claim(0, { kind: 'delivered', loc: 'embassy' });
      m.do(1, { type: 'challenge', round: 2, statement: m.s.statements.at(-1)!.id });
      const v = project(m.s, 1);
      return json({ st: v.statements, cp: v.challengePoints, tok: v.challengeToken });
    };
    expect(view(deliver('embassy'))).toBe(view(decoy('embassy')));
  });

  it('DD-VIEW13: the end reveals both missions and the whole record; not a moment before', () => {
    const m = new Match();
    m.round(deliver('embassy'), decoy('hotel')).round(deliver('station'), decoy('hotel'));
    expect(project(m.s, 1).final).toBeNull();
    m.round(deliver('station'), decoy('hotel'));
    for (const seat of [0, 1]) {
      const f = project(m.s, seat).final!;
      expect(f.missions).toEqual([['embassy', 'station'], ['hotel', 'harbour']]);
      expect(f.deliveries).toEqual([3, 0]);
      expect(f.rounds).toHaveLength(3);
      expect(f.rounds[0].orders[0]).toEqual(deliver('embassy'));
    }
  });

  it('DD-VIEW14: a full match never sends the opponent’s secrets before the end', () => {
    for (let game = 0; game < 40; game++) {
      const hash = (x: number) => (Math.imul(x + game * 31, 2654435761) >>> 3) % 4;
      const m = new Match([['embassy', 'station'], ['hotel', 'harbour']], `leak${game}`);
      for (let r = 0; r < 7 && m.s.phase !== 'over'; r++) {
        m.brief();
        const a = hash(r * 2);
        const b = hash(r * 2 + 1);
        m.order(0, a === 0 ? deliver(r % 2 ? 'embassy' : 'station') : a === 1 ? investigate(LOCATIONS[hash(r + 9)]) : a === 2 ? intercept(LOCATIONS[hash(r + 11)]) : decoy(LOCATIONS[hash(r + 13)]));
        m.order(1, b === 0 ? deliver(r % 2 ? 'hotel' : 'harbour') : b === 1 ? investigate(LOCATIONS[hash(r + 15)]) : b === 2 ? intercept(LOCATIONS[hash(r + 17)]) : decoy(LOCATIONS[hash(r + 19)]));
        if ((m.s.phase as string) === 'over') break;
        for (const seat of [0, 1]) {
          const v = project(m.s, seat);
          const opp = 1 - seat;
          const missions: Loc[][] = m.s.seats.map((x) => x.missions);
          expect(json(v.mine)).not.toContain(json(missions[opp]));
          expect(json(publicPart(v))).not.toMatch(/"action"|"orders"|"missions"|"deliveries"|"found"|"delivered"/);
          expect(json(v.rounds)).not.toContain('cover":"');
        }
        m.closeReport();
      }
    }
  });

  it('DD-VIEW15: history rows name the kind of action and never its contents', () => {
    expect(deaddrop.historyAction!({ type: 'order', round: 1, order: deliver('embassy') })).toEqual({ type: 'order' });
    expect(deaddrop.historyAction!({ type: 'chat', text: 'secret' })).toEqual({ type: 'chat' });
  });
});
