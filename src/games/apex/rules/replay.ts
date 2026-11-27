/**
 * Versioned race replays (AX-REP-1/2): the setup and every revealed plan and draft answer. Replaying runs the same
 * deterministic engine, so a replay reproduces the race exactly, frame by frame.
 */
import { newRace, react, reveal, setPlan, type Race } from './race';
import type { Replay } from './engine';

export const REPLAY_FORMAT = 'apex66-replay';
export const REPLAY_VERSION = 1;

/** Each round's race state after its reveal, starting with the grid. */
export function replayFrames(rep: Replay): Race[] {
  if (rep.format !== REPLAY_FORMAT || rep.version !== REPLAY_VERSION) throw new Error('This replay is from another version.');
  const r = newRace(rep.setup);
  const frames = [structuredClone(r)];
  for (const round of rep.rounds) {
    round.plans.forEach((p, id) => p && setPlan(r, id, p));
    reveal(r);
    for (const [car, take] of round.reacts) {
      if (r.phase !== 'react' || r.pending!.car !== car) throw new Error('This replay does not match its race.');
      react(r, take);
    }
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
