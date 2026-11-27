import { describe, expect, it } from 'vitest';
import { apex } from '../../src/games/apex';
import { defaultConfig, type AState } from '../../src/games/apex/rules/engine';
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
      expect(end.phase).toBe('over');
      const places = end.cars.map((c) => c.done!.place);
      const drivers = s.season.results[i].rows;
      rep.setup.cars.forEach((_, slot) => expect(drivers[s.season.drivers.findIndex((d) => d.number === rep.setup.cars[slot].number)].place).toBe(places[slot]));
    });
  });

  it('AX-REP-2 a replay exports, imports and refuses another version or a tampered record', () => {
    const rep = s.replays[0];
    expect(importReplay(exportReplay(rep))).toEqual(rep);
    expect(() => importReplay(JSON.stringify({ ...rep, version: 2 }))).toThrow(/version/);
    const bad = structuredClone(rep);
    bad.rounds[0].plans[0] = { gear: 4, cards: [0, 1, 2, 3], discard: [], boost: false };
    bad.rounds[0].reacts = [[0, true], ...bad.rounds[0].reacts];
    expect(() => replayFrames(bad)).toThrow();
  });
});
