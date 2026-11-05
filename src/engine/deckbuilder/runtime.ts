/**
 * The effect interpreter. All pending work is an explicit stack of JSON frames, so resolution can stop at any player
 * decision, be persisted, and resume exactly where it left off.
 */
import { shuffle } from '../rng';
import { helpedComplete, nextStage } from './stages';
import type {
  CardDef,
  CardFilter,
  CardId,
  CardMatch,
  CardRef,
  CardSource,
  Cond,
  Ctx,
  DeckState,
  Dest,
  Effect,
  EventName,
  Frame,
  LogEntry,
  Num,
  Pending,
  PlayerRef,
  PlayerZones,
  Ruleset,
  TriggerRef,
} from './types';

const MAX_STEPS = 50_000;
const MAX_REPEAT = 100;
const MAX_LOG = 300;
const NO_DISCOUNT = { coins: 0, tokens: 0 };

/** What this seat would pay for a project right now. */
export function projectPrice(state: DeckState, lib: Library, key: string, seat: number): { coins: number; tokens: Record<string, number> } {
  const here = state.projects.find((p) => p.key === key);
  const def = (here && nextStage(here)) ?? lib.rules.projects!.find((p) => p.key === key)!;
  const mine = seat === state.turn.seat ? state.turn.projectDiscount : NO_DISCOUNT;
  const extra = (here?.surcharges ?? []).filter((x) => x.by !== seat).reduce((a, x) => a + x.coins, 0);
  return {
    coins: Math.max(0, def.coins + extra - mine.coins),
    tokens: Object.fromEntries(Object.entries(def.tokens).map(([t, n]) => [t, Math.max(0, n - mine.tokens)])),
  };
}

export interface Library {
  rules: Ruleset;
  defs: Record<string, CardDef>;
}

export function makeLibrary(rules: Ruleset): Library {
  return { rules, defs: Object.fromEntries(rules.cards.map((c) => [c.key, c])) };
}

export const matches = (def: CardDef, f: CardMatch | undefined) =>
  !f || ((!f.type || def.types.includes(f.type)) && (!f.notType || !def.types.includes(f.notType)) && (!f.key || def.key === f.key));

export function costOf(state: DeckState, lib: Library, key: string): number {
  const def = lib.defs[key];
  let cost = def.cost;
  for (const m of state.turn.costMods) if (matches(def, m.filter)) cost += m.delta;
  return Math.max(0, cost);
}

export function pushLog(state: DeckState, e: Omit<LogEntry, 'n'>) {
  state.log.push({ n: state.nextLog++, ...e });
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
}

interface Ask {
  kind: Pending['kind'];
  seat: number;
  c: number;
  prompt: string;
  after?: string;
  optional: boolean;
  min: number;
  max: number;
  cards?: CardId[];
  piles?: string[];
  options?: string[];
  seats?: number[];
  hint?: Pending['hint'];
  as?: string;
  branches?: Effect[][];
}

export class Runtime {
  /** Set when anything happened that an undo could exploit or that touched another player. */
  tainted = false;

  constructor(
    readonly state: DeckState,
    readonly lib: Library,
  ) {}

  private key = (id: CardId) => this.state.cards[id];
  private def = (id: CardId) => this.lib.defs[this.key(id)];
  private log = (e: Omit<LogEntry, 'n'>) => pushLog(this.state, e);

  private newCtx(c: Partial<Ctx> & { player: number }): number {
    const id = this.state.nextCtx++;
    this.state.ctxs[id] = { source: null, vars: {}, immune: [], holders: [], parent: null, ...c };
    return id;
  }

  /** Queue frames so the first listed runs first. */
  private push(frames: Frame[]) {
    for (let i = frames.length - 1; i >= 0; i--) this.state.stack.push(frames[i]);
  }

  private pushFx(ctx: number, effects: Effect[]) {
    this.push(effects.map((fx) => ({ k: 'fx' as const, ctx, fx })));
  }

  /** Seats in turn order, starting with the seat whose turn it is. */
  private turnOrder(): number[] {
    const { n, turn } = this.state;
    return Array.from({ length: n }, (_, i) => (turn.seat + i) % n);
  }

  /** Run until a decision is needed or nothing is left to do. */
  run() {
    const s = this.state;
    let steps = 0;
    while (!s.pending && s.stack.length && !s.over) {
      if (++steps > MAX_STEPS) throw new Error('deckbuilder: resolution did not terminate');
      this.step(s.stack.pop()!);
    }
    if (!s.pending && !s.stack.length) this.settle();
  }

  /** Resolution finished: drop working memory, and discard anything a definition left in limbo. */
  private settle() {
    const s = this.state;
    for (const l of s.limbo) s.players[l.owner].discard.push(l.id);
    s.limbo = [];
    s.ctxs = {};
    s.nextCtx = 0;
  }

  private step(f: Frame) {
    switch (f.k) {
      case 'fx':
        return this.effect(f.ctx, f.fx);
      case 'play':
        return this.play(f.seat, f.card, f.holders);
      case 'play-treasures':
        return this.playTreasures(f);
      case 'react':
        return this.react(f);
      case 'triggers':
        return this.triggers(f);
      case 'turn-end':
        return this.fire('turn-end', this.state.turn.seat, null);
      case 'cleanup':
        return this.cleanup();
      case 'next-turn':
        return this.nextTurn();
    }
  }

  // Numbers, filters and conditions

  private num(c: number, n: Num): number {
    if (typeof n === 'number') return n;
    const ctx = this.state.ctxs[c];
    if ('len' in n) {
      const v = ctx.vars[n.len];
      return Array.isArray(v) ? v.length : 0;
    }
    if ('value' in n) {
      const v = ctx.vars[n.value];
      return typeof v === 'number' ? v : 0;
    }
    if ('costOf' in n) {
      const v = ctx.vars[n.costOf];
      const first = Array.isArray(v) ? v[0] : undefined;
      if (first === undefined) return 0;
      const key = typeof first === 'number' ? this.key(first) : first;
      return costOf(this.state, this.lib, key) + (n.plus ?? 0);
    }
    if ('token' in n) return this.state.players[ctx.player].tokens[n.token] ?? 0;
    if ('count' in n) {
      const p = this.state.players[ctx.player];
      return n.count === 'deck+discard' ? p.deck.length + p.discard.length : p[n.count].length;
    }
    if ('countIn' in n) return this.varKeys(c, n.countIn).filter((k) => this.passes(c, k, n.filter)).length;
    if ('add' in n) return n.add.reduce((a: number, x) => a + this.num(c, x), 0);
    if ('min' in n) return Math.min(...n.min.map((x) => this.num(c, x)));
    if ('mul' in n) return this.num(c, n.mul[0]) * n.mul[1];
    if ('div' in n) return (n.up ? Math.ceil : Math.floor)(this.num(c, n.div[0]) / n.div[1]);
    if ('actionsPlayed' in n) return this.state.turn.actionsPlayed;
    if ('projects' in n) return this.state.projects.filter((x) => n.projects === 'all' ? x.by !== null : helpedComplete(x, ctx.player)).length;
    return Object.values(this.state.supply).filter((p) => p.length === 0).length;
  }

  /** The card keys held in a variable, whether it holds cards or piles. */
  private varKeys(c: number, name: string): string[] {
    const v = this.state.ctxs[c].vars[name];
    return Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? this.key(x) : x)) : [];
  }

  /** The seat a reference points at, seen from the player resolving this context. */
  private seatOf(c: number, who: PlayerRef | undefined): number {
    const ctx = this.state.ctxs[c];
    if (who === 'left') return (ctx.player + 1) % this.state.n;
    if (who === 'parent' && ctx.parent !== null) return this.state.ctxs[ctx.parent].player;
    if (typeof who === 'object') {
      const v = ctx.vars[who.var];
      return typeof v === 'number' ? v : ctx.player;
    }
    return ctx.player;
  }

  private passes(c: number, key: string, f: CardFilter | undefined): boolean {
    if (!f) return true;
    if (!matches(this.lib.defs[key], f)) return false;
    if (f.sameAs !== undefined && !this.varKeys(c, f.sameAs).includes(key)) return false;
    if (f.notSameAs !== undefined && this.varKeys(c, f.notSameAs).includes(key)) return false;
    const cost = costOf(this.state, this.lib, key);
    if (f.maxCost !== undefined && cost > this.num(c, f.maxCost)) return false;
    if (f.minCost !== undefined && cost < this.num(c, f.minCost)) return false;
    if (f.exactCost !== undefined && cost !== this.num(c, f.exactCost)) return false;
    return true;
  }

  private cond(c: number, q: Cond): boolean {
    const ctx = this.state.ctxs[c];
    const list = (v: string) => {
      const x = ctx.vars[v];
      return Array.isArray(x) ? x : [];
    };
    if ('has' in q) return list(q.has).length > 0;
    if ('none' in q) return list(q.none).length === 0;
    if ('isType' in q)
      return list(q.isType).some((x) => this.lib.defs[typeof x === 'number' ? this.key(x) : x].types.includes(q.type));
    if ('gte' in q) return this.num(c, q.gte[0]) >= this.num(c, q.gte[1]);
    if ('inHand' in q) return this.state.players[ctx.player].hand.some((id) => this.passes(c, this.key(id), q.inHand));
    if ('pileEmpty' in q) return (this.state.supply[q.pileEmpty]?.length ?? 0) === 0;
    if ('claimedLastTurn' in q) {
      const last = this.state.players[ctx.player].turns - 1;
      // In a staged project `by` is whoever funded the last stage, so this is a completion, as the card says (CC-STAGE-8).
      return this.state.projects.some((x) => x.by === ctx.player && x.onTurn === last);
    }
    if ('any' in q) return q.any.some((x) => this.cond(c, x));
    if ('all' in q) return q.all.every((x) => this.cond(c, x));
    return !this.cond(c, q.not);
  }

  private cardList(c: number, ref: CardRef): CardId[] {
    const ctx = this.state.ctxs[c];
    if (ref === 'source') return ctx.source === null ? [] : [ctx.source];
    if (ref === 'hand') return [...this.state.players[ctx.player].hand];
    const v = ctx.vars['rest' in ref ? ref.rest : ref.var];
    const ids = Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
    return 'rest' in ref ? ids.filter((id) => this.state.limbo.some((l) => l.id === id)) : ids;
  }

  private sourceList(c: number, from: CardSource): CardId[] {
    const p = this.state.players[this.state.ctxs[c].player];
    if (from === 'hand') return p.hand;
    if (from === 'discard') return p.discard;
    if (from === 'play') return p.play;
    if (from === 'trash') return this.state.trash;
    return this.cardList(c, from);
  }

  // Effects

  private effect(c: number, fx: Effect) {
    const s = this.state;
    const ctx = s.ctxs[c];
    const p = s.players[ctx.player];
    // Anything happening to someone other than the active player cannot be undone.
    if (ctx.player !== s.turn.seat) this.tainted = true;
    switch (fx.op) {
      case 'draw':
        return this.draw(c, this.num(c, fx.n));
      case 'actions':
        s.turn.actions += this.num(c, fx.n);
        return;
      case 'buys':
        s.turn.buys += this.num(c, fx.n);
        return;
      case 'coins':
        s.turn.coins += this.num(c, fx.n);
        return;
      case 'token':
        return this.changeToken(this.seatOf(c, fx.player), fx.token, this.num(c, fx.n));
      case 'vp': {
        const count = this.num(c, fx.n);
        p.vp += count;
        this.log({ seat: ctx.player, kind: 'vp', count });
        return;
      }
      case 'choose-cards': {
        const options = this.sourceList(c, fx.from).filter((id) => this.passes(c, this.key(id), fx.filter));
        const max = Math.min(this.num(c, fx.max), options.length);
        const min = Math.min(this.num(c, fx.min), max);
        // With no real choice to make, skip the prompt.
        if (max === 0 || min === options.length) {
          ctx.vars[fx.as] = max === 0 ? [] : [...options];
          return;
        }
        return this.ask({ kind: 'cards', seat: this.seatOf(c, fx.by), c, prompt: fx.prompt, after: fx.after, optional: min === 0, min, max, cards: [...options], as: fx.as, hint: fx.hint });
      }
      case 'choose-pile': {
        const piles = Object.keys(s.supply).filter((k) => s.supply[k].length > 0 && this.passes(c, k, fx.filter));
        if (!piles.length) {
          ctx.vars[fx.as] = [];
          return;
        }
        const optional = !!fx.optional;
        return this.ask({ kind: 'pile', seat: this.seatOf(c, fx.by), c, prompt: fx.prompt, after: fx.after, optional, min: optional ? 0 : 1, max: 1, piles, as: fx.as });
      }
      case 'choose': {
        const pick = Math.min(fx.pick ?? 1, fx.options.length);
        const taken = fx.taken ?? [];
        // With no real choice left, skip the prompt. Everything chosen runs in the order listed.
        const chosen = pick > 1 && fx.options.length <= pick ? fx.options.map((_, i) => i) : taken;
        if (pick > 1 && chosen.length >= pick) {
          this.pushFx(c, fx.options.filter((_, i) => chosen.includes(i)).flatMap((o) => o.then));
          return;
        }
        const open = fx.options.map((_, i) => i).filter((i) => !taken.includes(i));
        return this.ask({
          kind: 'option',
          seat: this.seatOf(c, fx.by),
          c,
          prompt: fx.prompt,
          optional: false,
          min: 1,
          max: 1,
          options: open.map((i) => fx.options[i].label),
          branches: open.map((i) => (pick > 1 ? [{ ...fx, taken: [...taken, i] }] : fx.options[i].then)),
        });
      }
      case 'choose-number': {
        const max = Math.max(0, this.num(c, fx.max));
        const min = Math.min(max, Math.max(0, this.num(c, fx.min)));
        if (min === max) {
          ctx.vars[fx.as] = min;
          return;
        }
        const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return this.ask({
          kind: 'option',
          seat: ctx.player,
          c,
          prompt: fx.prompt,
          after: fx.after,
          optional: false,
          min: 1,
          max: 1,
          options: values.map(String),
          branches: values.map((n) => [{ op: 'set', as: fx.as, n }]),
        });
      }
      case 'choose-player': {
        const seats = this.turnOrder().filter((x) => x !== ctx.player);
        if (seats.length === 1) {
          ctx.vars[fx.as] = seats[0];
          return;
        }
        return this.ask({ kind: 'player', seat: ctx.player, c, prompt: fx.prompt, optional: false, min: 1, max: 1, seats, as: fx.as });
      }
      case 'choose-project': {
        const open = s.projects.filter((x) => x.by === null);
        if (open.length <= 1) {
          ctx.vars[fx.as] = open.map((x) => x.key);
          return;
        }
        const named = (key: string) => this.lib.rules.projects!.find((x) => x.key === key)!.name;
        return this.ask({
          kind: 'option',
          seat: ctx.player,
          c,
          prompt: fx.prompt,
          optional: false,
          min: 1,
          max: 1,
          options: open.map((x) => named(x.key)),
          branches: open.map((x) => [{ op: 'set', as: fx.as, keys: [x.key] }]),
        });
      }
      case 'set':
        ctx.vars[fx.as] = fx.keys ?? this.num(c, fx.n ?? 0);
        return;
      case 'on-player': {
        const seat = this.seatOf(c, fx.player);
        if (seat !== ctx.player) this.tainted = true;
        const child = this.newCtx({ player: seat, source: ctx.source, vars: { ...ctx.vars }, parent: c });
        this.pushFx(child, fx.effects);
        return;
      }
      case 'project-discount':
        s.turn.projectDiscount = {
          coins: s.turn.projectDiscount.coins + this.num(c, fx.coins ?? 0),
          tokens: s.turn.projectDiscount.tokens + this.num(c, fx.tokens ?? 0),
        };
        return;
      case 'project-surcharge': {
        const v = ctx.vars[fx.project];
        const key = Array.isArray(v) ? v[0] : undefined;
        const here = s.projects.find((x) => x.key === key);
        if (!here || here.by !== null) return;
        here.surcharges.push({ by: ctx.player, coins: this.num(c, fx.coins) });
        this.tainted = true;
        this.log({ seat: ctx.player, kind: 'surcharge', project: here.key });
        return;
      }
      case 'may':
        return this.ask({ kind: 'option', seat: this.seatOf(c, fx.by), c, prompt: fx.prompt, optional: true, min: 1, max: 1, options: ['Yes', 'No'], branches: [fx.then, fx.else ?? []] });
      case 'move':
        return this.moveAll(c, this.cardList(c, fx.cards), fx.to, !!fx.public, this.seatOf(c, fx.player));
      case 'gain':
        return this.gain(c, fx.pile, fx.to ?? 'discard', this.seatOf(c, fx.player));
      case 'gain-card':
        return this.gainCards(c, this.cardList(c, fx.cards), fx.to ?? 'discard', this.seatOf(c, fx.player));
      case 'look':
      case 'reveal': {
        const n = this.num(c, fx.n);
        if (p.deck.length < n && p.discard.length) return this.reshuffle(c, ctx.player, fx);
        const taken = p.deck.splice(Math.max(0, p.deck.length - n)).reverse();
        const isPublic = fx.op === 'reveal';
        for (const id of taken) s.limbo.push({ id, owner: ctx.player, public: isPublic });
        const before = ctx.vars[fx.as];
        ctx.vars[fx.as] = fx.append && Array.isArray(before) ? [...before, ...taken] : taken;
        this.tainted = true;
        const keys = taken.map(this.key);
        if (isPublic) this.log({ seat: ctx.player, kind: 'reveal', keys });
        else {
          this.log({ seat: ctx.player, kind: 'look', count: taken.length });
          this.log({ seat: ctx.player, kind: 'look', keys, to: ctx.player });
        }
        return;
      }
      case 'reveal-cards':
        this.tainted = true;
        this.log({ seat: ctx.player, kind: 'reveal', keys: this.cardList(c, fx.cards).map(this.key) });
        return;
      case 'select':
        ctx.vars[fx.as] = this.sourceList(c, fx.from).filter((id) => this.passes(c, this.key(id), fx.filter));
        return;
      case 'pass-up': {
        const target = ctx.parent === null ? null : s.ctxs[ctx.parent];
        const v = ctx.vars[fx.var];
        if (!target || !Array.isArray(v)) return;
        const name = fx.as ?? fx.var;
        const had = target.vars[name];
        target.vars[name] = [...(Array.isArray(had) ? had : []), ...v];
        return;
      }
      case 'shuffle':
        if (p.discard.length) this.reshuffle(c, ctx.player, null);
        return;
      case 'attack':
      case 'each-other': {
        this.tainted = true;
        const others = this.turnOrder().filter((x) => x !== ctx.player && !(fx.op === 'attack' && ctx.immune.includes(x)));
        const frames: Frame[] = [];
        for (const seat of others) {
          const child = this.newCtx({ player: seat, source: ctx.source, vars: { ...ctx.vars }, parent: c });
          frames.push(...fx.effects.map((e) => ({ k: 'fx' as const, ctx: child, fx: e })));
        }
        this.push(frames);
        return;
      }
      case 'repeat': {
        const n = Math.min(MAX_REPEAT, this.num(c, fx.n));
        const frames: Frame[] = [];
        for (let i = 0; i < n; i++) frames.push(...fx.effects.map((e) => ({ k: 'fx' as const, ctx: c, fx: e })));
        this.push(frames);
        return;
      }
      case 'until': {
        const left = Math.min(MAX_REPEAT, fx.max ?? MAX_REPEAT);
        if (left <= 0 || this.cond(c, fx.cond)) return;
        this.pushFx(c, [...fx.effects, { ...fx, max: left - 1 }]);
        return;
      }
      case 'if':
        this.pushFx(c, this.cond(c, fx.cond) ? fx.then : (fx.else ?? []));
        return;
      case 'play-card': {
        const times = Math.min(MAX_REPEAT, this.num(c, fx.times));
        const holders = ctx.source === null ? ctx.holders : [...ctx.holders, ctx.source];
        const frames: Frame[] = [];
        for (const card of this.cardList(c, fx.cards))
          for (let i = 0; i < times; i++) frames.push({ k: 'play', seat: ctx.player, card, holders });
        this.push(frames);
        return;
      }
      case 'cost-mod':
        s.turn.costMods.push({ delta: this.num(c, fx.delta), filter: fx.filter });
        return;
      case 'delay':
        s.delays.push({
          player: ctx.player,
          label: fx.label,
          source: ctx.source,
          holds: ctx.source === null ? [...ctx.holders] : [ctx.source, ...ctx.holders],
          effects: fx.effects,
          vars: { ...ctx.vars },
        });
        return;
      case 'on':
        s.temps.push({ player: ctx.player, on: fx.on, filter: fx.filter, label: fx.label, source: ctx.source, effects: fx.effects, once: fx.once });
        return;
      case 'immune': {
        const target = ctx.parent === null ? null : s.ctxs[ctx.parent];
        if (target && !target.immune.includes(ctx.player)) target.immune.push(ctx.player);
        return;
      }
      case 'extra-turn':
        s.extraTurns.push(ctx.player);
        return;
      case 'custom': {
        const handler = this.lib.rules.handlers?.[fx.handler];
        if (!handler) throw new Error(`deckbuilder: no handler ${fx.handler}`);
        handler(
          {
            state: s,
            ctx,
            queue: (effects) => this.pushFx(c, effects),
            keyOf: this.key,
            costOf: (key) => costOf(s, this.lib, key),
            taint: () => (this.tainted = true),
          },
          fx.args ?? {},
        );
        return;
      }
    }
  }

  private ask(q: Ask) {
    const s = this.state;
    if (q.seat !== s.turn.seat) this.tainted = true;
    s.pending = {
      id: s.nextDecision++,
      seat: q.seat,
      kind: q.kind,
      source: s.ctxs[q.c]?.source ?? null,
      prompt: q.prompt,
      after: q.after,
      optional: q.optional,
      min: q.min,
      max: q.max,
      cards: q.cards ?? [],
      piles: q.piles ?? [],
      options: q.options ?? [],
      seats: q.seats,
      hint: q.hint,
      ctx: q.c,
      as: q.as,
      branches: q.branches,
    };
  }

  private changeToken(seat: number, token: string, n: number) {
    const p = this.state.players[seat];
    const had = p.tokens[token] ?? 0;
    const cap = this.lib.rules.tokenCaps?.[token] ?? Infinity;
    const now = Math.min(cap, Math.max(0, had + n));
    p.tokens[token] = now;
    if (seat !== this.state.turn.seat) this.tainted = true;
    if (now !== had) this.log({ seat, kind: 'token', token, count: now - had });
  }

  /** Shuffle the discard pile under the deck. Queues `resume` so an interrupted effect continues afterwards. */
  private reshuffle(c: number, seat: number, resume: Effect | null) {
    const s = this.state;
    const p = s.players[seat];
    const cards = p.discard.splice(0);
    shuffle(s.rng, cards);
    p.deck = cards.concat(p.deck);
    this.tainted = true;
    this.log({ seat, kind: 'shuffle', count: cards.length });
    if (resume) this.pushFx(c, [resume]);
    this.fire('shuffle', seat, null);
  }

  private draw(c: number, n: number) {
    const seat = this.state.ctxs[c].player;
    const p = this.state.players[seat];
    let drawn = 0;
    while (drawn < n) {
      if (!p.deck.length) {
        if (!p.discard.length) break;
        if (drawn) this.log({ seat, kind: 'draw', count: drawn });
        return this.reshuffle(c, seat, { op: 'draw', n: n - drawn });
      }
      p.hand.push(p.deck.pop()!);
      drawn++;
      this.tainted = true;
    }
    if (drawn) this.log({ seat, kind: 'draw', count: drawn });
  }

  /** Take a card out of wherever it is. Returns false if it is nowhere it can be taken from. */
  private take(id: CardId): boolean {
    const s = this.state;
    const del = (a: CardId[]) => {
      const i = a.indexOf(id);
      if (i < 0) return false;
      a.splice(i, 1);
      return true;
    };
    const li = s.limbo.findIndex((l) => l.id === id);
    if (li >= 0) {
      s.limbo.splice(li, 1);
      return true;
    }
    for (const p of s.players) {
      if (del(p.hand) || del(p.play) || del(p.discard) || del(p.deck)) return true;
      for (const m of Object.values(p.mats)) if (del(m)) return true;
    }
    return del(s.trash);
  }

  private place(id: CardId, p: PlayerZones, to: Dest) {
    if (to === 'trash') this.state.trash.push(id);
    else if (to === 'discard') p.discard.push(id);
    else if (to === 'deck') p.deck.push(id);
    else if (to === 'deck-bottom') p.deck.unshift(id);
    else if (to === 'hand') p.hand.push(id);
    else if (to === 'play') p.play.push(id);
    else if (to === 'supply') this.state.supply[this.key(id)]?.push(id);
    else (p.mats[to.mat] ??= []).push(id);
  }

  private moveAll(c: number, ids: CardId[], to: Dest, makePublic: boolean, receiver: number) {
    const seat = this.state.ctxs[c].player;
    const p = this.state.players[receiver];
    if (receiver !== seat) this.tainted = true;
    const isPublic = makePublic || to === 'trash' || to === 'discard' || to === 'supply' || to === 'play';
    const moved: CardId[] = [];
    for (const id of ids) {
      if (!this.take(id)) continue;
      this.place(id, p, to);
      moved.push(id);
    }
    if (!moved.length) return;
    const kind = 'move:' + (typeof to === 'string' ? to : 'mat');
    if (isPublic) this.log({ seat, kind, keys: moved.map(this.key) });
    else {
      this.log({ seat, kind, count: moved.length });
      this.log({ seat, kind, keys: moved.map(this.key), to: seat });
      if (receiver !== seat) this.log({ seat, kind, keys: moved.map(this.key), to: receiver });
    }
    if (to === 'trash' || to === 'discard') for (let i = moved.length - 1; i >= 0; i--) this.fire(to, to === 'trash' ? seat : receiver, moved[i]);
  }

  private gain(c: number, pile: string | { var: string }, to: 'discard' | 'deck' | 'hand', receiver: number) {
    const s = this.state;
    const ctx = s.ctxs[c];
    let key: string | undefined;
    if (typeof pile === 'string') key = pile;
    else {
      const v = ctx.vars[pile.var];
      const first = Array.isArray(v) ? v[0] : undefined;
      key = typeof first === 'number' ? this.key(first) : first;
    }
    if (!key) return;
    const id = s.supply[key]?.pop();
    if (id === undefined) return;
    if (receiver !== ctx.player) this.tainted = true;
    this.place(id, s.players[receiver], to);
    this.log({ seat: receiver, kind: 'gain', keys: [key] });
    this.fire('gain', receiver, id);
  }

  /** Whether every seat can already see this card where it is now. */
  private inTheOpen(id: CardId): boolean {
    const s = this.state;
    return s.trash.includes(id) || s.limbo.some((l) => l.id === id && l.public) || s.players.some((p) => p.play.includes(id));
  }

  private gainCards(c: number, ids: CardId[], to: 'discard' | 'deck' | 'hand', receiver: number) {
    const s = this.state;
    if (receiver !== s.ctxs[c].player) this.tainted = true;
    const moved: CardId[] = [];
    for (const id of ids) {
      const open = this.inTheOpen(id);
      if (!this.take(id)) continue;
      this.place(id, s.players[receiver], to);
      moved.push(id);
      if (open) this.log({ seat: receiver, kind: 'gain', keys: [this.key(id)] });
      else {
        this.log({ seat: receiver, kind: 'gain', count: 1 });
        this.log({ seat: receiver, kind: 'gain', keys: [this.key(id)], to: receiver });
      }
    }
    for (let i = moved.length - 1; i >= 0; i--) this.fire('gain', receiver, moved[i]);
  }

  // Playing cards and reactions

  /** Play a card. Used for ordinary plays and for replays by another card. */
  private play(seat: number, card: CardId, holders: CardId[]) {
    const s = this.state;
    const p = s.players[seat];
    const def = this.def(card);
    // A card that has left play by the time it is replayed stays where it went, and its effects still happen.
    if (p.hand.includes(card) || s.limbo.some((l) => l.id === card)) {
      this.take(card);
      p.play.push(card);
    }
    this.log({ seat, kind: 'play', keys: [def.key] });
    if (def.types.includes('action')) s.turn.actionsPlayed++;
    const c = this.newCtx({ player: seat, source: card, holders });
    const frames: Frame[] = [];
    if (def.types.includes('attack')) frames.push({ k: 'react', ctx: c, seats: this.turnOrder().filter((x) => x !== seat) });
    if (def.coins) frames.push({ k: 'fx', ctx: c, fx: { op: 'coins', n: def.coins } });
    for (const fx of def.effects ?? []) frames.push({ k: 'fx', ctx: c, fx });
    this.push(frames);
    this.fire('play', seat, card);
  }

  /** Give each other player, in turn order, the chance to reveal reactions before the attack begins. */
  private react(f: Extract<Frame, { k: 'react' }>) {
    const s = this.state;
    this.tainted = true;
    const seats = [...f.seats];
    while (seats.length) {
      const seat = seats[0];
      const cards = s.players[seat].hand.filter((id) => this.def(id).reaction && !(this.def(id).reaction!.once && f.used?.includes(id)));
      if (cards.length) {
        s.stack.push({ ...f, seats });
        this.ask({ kind: 'react', seat, c: f.ctx, prompt: 'Reveal a reaction to this attack?', optional: true, min: 0, max: 1, cards });
        return;
      }
      seats.shift();
    }
  }

  // Triggers

  /** Find every trigger for an event and queue them, seat by seat in turn order. */
  private fire(event: EventName, seat: number, card: CardId | null) {
    const s = this.state;
    const eventDef = card === null ? null : this.def(card);
    const bySeat = new Map<number, TriggerRef[]>();
    const add = (holder: number, r: Omit<TriggerRef, 'player' | 'vars'>) => {
      const list = bySeat.get(holder) ?? [];
      list.push({ ...r, player: holder, vars: card === null ? {} : { event: [card] } });
      bySeat.set(holder, list);
    };
    const scan = (holder: number, id: CardId, where: 'play' | 'hand') => {
      for (const t of this.def(id).triggers ?? []) {
        if (t.on !== event || t.where !== where) continue;
        const scope = t.scope ?? 'own';
        if ((scope === 'own' && holder !== seat) || (scope === 'others' && holder === seat)) continue;
        if (eventDef && !matches(eventDef, t.filter)) continue;
        add(holder, { label: t.label, source: id, optional: t.optional, effects: t.effects });
      }
    };
    for (const holder of this.turnOrder()) {
      const p = s.players[holder];
      for (const id of p.play) scan(holder, id, 'play');
      for (const id of p.hand) scan(holder, id, 'hand');
    }
    if (card !== null)
      for (const t of eventDef!.triggers ?? [])
        if (t.on === event && t.where === 'self') add(seat, { label: t.label, source: card, optional: t.optional, effects: t.effects });
    const spent: unknown[] = [];
    for (const t of s.temps) {
      if (t.on !== event || t.player !== seat) continue;
      if (eventDef && !matches(eventDef, t.filter)) continue;
      add(t.player, { label: t.label, source: t.source, effects: t.effects });
      if (t.once) spent.push(t);
    }
    if (spent.length) s.temps = s.temps.filter((t) => !spent.includes(t));
    const frames: Frame[] = [];
    for (const holder of this.turnOrder()) {
      const list = bySeat.get(holder);
      if (list) frames.push({ k: 'triggers', seat: holder, list });
    }
    this.push(frames);
  }

  /** Run one seat's triggers. When several fire together, that player picks the order. */
  private triggers(f: Extract<Frame, { k: 'triggers' }>) {
    if (f.list.length === 0) return;
    if (f.list.length === 1) return this.runTrigger(f.list[0]);
    this.state.stack.push(f);
    this.ask({
      kind: 'order',
      seat: f.seat,
      c: -1,
      prompt: 'These effects happen at the same time. Which goes first?',
      optional: false,
      min: 1,
      max: 1,
      options: f.list.map((t) => t.label),
    });
  }

  private runTrigger(t: TriggerRef) {
    const c = this.newCtx({ player: t.player, source: t.source, vars: { ...t.vars }, holders: t.holders ?? [] });
    this.pushFx(c, t.optional ? [{ op: 'may', prompt: t.optional, then: t.effects }] : t.effects);
  }

  // Turn structure

  private cleanup() {
    const s = this.state;
    const seat = s.turn.seat;
    const p = s.players[seat];
    const held = new Set(s.delays.flatMap((d) => d.holds));
    const hand = p.hand.splice(0);
    const leaving = p.play.filter((id) => !held.has(id));
    p.play = p.play.filter((id) => held.has(id));
    p.discard.push(...hand, ...leaving);
    // Effects waiting for the new hand outlast the temps cleared here.
    const afterDeal = s.temps.filter((t) => t.on === 'hand-drawn' && t.player === seat);
    s.temps = [];
    s.turn.costMods = [];
    this.tainted = true;
    const c = this.newCtx({ player: seat });
    if (afterDeal.length) this.push([{ k: 'triggers', seat, list: afterDeal.map((t) => ({ label: t.label, source: t.source, player: seat, effects: t.effects, vars: {} })) }]);
    this.pushFx(c, [{ op: 'draw', n: this.lib.rules.handSize }]);
    for (let i = leaving.length - 1; i >= 0; i--) this.fire('discard', seat, leaving[i]);
    for (let i = hand.length - 1; i >= 0; i--) this.fire('discard', seat, hand[i]);
  }

  private gameEnds(): boolean {
    const s = this.state;
    const { endPiles, emptyPilesToEnd, emptyMarketPilesOnly, projectsToEnd } = this.lib.rules;
    if (endPiles.some((k) => s.supply[k]?.length === 0)) return true;
    if (projectsToEnd && s.projects.filter((p) => p.by !== null).length >= projectsToEnd(s.n)) return true;
    const piles = emptyMarketPilesOnly ? s.market.map((k) => s.supply[k]) : Object.values(s.supply);
    return piles.filter((p) => p.length === 0).length >= emptyPilesToEnd(s.n);
  }

  private nextTurn() {
    const s = this.state;
    s.players[s.turn.seat].turns++;
    if (this.gameEnds()) {
      s.over = true;
      s.stack = [];
      this.log({ seat: s.turn.seat, kind: 'game-over' });
      return;
    }
    this.beginTurn(s.extraTurns.length ? s.extraTurns.shift()! : (s.turn.seat + 1) % s.n);
  }

  beginTurn(seat: number) {
    const s = this.state;
    s.turn = { seat, number: s.turn.number + 1, phase: 'action', actions: 1, buys: 1, coins: 0, bought: false, costMods: [], actionsPlayed: 0, converted: 0, projectDiscount: { ...NO_DISCOUNT } };
    this.log({ seat, kind: 'turn' });
    for (const x of s.projects) x.surcharges = x.surcharges.filter((m) => m.by !== seat);
    const due = s.delays.filter((d) => d.player === seat);
    s.delays = s.delays.filter((d) => d.player !== seat);
    this.fire('turn-start', seat, null);
    if (due.length)
      this.push([
        {
          k: 'triggers',
          seat,
          list: due.map((d) => ({ label: d.label, source: d.source, player: d.player, effects: d.effects, vars: d.vars, holders: d.holds.filter((h) => h !== d.source) })),
        },
      ]);
  }

  // Actions and answers. module.ts validates all of these first.

  answer(cards: CardId[], pile: string | undefined, option: number | undefined, seat?: number) {
    const s = this.state;
    const q = s.pending!;
    s.pending = null;
    switch (q.kind) {
      case 'cards':
        s.ctxs[q.ctx].vars[q.as!] = cards;
        break;
      case 'pile':
        s.ctxs[q.ctx].vars[q.as!] = pile ? [pile] : [];
        break;
      case 'option':
        this.pushFx(q.ctx, q.branches![option!]);
        break;
      case 'player':
        s.ctxs[q.ctx].vars[q.as!] = seat!;
        break;
      case 'order': {
        const f = s.stack.at(-1) as Extract<Frame, { k: 'triggers' }>;
        const [first] = f.list.splice(option!, 1);
        this.runTrigger(first);
        break;
      }
      case 'react': {
        const f = s.stack.at(-1) as Extract<Frame, { k: 'react' }>;
        if (!cards.length) {
          f.seats = f.seats.filter((x) => x !== q.seat);
          break;
        }
        const def = this.def(cards[0]);
        if (def.reaction!.once) f.used = [...(f.used ?? []), cards[0]];
        this.log({ seat: q.seat, kind: 'reveal', keys: [def.key] });
        const c = this.newCtx({ player: q.seat, source: cards[0], parent: q.ctx });
        this.pushFx(c, def.reaction!.effects);
        break;
      }
    }
    this.run();
  }

  startPlay(seat: number, card: CardId) {
    this.push([{ k: 'play', seat, card, holders: [] }]);
    this.run();
  }

  /** Treasures go down one at a time in hand order, so one that asks a question pauses the rest. */
  startPlayTreasures(seat: number) {
    this.push([{ k: 'play-treasures', seat }]);
    this.run();
  }

  private playTreasures(f: Extract<Frame, { k: 'play-treasures' }>) {
    const next = this.state.players[f.seat].hand.find((id) => this.def(id).types.includes('treasure'));
    if (next === undefined) return;
    this.push([{ k: 'play', seat: f.seat, card: next, holders: [] }, f]);
  }

  /** Buy triggers name the card about to be gained, which is the top of its pile. */
  startBuy(seat: number, key: string) {
    this.log({ seat, kind: 'buy', keys: [key] });
    this.pushFx(this.newCtx({ player: seat }), [{ op: 'gain', pile: key }]);
    this.fire('buy', seat, this.state.supply[key].at(-1)!);
    this.run();
  }

  /** Turn one token into coins. module.ts has checked it is allowed. */
  convert(seat: number) {
    const { token, coinsEach } = this.lib.rules.convert!;
    this.state.turn.converted++;
    this.state.turn.coins += coinsEach;
    this.changeToken(seat, token, -1);
  }

  /** Pay for a project and run its reward, then anything waiting on the claim. module.ts has checked it is allowed. */
  claim(seat: number, key: string) {
    const s = this.state;
    const def = this.lib.rules.projects!.find((p) => p.key === key)!;
    const price = projectPrice(s, this.lib, key, seat);
    s.turn.buys--;
    s.turn.coins -= price.coins;
    for (const [t, n] of Object.entries(price.tokens)) this.changeToken(seat, t, -n);
    const here = s.projects.find((p) => p.key === key)!;
    const stage = nextStage(here);
    if (stage) {
      stage.by = seat;
      stage.onTurn = s.players[seat].turns;
      (s.turn.funded ??= []).push(key);
      if (nextStage(here)) {
        this.log({ seat, kind: 'fund', project: key, stage: [here.stages!.indexOf(stage) + 1, here.stages!.length] });
        return this.run();
      }
    }
    here.by = seat;
    here.onTurn = s.players[seat].turns;
    here.surcharges = [];
    this.log({ seat, kind: 'claim', project: key, ...(stage ? { stage: [here.stages!.length, here.stages!.length] as [number, number] } : {}) });
    this.fire('claim', seat, null);
    this.pushFx(this.newCtx({ player: seat }), def.effects);
    this.run();
  }

  endTurn() {
    this.push([{ k: 'turn-end' }, { k: 'cleanup' }, { k: 'next-turn' }]);
    this.run();
  }
}
