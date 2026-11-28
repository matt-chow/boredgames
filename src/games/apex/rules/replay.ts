/**
 * Versioned race replays (AX-REP-1/2): the setup, every revealed plan and every turn decision. Replaying runs the same
 * deterministic engine, so a replay reproduces the race exactly, frame by frame. Version 1 replays (the v1.2 rules)
 * run through the frozen `race-v1` resolver.
 */
import { newRace, reveal, setPlan, turnAct, turnError, type Race } from './race';
import * as v1 from './race-v1';
import type { Replay } from './engine';

export const REPLAY_FORMAT = 'apex66-replay';
export const REPLAY_VERSION = 2;

/** What a frame needs to draw: both rule versions share it. */
export type Frame = Pick<Race, 'cars' | 'round' | 'laps' | 'n' | 'finished' | 'circuit' | 'modules' | 'weather' | 'sectors' | 'cornerDelta'> & { last: Pick<Race['last'][number], 'car' | 'from' | 'to' | 'spun' | 'corners'>[] };

const mismatch = () => new Error('This replay does not match its race.');

/** Each round's race state after it resolves, starting with the grid. */
export function replayFrames(rep: Replay): Frame[] {
  if (rep.format !== REPLAY_FORMAT || (rep.version !== 1 && rep.version !== 2)) throw new Error('This replay is from another version.');
  if (rep.version === 1) {
    const r = v1.newRace(rep.setup);
    const frames: Frame[] = [structuredClone(r)];
    for (const round of rep.rounds) {
      round.plans.forEach((p, id) => p && v1.setPlan(r, id, p));
      v1.reveal(r);
      for (const [car, take] of round.reacts) {
        if (r.phase !== 'react' || r.pending!.car !== car) throw mismatch();
        v1.react(r, take);
      }
      frames.push(structuredClone(r));
    }
    return frames;
  }
  const r = newRace(rep.setup);
  const frames: Frame[] = [structuredClone(r)];
  // turnAct moves the phase on, which narrowing cannot see.
  const phase = () => r.phase as Race['phase'];
  for (const round of rep.rounds) {
    if (phase() !== 'plan') throw mismatch();
    round.plans.forEach((p, id) => p && setPlan(r, id, p));
    reveal(r);
    for (const [car, act] of round.acts) {
      if (phase() !== 'turn' || r.turn!.car !== car || turnError(r, act)) throw mismatch();
      turnAct(r, act);
    }
    if (phase() === 'turn') throw mismatch();
    frames.push(structuredClone(r));
  }
  return frames;
}

export const exportReplay = (rep: Replay) => JSON.stringify(rep);

export function importReplay(text: string): Replay {
  const rep = JSON.parse(text) as Replay;
  replayFrames(rep); // throws on a foreign or damaged file
  return rep;
}
