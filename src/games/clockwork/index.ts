import { createDeckGame } from '../../engine/deckbuilder';
import { RULES, RULES_V2 } from './rules/ruleset';

export const clockwork = createDeckGame(RULES, [RULES_V2]);
