import { describe, expect, it } from 'vitest';
import { apex } from '../../src/games/apex';
import { HEAT } from '../../src/games/apex/rules/cards';
import { defaultConfig, type AState, type Replay } from '../../src/games/apex/rules/engine';
import * as v1 from '../../src/games/apex/rules/race-v1';
import { exportReplay, importReplay, replayFrames } from '../../src/games/apex/rules/replay';

function playOut(s: AState): AState {
  while (!apex.isOver(s)) {
    const seat = apex.actors(s)[0];
    const r = apex.apply(s, seat, apex.bot!(apex.project(s, seat))!.actions[0]);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  }
  return s;
}

describe('AX-REP replays', () => {
  const s = playOut(apex.setup({ playerCount: 2, seed: 'rep', config: { ...defaultConfig(2), mode: 'championship', length: 3, cars: 6 } }));

  it('AX-REP-1 every recorded race replays to exactly the race that was run', () => {
    expect(s.replays).toHaveLength(3);
    s.replays.forEach((rep, i) => {
      const end = replayFrames(rep).at(-1)!;
      expect((end as unknown as { phase: string }).phase).toBe('over');
      const places = end.cars.map((c) => c.done!.place);
      const drivers = s.season.results[i].rows;
      rep.setup.cars.forEach((_, slot) => expect(drivers[s.season.drivers.findIndex((d) => d.number === rep.setup.cars[slot].number)].place).toBe(places[slot]));
    });
  });

  it('AX-REP-2 a replay exports, imports and refuses another version or a tampered record', () => {
    const rep = s.replays[0];
    expect(importReplay(exportReplay(rep))).toEqual(rep);
    expect(() => importReplay(JSON.stringify({ ...rep, version: 3 }))).toThrow(/version/);
    const bad = structuredClone(rep) as Extract<Replay, { version: 2 }>;
    bad.rounds[0].plans[0] = { gear: 4, cards: [0, 1, 2, 3] };
    bad.rounds[0].acts = [[0, { do: 'boost' }], ...bad.rounds[0].acts];
    expect(() => replayFrames(bad)).toThrow();
  });
});

describe('AX-REP-3 replays from the v1.2 rules', () => {
  it('a version 1 replay still plays back through the frozen resolver', () => {
    const setup = {
      circuit: 'ashford', laps: 1, seed: 'old', event: null, modules: { storm: false, mountains: false, dust: false, rivals: false },
      cars: [0, 1, 2].map((i) => ({ seat: i, name: `D${i}`, number: i + 1, livery: i, upgrades: [] })),
    };
    const r = v1.newRace(setup);
    while (r.phase !== 'over' && r.round < 80) {
      for (const c of r.cars) {
        if (c.done) continue;
        const ok = c.hand.map((x, i) => [x, i] as const).filter(([x]) => x !== HEAT).map(([, i]) => i);
        let plan: v1.Plan = { gear: 1, cards: [], discard: [], boost: false };
        for (let g = Math.min(4, c.gear + 1); g >= 1; g--) {
          const p = { gear: g, cards: ok.slice(0, g), discard: [], boost: g === 1 };
          if (ok.length >= g && !v1.planError(r, c.id, p)) { plan = p; break; }
        }
        v1.setPlan(r, c.id, plan);
      }
      v1.reveal(r);
      while (r.phase === 'react') v1.react(r, true);
    }
    expect(r.phase).toBe('over');
    const rep: Replay = { format: 'apex66-replay', version: 1, setup, rounds: r.replay };
    const end = importReplay(exportReplay(rep)) && replayFrames(rep).at(-1)!;
    expect(end.finished).toEqual(r.finished);
    expect(end.cars.map((c) => c.pos)).toEqual(r.cars.map((c) => c.pos));
  });
});
