import { describe, expect, it } from 'vitest';
import { UPGRADES, upgradePool, sumFit } from '../../src/games/apex/rules/content/upgrades';
import { EVENTS, PRESS, RIVALS, SECTOR_MODS, SPONSORS, WEATHER, eventPool, type Need } from '../../src/games/apex/rules/content/paddock';

const ON = { storm: true, mountains: true, dust: true, rivals: true };
const ALL_POOLS = { basic: true, advanced: true, environmental: true };

describe('content', () => {
  it('AX-CONT-1 has 64 upgrades: 24 basic, 24 advanced, 16 environmental, unique ids and names', () => {
    expect(UPGRADES).toHaveLength(64);
    const count = (p: string) => UPGRADES.filter((u) => u.pool === p).length;
    expect([count('basic'), count('advanced'), count('environmental')]).toEqual([24, 24, 16]);
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(64);
    expect(new Set(UPGRADES.map((u) => u.name)).size).toBe(64);
    for (const u of UPGRADES) {
      expect(Boolean(u.card) !== Boolean(u.fit), u.id).toBe(true);
      expect(Boolean(u.module), u.id).toBe(u.pool === 'environmental');
      if (u.card) expect(u.card.value >= 0 && u.card.value <= 8, u.id).toBe(true);
    }
  });

  it('AX-CONT-2 environmental upgrades leave the pool with their module, pools switch independently', () => {
    expect(upgradePool(ALL_POOLS, ON)).toHaveLength(64);
    expect(upgradePool(ALL_POOLS, { ...ON, storm: false })).toHaveLength(58);
    expect(upgradePool(ALL_POOLS, { storm: false, mountains: false, dust: false, rivals: false })).toHaveLength(48);
    expect(upgradePool({ basic: true, advanced: false, environmental: false }, ON)).toHaveLength(24);
    expect(upgradePool({ basic: false, advanced: true, environmental: true }, ON)).toHaveLength(40);
  });

  it('AX-CONT-3 counts: 6 sponsors, 10 press, 16 events, 6 weather, 8 rivals', () => {
    expect(SPONSORS).toHaveLength(6);
    expect(PRESS).toHaveLength(10);
    expect(EVENTS).toHaveLength(16);
    expect(WEATHER).toHaveLength(6);
    expect(RIVALS).toHaveLength(8);
    expect(WEATHER.map((w) => w.weight)).toEqual([3, 2, 2, 2, 2, 1]);
    expect(SECTOR_MODS.map((s) => s.weight)).toEqual([4, 1, 1, 2]);
    for (const list of [SPONSORS, PRESS, EVENTS, WEATHER, RIVALS]) expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
  });

  it('AX-CONT-4 incompatible events are filtered', () => {
    const none = { championship: false, press: false, sponsors: false, notLast: false, storm: false, mountains: false, dust: false, rivals: false } as Record<Need, boolean>;
    const quick = eventPool(none).map((e) => e.id);
    expect(quick).toHaveLength(11);
    for (const id of ['shuffle', 'pressday', 'gala', 'parts', 'duststorm']) expect(quick).not.toContain(id);
    const all = Object.fromEntries(Object.keys(none).map((k) => [k, true])) as Record<Need, boolean>;
    expect(eventPool(all)).toHaveLength(16);
    expect(eventPool({ ...all, notLast: false }).map((e) => e.id)).not.toContain('parts');
  });

  it('sumFit adds numbers and ORs flags', () => {
    expect(sumFit([{ engine: 2, rainGrip: true }, { engine: -1, hand: 1 }, undefined])).toEqual({ engine: 1, rainGrip: true, hand: 1 });
  });
});
