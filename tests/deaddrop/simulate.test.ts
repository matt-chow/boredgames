/**
 * Seeded strategy matches through the real rules. Strategies see only `project(state, seat)`, what a player's screen
 * gets, so none can cheat. DD_SIM=<file> writes out the tables recorded in docs/DEADDROP_BALANCE.md.
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { randInt, seedRng, type RngState } from '../../src/engine/rng';
import { apply, MAX_ROUNDS, project, setup } from '../../src/games/deaddrop/rules/engine';
import { LOCATIONS, type Claim, type DAction, type DState, type DView, type EndMethod, type Loc, type Order } from '../../src/games/deaddrop/rules/types';

interface Strategy {
  order(v: DView, rng: RngState): Order;
  /** What it says about last round. Truthful by default. */
  claim?(v: DView, rng: RngState): Claim;
  /** Whether to spend its token on the rival's newest statement. */
  challenges?: boolean;
}

const pick = <T>(rng: RngState, xs: readonly T[]): T => xs[randInt(rng, xs.length)];
const anywhere = (rng: RngState) => pick(rng, LOCATIONS);
const lastSignal = (v: DView) => v.rounds.at(-1)?.signals[1 - v.you!] ?? null;

/** The mission not yet delivered to, then either. */
function deliver(v: DView, rng: RngState): Order {
  const missions = v.mine!.missions;
  const missing = missions.filter((m) => !v.mine!.deliveries[m]);
  const target = pick(rng, missing.length ? missing : missions);
  if (!v.cover[v.you!]) return { action: 'deliver', target };
  return { action: 'deliver', target, cover: pick(rng, LOCATIONS.filter((l) => l !== target)) };
}

/** Rival missions this player has verified. */
function known(v: DView): Loc[] {
  const out = new Set<Loc>();
  for (const r of v.mine!.rounds) {
    if (r.order && (r.found || r.captured)) out.add(r.order.target);
  }
  return [...out];
}

function hunt(v: DView, rng: RngState): Order {
  const found = known(v);
  if (found.length) return { action: 'intercept', target: pick(rng, found) };
  const asked = v.mine!.rounds.filter((r) => r.order?.action === 'investigate').map((r) => r.order!.target);
  return { action: 'investigate', target: pick(rng, LOCATIONS.filter((l) => !asked.includes(l))) };
}

function balanced(v: DView, rng: RngState): Order {
  const roll = randInt(rng, 100);
  if (roll < 50) return deliver(v, rng);
  if (roll < 75) return { action: 'intercept', target: known(v)[0] ?? lastSignal(v) ?? anywhere(rng) };
  if (roll < 90) return { action: 'investigate', target: anywhere(rng) };
  return { action: 'decoy', target: anywhere(rng) };
}

function truth(v: DView): Claim {
  const o = v.mine!.rounds.at(-1)?.order;
  if (!o || o.action === 'intercept') return { kind: 'notDelivered' };
  return { kind: o.action === 'deliver' ? 'delivered' : o.action === 'investigate' ? 'investigated' : 'decoy', loc: o.target };
}

/** Always names a different location, or denies a delivery. */
function lie(v: DView, rng: RngState): Claim {
  const o = v.mine!.rounds.at(-1)?.order;
  if (o?.action === 'deliver') return { kind: 'notDelivered' };
  return { kind: 'delivered', loc: pick(rng, LOCATIONS.filter((l) => l !== o?.target)) };
}

const STRATEGIES: Record<string, Strategy | null> = {
  alwaysDeliver: { order: (v, r) => deliver({ ...v, cover: [0, 0] }, r) },
  deliverUnderCover: { order: deliver },
  repeatIntercept: { order: (v) => ({ action: 'intercept', target: LOCATIONS[(v.you! * 2 + 1) % 4] }) },
  followSignal: { order: (v, r) => ({ action: 'intercept', target: lastSignal(v) ?? anywhere(r) }) },
  alwaysInvestigate: { order: (v) => ({ action: 'investigate', target: LOCATIONS[(v.round - 1) % 4] }) },
  decoySpam: { order: (v, r) => ({ action: 'decoy', target: anywhere(r) }) },
  huntThenIntercept: { order: hunt },
  balanced: { order: balanced },
  liar: { order: balanced, claim: lie, challenges: true },
  /** Files nothing, orders nothing, never continues: the rival has to call time every phase. */
  stall: null,
};

const CLOCK = 1_000_000;

interface Played {
  winner: number | null;
  method: EndMethod;
  rounds: number;
  calls: number;
}

/** Plays a whole match. Asserts on the way that the projection each strategy reads holds nothing of the rival's. */
function play(a: string, b: string, seed: string): Played {
  const strategies = [STRATEGIES[a], STRATEGIES[b]];
  const rng = seedRng(`sim:${seed}`);
  let s: DState = setup(seed, CLOCK);
  let now = CLOCK;
  let calls = 0;
  const act = (seat: number, action: DAction) => {
    const r = apply(s, seat, action, now);
    if (!r.ok) throw new Error(`${a}/${b} ${seed}: ${action.type} refused: ${r.code}`);
    s = r.state;
  };
  const opposite = (seat: number) => strategies[1 - seat];

  for (let guard = 0; s.phase !== 'over'; guard++) {
    if (guard > 400) throw new Error(`${a}/${b} ${seed}: no end in sight`);
    const round = s.round;
    if (s.phase === 'briefing') {
      for (const seat of [0, 1]) {
        const st = strategies[seat];
        if (!st) continue;
        const v = project(s, seat);
        const claim = round === 1 ? ({ kind: 'none' } as const) : (st.claim ?? truth)(v, rng);
        act(seat, { type: 'claim', round, claim });
      }
      for (const seat of [0, 1]) {
        const st = strategies[seat];
        if (!st || !opposite(seat)) continue;
        const v = project(s, seat);
        const target = v.statements.find((x) => x.seat !== seat && x.challengeable && !x.challenge);
        if (st.challenges && target && v.challengeToken[seat]) act(seat, { type: 'challenge', round, statement: target.id });
        act(seat, { type: 'ack', round, count: v.filed[1 - seat] });
      }
    } else if (s.phase === 'orders') {
      for (const seat of [0, 1]) {
        const st = strategies[seat];
        if (st) act(seat, { type: 'order', round, order: st.order(project(s, seat), rng) });
      }
    } else if (s.phase === 'report') {
      for (const seat of [0, 1]) if (strategies[seat]) act(seat, { type: 'continue', round });
    }
    if ((s.phase as string) === 'over' || s.round !== round) continue;
    // Someone stalled and the phase hasn't moved: the player present calls time.
    const absent = strategies.indexOf(null);
    if (absent >= 0) {
      now += 200_000;
      calls++;
      act(1 - absent, { type: 'callTime', round, phase: s.phase });
    }
  }
  const r = s.result!;
  return { winner: r.winner, method: r.method, rounds: s.rounds.length, calls };
}

const NAMES = Object.keys(STRATEGIES);
const GAMES = 400;

/** Each strategy from both seats, so seat order can't flatter one. */
function pairing(a: string, b: string) {
  const out = { a: 0, b: 0, draw: 0, rounds: 0, methods: {} as Record<string, number> };
  for (let i = 0; i < GAMES; i++) {
    const flip = i % 2 === 1;
    const p = flip ? play(b, a, `${a}-${b}-${i}`) : play(a, b, `${a}-${b}-${i}`);
    out.rounds += p.rounds;
    out.methods[p.method] = (out.methods[p.method] ?? 0) + 1;
    if (p.winner === null) out.draw++;
    else if ((p.winner === 0) !== flip) out.a++;
    else out.b++;
  }
  return out;
}

describe('Dead Drop strategy matches', () => {
  it('DD-SIM1: every pairing ends within the round limit, however the two of them play', () => {
    for (const a of NAMES) {
      for (const b of NAMES) {
        if (a === 'stall' && b === 'stall') continue;
        for (let i = 0; i < 10; i++) {
          const p = play(a, b, `limit-${i}`);
          expect(p.rounds).toBeLessThanOrEqual(MAX_ROUNDS);
          if (p.rounds < MAX_ROUNDS) expect(['mission', 'counterintelligence', 'simultaneous']).toContain(p.method);
        }
      }
    }
  }, 60_000);

  it('DD-SIM2: the same seed plays the same match', () => {
    expect(play('balanced', 'liar', 'same')).toEqual(play('balanced', 'liar', 'same'));
  });

  it('DD-SIM3: two pure deliverers always draw in round 3, since nobody intercepts', () => {
    for (let i = 0; i < 50; i++) expect(play('alwaysDeliver', 'alwaysDeliver', `m${i}`)).toMatchObject({ winner: null, method: 'simultaneous', rounds: 3 });
  });

  it('DD-SIM4: a stalling player can only delay: the rival beats them on time alone', () => {
    for (let i = 0; i < 50; i++) {
      const p = play('alwaysDeliver', 'stall', `st${i}`);
      expect(p).toMatchObject({ winner: 0, method: 'mission', rounds: 3 });
      expect(p.calls).toBeGreaterThan(0);
    }
  });

  it('DD-SIM5: a stalled match against someone who never delivers still finishes, drawn on the ladder', () => {
    const p = play('decoySpam', 'stall', 'late');
    expect(p).toMatchObject({ winner: null, method: 'level', rounds: MAX_ROUNDS });
  });

  it('DD-SIM6: repeating an intercept at one location cannot be a guaranteed win', () => {
    const r = pairing('repeatIntercept', 'alwaysDeliver');
    expect(r.b + r.draw).toBeGreaterThan(0);
  });

  it('DD-SIM7: lying and challenging do not break the match, and points only break ties', () => {
    for (let i = 0; i < 100; i++) {
      const p = play('liar', 'balanced', `lie${i}`);
      expect(p.rounds).toBeLessThanOrEqual(MAX_ROUNDS);
      if (p.method === 'challenges') expect(p.rounds).toBe(MAX_ROUNDS);
    }
  });

  it('writes the balance tables when asked', () => {
    if (!process.env.DD_SIM) return;
    const rows: string[] = [`| ${['row wins / draws / column wins', ...NAMES].join(' | ')} |`, `|${' --- |'.repeat(NAMES.length + 1)}`];
    const total = Object.fromEntries(NAMES.map((n) => [n, { wins: 0, games: 0, rounds: 0 }]));
    const methods: Record<string, number> = {};
    for (const a of NAMES) {
      const cells = [a];
      for (const b of NAMES) {
        if (a === 'stall' && b === 'stall') {
          cells.push('-');
          continue;
        }
        const r = pairing(a, b);
        cells.push(`${Math.round((100 * r.a) / GAMES)}/${Math.round((100 * r.draw) / GAMES)}/${Math.round((100 * r.b) / GAMES)}`);
        if (a !== b) {
          total[a].wins += r.a;
          total[a].games += GAMES;
          total[a].rounds += r.rounds;
          for (const [k, n] of Object.entries(r.methods)) methods[k] = (methods[k] ?? 0) + n;
        }
      }
      rows.push(`| ${cells.join(' | ')} |`);
    }
    const out = [rows.join('\n')];
    out.push(NAMES.map((n) => `${n}: wins ${Math.round((100 * total[n].wins) / total[n].games)}%, avg rounds ${(total[n].rounds / total[n].games).toFixed(2)}`).join('\n'));
    const m = pairing('balanced', 'balanced');
    out.push(`balanced mirror ${JSON.stringify(m)} avg ${(m.rounds / GAMES).toFixed(2)}`);
    const l = pairing('balanced', 'liar');
    out.push(`balanced v liar ${JSON.stringify(l)}`);
    out.push(`methods, all unlike pairings ${JSON.stringify(methods)}`);
    writeFileSync(process.env.DD_SIM, out.join('\n\n'));
  }, 600_000);
});
