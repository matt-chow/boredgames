import { aiTurn, aiView } from '../../src/games/apex/rules/ai';
import { turnAct, turnOptions, type Race } from '../../src/games/apex/rules/race';

/** Let each car's own computer driver take every turn decision left in this round. */
export function finishTurns(r: Race) {
  while (r.phase === 'turn') turnAct(r, aiTurn(aiView(r, r.turn!.car), r.turn!, turnOptions(r)));
}
