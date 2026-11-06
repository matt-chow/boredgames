import { describe, expect, it } from 'vitest';
import type { MineV, PrivateRoundV } from '../../src/games/deaddrop/rules/types';
import { claimText, journalOf, missionNote, orderText, outcomeText } from '../../src/games/deaddrop/ui/text';

const round = (over: Partial<PrivateRoundV>): PrivateRoundV => ({ round: 1, order: null, delivered: false, blocked: false, captured: false, drew: false, coverGained: false, found: null, ...over });
const mine = (rounds: PrivateRoundV[], deliveries: MineV['deliveries'] = {}): MineV => ({ missions: ['embassy', 'harbour'], deliveries, order: null, rounds });

describe('Dead Drop wording', () => {
  it('uses the approved claim wording', () => {
    expect(claimText({ kind: 'delivered', loc: 'embassy' })).toBe('I delivered at Embassy last round');
    expect(claimText({ kind: 'investigated', loc: 'hotel' })).toBe('I investigated Grand Hotel last round');
    expect(claimText({ kind: 'decoy', loc: 'station' })).toBe('I deployed a decoy at Rail Station last round');
    expect(claimText({ kind: 'notDelivered' })).toBe('I did not deliver last round');
  });

  it('never tells the interceptor what a miss was', () => {
    const miss = outcomeText(round({ order: { action: 'intercept', target: 'hotel' } }));
    expect(miss).toBe('You caught no delivery at Grand Hotel.');
    expect(miss).not.toMatch(/decoy/i);
  });

  it('tells a decoy player whether Cover came of it', () => {
    const o = { action: 'decoy', target: 'hotel' } as const;
    expect(outcomeText(round({ order: o, drew: true, coverGained: true }))).toMatch(/You gain Cover/);
    expect(outcomeText(round({ order: o, drew: true }))).toMatch(/already hold Cover/);
    expect(outcomeText(round({ order: o }))).toMatch(/drew nobody/);
  });

  it('names the false signal only to its sender', () => {
    expect(orderText({ action: 'deliver', target: 'embassy', cover: 'hotel' })).toBe('Deliver at Embassy, broadcasting Grand Hotel under Cover');
  });

  it('builds the journal from verified facts only', () => {
    const j = journalOf(
      mine([
        round({ order: { action: 'investigate', target: 'hotel' }, found: true }),
        round({ order: { action: 'investigate', target: 'embassy' }, found: false }),
        round({ order: { action: 'intercept', target: 'harbour' }, captured: true }),
        round({ order: { action: 'intercept', target: 'station' } }),
      ]),
    );
    expect(j).toEqual({ hotel: 'mission', embassy: 'not', harbour: 'mission', station: 'unknown' });
  });

  it('says what the mission still needs', () => {
    expect(missionNote(mine([]))).toBe('0 of 3 delivered. 3 more, with one at Embassy and Harbour.');
    expect(missionNote(mine([], { embassy: 2 }))).toBe('2 of 3 delivered. 1 more, with one at Harbour.');
    expect(missionNote(mine([], { embassy: 1, harbour: 1 }))).toBe('2 of 3 delivered. 1 more, at either location.');
    // Three at one place isn't done: the missing location still has to be reached, however many that makes.
    expect(missionNote(mine([], { embassy: 3 }))).toBe('3 of 3 delivered. Still needs one at Harbour.');
  });
});
