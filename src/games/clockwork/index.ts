import { createDeckGame } from '../../engine/deckbuilder';
import { EDITIONS } from './rules/editions';
import { RULES, RULES_V2, RULES_V3 } from './rules/ruleset';

export const clockwork = createDeckGame(RULES, [RULES_V2, RULES_V3], EDITIONS);
