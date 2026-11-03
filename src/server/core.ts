import type { AnyGameModule } from '../engine/types';
import { GAMES } from '../games/registry';
import {
  normalizeName,
  type ClientMsg,
  type RoomStatus,
  type RoomSummary,
  type RoomView,
} from '../shared/protocol';

/**
 * Room lifecycle and synchronization rules, independent of Cloudflare.
 * The Durable Object supplies a synchronous store (SQLite) and connection
 * info; tests supply an in-memory store.
 */

export const ROOM_SCHEMA = 1;
export const RETENTION_MS: Record<RoomStatus, number> = {
  lobby: 24 * 3600_000,
  playing: 30 * 24 * 3600_000,
  over: 7 * 24 * 3600_000,
};
const KEEP_ACTION_IDS = 256;
/** Bot seats carry this prefix instead of a token hash. Real hashes are hex, so they can never collide. */
const BOT_PREFIX = 'bot:';
const BOT_NAMES = ['Bot Ada', 'Bot Bix', 'Bot Cog', 'Bot Dot', 'Bot Elo', 'Bot Fig'];
export const isBot = (th: string) => th.startsWith(BOT_PREFIX);
const MAX_ACTION_ID = 64;

export interface RoomMeta {
  schema: number;
  code: string;
  gameId: string;
  status: RoomStatus;
  version: number;
  /** Token hash of the host seat; survives lobby renumbering. */
  hostTh: string;
  config: Record<string, unknown>;
  seed: string | null;
  stateVersion: number;
  createdAt: number;
  updatedAt: number;
}

export interface SeatRow {
  /** SHA-256 of the session token (hex), or a bot id. The token itself is never stored. */
  th: string;
  name: string;
  joinedAt: number;
}

export interface UndoRow {
  seat: number;
  /** Room version produced by the undoable action. */
  version: number;
  state: unknown;
}

export interface ActionRecord {
  key: string;
  ok: boolean;
  code: string;
  error: string;
  v: number;
}

export interface HistoryRow {
  version: number;
  seat: number;
  kind: string;
  data: string;
  at: number;
}

export interface RoomStore {
  getMeta(): RoomMeta | null;
  putMeta(m: RoomMeta): void;
  getSeats(): SeatRow[];
  putSeats(rows: SeatRow[]): void;
  getState(): unknown | null;
  putState(s: unknown | null): void;
  getUndo(): UndoRow | null;
  putUndo(u: UndoRow | null): void;
  getAction(key: string): ActionRecord | null;
  putAction(r: ActionRecord, keep: number): void;
  appendHistory(h: HistoryRow): void;
  /** Run `fn` atomically. */
  transaction<T>(fn: () => T): T;
}

export class RoomError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type Ack = { ok: true } | { ok: false; code: string; error: string };

export interface HandleResult {
  /** Reply to the sender. Null for messages that need no ack (ping). */
  ack: (Ack & { id: string; v: number }) | null;
  /** State changed: broadcast fresh views to everyone. */
  changed: boolean;
  /** Token hashes whose sockets must be closed (kicked or left). */
  evict: string[];
  /** Someone quit a game in progress: the room ends for everyone and is deleted. Holds the quitter's name. */
  end?: string;
}

export interface CoreOptions {
  now: () => number;
  seed: () => string;
}

export class RoomCore {
  private meta: RoomMeta;
  private seats: SeatRow[];
  private state: unknown | null;
  private loadedState = false;

  constructor(
    private store: RoomStore,
    private opts: CoreOptions,
  ) {
    const m = store.getMeta();
    if (!m) throw new RoomError('no-room', 'Room not found.', 404);
    this.meta = m;
    this.seats = store.getSeats();
    this.state = null;
  }

  static exists(store: RoomStore) {
    return store.getMeta() !== null;
  }

  static create(
    store: RoomStore,
    opts: CoreOptions,
    init: { code: string; gameId: string; name: string; th: string; bots?: number },
  ): RoomCore {
    if (store.getMeta()) throw new RoomError('exists', 'Room code already in use.', 409);
    const game = GAMES[init.gameId];
    if (!game) throw new RoomError('bad-game', 'Unknown game.');
    const name = normalizeName(init.name);
    if (!name) throw new RoomError('bad-name', 'Enter a display name (1–20 characters).');
    const now = opts.now();
    store.transaction(() => {
      store.putMeta({
        schema: ROOM_SCHEMA,
        code: init.code,
        gameId: init.gameId,
        status: 'lobby',
        version: 1,
        hostTh: init.th,
        config: game.defaultConfig(game.meta.minPlayers) as Record<string, unknown>,
        seed: null,
        stateVersion: game.meta.stateVersion,
        createdAt: now,
        updatedAt: now,
      });
      store.putSeats([{ th: init.th, name, joinedAt: now }]);
      store.appendHistory({ version: 1, seat: 0, kind: 'create', data: '{}', at: now });
    });
    const core = new RoomCore(store, opts);
    const bots = Math.min(Number.isInteger(init.bots) ? init.bots! : 0, game.meta.maxPlayers - 1);
    for (let i = 0; i < bots; i++) core.seatBot(0);
    return core;
  }

  get game(): AnyGameModule {
    return GAMES[this.meta.gameId];
  }
  get status() {
    return this.meta.status;
  }
  get version() {
    return this.meta.version;
  }
  get code() {
    return this.meta.code;
  }
  get updatedAt() {
    return this.meta.updatedAt;
  }
  get seatCount() {
    return this.seats.length;
  }

  /** When the room's data should be deleted if nothing else happens. */
  get expiresAt() {
    return this.meta.updatedAt + RETENTION_MS[this.meta.status];
  }

  seatOf(th: string | null): number {
    if (!th) return -1;
    return this.seats.findIndex((s) => s.th === th);
  }

  isBotSeat(seat: number) {
    const s = this.seats[seat];
    return !!s && isBot(s.th);
  }

  get hostSeat() {
    return Math.max(0, this.seatOf(this.meta.hostTh));
  }

  private getState(): unknown {
    if (!this.loadedState) {
      let s = this.store.getState();
      if (s !== null && this.meta.stateVersion !== this.game.meta.stateVersion) {
        if (!this.game.migrate) throw new RoomError('migrate', 'Saved game is from an incompatible version.', 500);
        s = this.game.migrate(s, this.meta.stateVersion);
        this.meta.stateVersion = this.game.meta.stateVersion;
        this.store.transaction(() => {
          this.store.putState(s);
          this.store.putMeta(this.meta);
        });
      }
      this.state = s;
      this.loadedState = true;
    }
    return this.state;
  }

  summary(th: string | null): RoomSummary {
    const member = this.seatOf(th) >= 0;
    return {
      code: this.meta.code,
      gameId: this.meta.gameId,
      gameName: this.game.meta.name,
      status: this.meta.status,
      players: this.seats.length,
      maxPlayers: this.game.meta.maxPlayers,
      member,
      joinable: member || (this.meta.status === 'lobby' && this.seats.length < this.game.meta.maxPlayers),
    };
  }

  /** Take a seat (or return the caller's existing seat). */
  join(nameRaw: unknown, th: string): number {
    const existing = this.seatOf(th);
    if (existing >= 0) return existing;
    if (this.meta.status !== 'lobby') throw new RoomError('started', 'This game has already started.', 409);
    if (this.seats.length >= this.game.meta.maxPlayers) throw new RoomError('full', 'This room is full.', 409);
    const name = normalizeName(nameRaw);
    if (!name) throw new RoomError('bad-name', 'Enter a display name (1–20 characters).');
    if (this.seats.some((s) => s.name.toLowerCase() === name.toLowerCase()))
      throw new RoomError('name-taken', 'Someone in this room already uses that name.', 409);
    this.seats.push({ th, name, joinedAt: this.opts.now() });
    this.commit('join', this.seats.length - 1, {}, { seats: true });
    return this.seats.length - 1;
  }

  view(seat: number, connected: Set<number>): RoomView {
    const g = this.game;
    const n = this.seats.length;
    const state = this.meta.status === 'lobby' ? null : this.getState();
    const configError = this.meta.status === 'lobby' ? this.startProblem() : null;
    const undo = this.store.getUndo();
    return {
      code: this.meta.code,
      gameId: this.meta.gameId,
      gameName: g.meta.name,
      status: this.meta.status,
      version: this.meta.version,
      you: seat,
      seats: this.seats.map((s, i) => ({
        seat: i,
        name: s.name,
        connected: isBot(s.th) || connected.has(i),
        host: i === this.hostSeat,
        bot: isBot(s.th),
      })),
      minPlayers: g.meta.minPlayers,
      maxPlayers: g.meta.maxPlayers,
      config: { ...this.meta.config },
      options: g.options,
      configError,
      canStart: this.meta.status === 'lobby' && !configError && this.mayManage(seat, connected),
      canConfigure: this.meta.status === 'lobby' && this.mayManage(seat, connected),
      canAddBot: this.meta.status === 'lobby' && !!g.bot && n < g.meta.maxPlayers && this.mayManage(seat, connected),
      canUndo:
        this.meta.status === 'playing' && !!undo && undo.seat === seat && undo.version === this.meta.version,
      actors: state ? g.actors(state) : [],
      game: state ? g.project(state, seat >= 0 && seat < n ? seat : null) : null,
      results: state ? g.results(state) : null,
    };
  }

  /** The host manages the lobby; if the host is offline, any connected member may. */
  private mayManage(seat: number, connected: Set<number>) {
    if (seat < 0) return false;
    return seat === this.hostSeat || !connected.has(this.hostSeat);
  }

  private startProblem(): string | null {
    const g = this.game;
    const n = this.seats.length;
    if (n < g.meta.minPlayers) return `Waiting for players: ${g.meta.name} needs at least ${g.meta.minPlayers}.`;
    if (n > g.meta.maxPlayers) return `${g.meta.name} allows at most ${g.meta.maxPlayers} players.`;
    return g.validateConfig(this.meta.config, n);
  }

  handle(seat: number, raw: unknown, connected: Set<number>): HandleResult {
    const none: HandleResult = { ack: null, changed: false, evict: [] };
    if (!raw || typeof raw !== 'object') return none;
    const msg = raw as ClientMsg;
    if (msg.t === 'ping') return none;
    const id = typeof (msg as { id?: unknown }).id === 'string' ? (msg as { id: string }).id.slice(0, MAX_ACTION_ID) : '';
    if (!id) return none;
    const key = `${seat}:${id}`;
    // Duplicate delivery (retry after a dropped ack): replay the original outcome.
    const prior = this.store.getAction(key);
    if (prior) {
      const ack = prior.ok
        ? { id, ok: true as const, v: this.meta.version }
        : { id, ok: false as const, code: prior.code, error: prior.error, v: this.meta.version };
      return { ack, changed: false, evict: [] };
    }
    // Quitting a game in progress ends it for everyone; it does not depend on the table, so it is never stale.
    if (msg.t === 'leave' && this.meta.status === 'playing')
      return { ack: { id, v: this.meta.version, ok: true }, changed: false, evict: [], end: this.seats[seat].name };
    let evict: string[] = [];
    let result: Ack;
    try {
      const v = (msg as { v?: unknown }).v;
      if (typeof v !== 'number' || v !== this.meta.version)
        throw new RoomError('stale', 'The table changed before your move arrived. Check the table and try again.');
      evict = this.dispatch(seat, msg, connected);
      result = { ok: true };
    } catch (e) {
      if (!(e instanceof RoomError)) throw e;
      result = { ok: false, code: e.code, error: e.message };
    }
    // Stale rejections are not recorded: the same id may be retried with a fresh version.
    if (result.ok || result.code !== 'stale')
      this.store.putAction({ key, ok: result.ok, code: result.ok ? '' : result.code, error: result.ok ? '' : result.error, v: this.meta.version }, KEEP_ACTION_IDS);
    return { ack: { id, v: this.meta.version, ...result }, changed: result.ok, evict };
  }

  private dispatch(seat: number, msg: ClientMsg, connected: Set<number>): string[] {
    switch (msg.t) {
      case 'act':
        this.act(seat, msg.a);
        return [];
      case 'addBot': {
        if (this.meta.status !== 'lobby') throw new RoomError('started', 'Bots can only join before the game starts.');
        this.requireManage(seat, connected);
        this.seatBot(seat);
        return [];
      }
      case 'undo': {
        const u = this.store.getUndo();
        if (this.meta.status !== 'playing' || !u || u.seat !== seat || u.version !== this.meta.version)
          throw new RoomError('no-undo', 'There is nothing you can undo right now.');
        this.state = u.state;
        this.commit('undo', seat, {}, { state: true, undo: null });
        return [];
      }
      case 'config': {
        this.requireManage(seat, connected);
        const c = msg.config;
        if (!c || typeof c !== 'object' || Array.isArray(c)) throw new RoomError('bad-request', 'Invalid options.');
        const clean: Record<string, unknown> = {};
        for (const o of this.game.options) if (typeof c[o.key] === 'boolean') clean[o.key] = c[o.key];
        const next = { ...this.meta.config, ...clean };
        // Never accept an option that can't be played (e.g. the Duel).
        for (const o of this.game.options)
          if (o.unavailableReason && next[o.key]) throw new RoomError('unavailable', o.unavailableReason);
        this.meta.config = next;
        this.commit('config', seat, clean, {});
        return [];
      }
      case 'start': {
        this.requireManage(seat, connected);
        const problem = this.startProblem();
        if (problem) throw new RoomError('cannot-start', problem);
        const seed = this.opts.seed();
        this.state = this.game.setup({ playerCount: this.seats.length, seed, config: this.meta.config });
        this.loadedState = true;
        this.meta.seed = seed;
        this.meta.status = 'playing';
        this.meta.stateVersion = this.game.meta.stateVersion;
        this.commit('start', seat, {}, { state: true, undo: null });
        return [];
      }
      case 'rematch': {
        if (this.meta.status !== 'over') throw new RoomError('not-over', 'The game is still in progress.');
        this.state = null;
        this.meta.status = 'lobby';
        this.meta.seed = null;
        this.commit('rematch', seat, {}, { state: true, undo: null });
        return [];
      }
      case 'kick': {
        if (this.meta.status !== 'lobby') throw new RoomError('started', 'Players can only be removed before the game starts.');
        this.requireManage(seat, connected);
        const target = msg.seat;
        if (!Number.isInteger(target) || target < 0 || target >= this.seats.length || target === seat)
          throw new RoomError('bad-request', 'Choose another player.');
        const [gone] = this.seats.splice(target, 1);
        this.commit('kick', seat, { target }, { seats: true });
        return [gone.th];
      }
      case 'leave': {
        if (this.meta.status !== 'lobby')
          throw new RoomError('started', 'The game is over. Go back to the hub, or stay for a rematch.');
        const [gone] = this.seats.splice(seat, 1);
        if (gone.th === this.meta.hostTh) this.meta.hostTh = this.seats.find((s) => !isBot(s.th))?.th ?? '';
        this.commit('leave', seat, {}, { seats: true });
        return [gone.th];
      }
      default:
        throw new RoomError('bad-request', 'Unknown message.');
    }
  }

  private act(seat: number, a: unknown) {
    if (this.meta.status !== 'playing') throw new RoomError('not-playing', 'The game is not in progress.');
    const r = this.game.apply(this.getState(), seat, a);
    if (!r.ok) throw new RoomError(r.code, r.error);
    const prev = this.state;
    this.state = r.state;
    const over = this.game.isOver(r.state);
    if (over) this.meta.status = 'over';
    const undoable = r.undoable && !over && !this.isBotSeat(seat);
    this.commit('act', seat, a, { state: true, undo: undoable ? { seat, version: this.meta.version + 1, state: prev } : null });
  }

  private seatBot(by: number) {
    if (!this.game.bot) throw new RoomError('no-bots', 'This game has no computer players.');
    if (this.seats.length >= this.game.meta.maxPlayers) throw new RoomError('full', 'This room is full.', 409);
    const taken = new Set(this.seats.map((s) => s.name));
    const name = BOT_NAMES.find((x) => !taken.has(x)) ?? 'Bot ' + (this.seats.length + 1);
    let id = 0;
    while (this.seats.some((s) => s.th === BOT_PREFIX + id)) id++;
    this.seats.push({ th: BOT_PREFIX + id, name, joinedAt: this.opts.now() });
    this.commit('addBot', by, {}, { seats: true });
  }

  /**
   * The soonest computer-player move, if a bot seat has something to do. Each
   * bot decides from its own projection only. Null when no bot needs to act.
   */
  nextBot(): { seat: number; actions: unknown[]; delayMs: number } | null {
    const bot = this.game.bot;
    if (this.meta.status !== 'playing' || !bot) return null;
    const state = this.getState();
    let next: { seat: number; actions: unknown[]; delayMs: number } | null = null;
    for (const seat of this.game.actors(state)) {
      if (!this.isBotSeat(seat)) continue;
      const move = bot(this.game.project(state, seat));
      if (move?.actions.length && (!next || move.delayMs < next.delayMs)) next = { seat, ...move };
    }
    return next;
  }

  /** Apply the first legal candidate of the next bot move. False if none was legal. */
  playBot(): boolean {
    const move = this.nextBot();
    if (!move) return false;
    for (const a of move.actions) {
      try {
        this.act(move.seat, a);
        return true;
      } catch (e) {
        if (!(e instanceof RoomError)) throw e;
      }
    }
    return false;
  }

  private requireManage(seat: number, connected: Set<number>) {
    if (!this.mayManage(seat, connected))
      throw new RoomError('not-host', 'Only the host can change the room (anyone can if the host is offline).');
  }

  /** Atomically persist a committed change and bump the version. */
  private commit(kind: string, seat: number, data: unknown, what: { seats?: boolean; state?: boolean; undo?: UndoRow | null }) {
    this.meta.version++;
    this.meta.updatedAt = this.opts.now();
    this.store.transaction(() => {
      this.store.putMeta(this.meta);
      if (what.seats) this.store.putSeats(this.seats);
      if (what.state) this.store.putState(this.state);
      // Any other commit invalidates an outstanding undo simply by bumping the version.
      if (what.undo !== undefined) this.store.putUndo(what.undo);
      this.store.appendHistory({ version: this.meta.version, seat, kind, data: JSON.stringify(data ?? {}), at: this.meta.updatedAt });
    });
  }
}

/** In-memory store for tests and local tooling. */
export class MemoryStore implements RoomStore {
  meta: RoomMeta | null = null;
  seats: SeatRow[] = [];
  state: unknown | null = null;
  undo: UndoRow | null = null;
  actions = new Map<string, ActionRecord>();
  history: HistoryRow[] = [];
  private clone = <T>(x: T): T => (x === null || x === undefined ? x : structuredClone(x));
  getMeta = () => this.clone(this.meta);
  putMeta = (m: RoomMeta) => void (this.meta = this.clone(m));
  getSeats = () => this.clone(this.seats);
  putSeats = (r: SeatRow[]) => void (this.seats = this.clone(r));
  getState = () => this.clone(this.state);
  putState = (s: unknown) => void (this.state = this.clone(s));
  getUndo = () => this.clone(this.undo);
  putUndo = (u: UndoRow | null) => void (this.undo = this.clone(u));
  getAction = (k: string) => this.actions.get(k) ?? null;
  putAction = (r: ActionRecord, keep: number) => {
    this.actions.set(r.key, r);
    while (this.actions.size > keep) this.actions.delete(this.actions.keys().next().value!);
  };
  appendHistory = (h: HistoryRow) => void this.history.push(h);
  transaction<T>(fn: () => T): T {
    const snap = this.clone({ meta: this.meta, seats: this.seats, state: this.state, undo: this.undo, h: this.history.length });
    try {
      return fn();
    } catch (e) {
      Object.assign(this, { meta: snap.meta, seats: snap.seats, state: snap.state, undo: snap.undo });
      this.history.length = snap.h;
      throw e;
    }
  }
}
