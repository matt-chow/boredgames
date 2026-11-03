/**
 * Wire protocol between the browser and a room Durable Object.
 * Shared by client and server; contains types and tiny pure helpers only.
 */
import type { OptionDescriptor, PlayerResult } from '../engine/types';

export const PROTOCOL_VERSION = 1;

/** Room codes: 6 characters from an alphabet without look-alikes (no 0/O, 1/I/L). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
export const MAX_NAME = 20;

export function normalizeCode(raw: string): string | null {
  const c = String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (c.length !== CODE_LENGTH) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}

/** Control, zero-width and bidi-override characters. */
const isInvisible = (c: number) =>
  c < 0x20 || (c >= 0x7f && c <= 0x9f) || (c >= 0x200b && c <= 0x200f) || (c >= 0x2028 && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069) || c === 0xfeff;

/** Trim, collapse whitespace, strip control characters. Returns null if empty/too long. */
export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const n = [...raw]
    .filter((ch) => !isInvisible(ch.codePointAt(0)!))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (!n || [...n].length > MAX_NAME) return null;
  return n;
}

export type RoomStatus = 'lobby' | 'playing' | 'over';

export interface SeatInfo {
  seat: number;
  name: string;
  connected: boolean;
  host: boolean;
  /** A computer player run by the server. */
  bot: boolean;
}

/** Everything a member needs to render the room. `game` is the module's projection for that member. */
export interface RoomView {
  code: string;
  gameId: string;
  gameName: string;
  status: RoomStatus;
  /** Monotonic; every committed change increments it. Clients echo it on actions. */
  version: number;
  you: number;
  seats: SeatInfo[];
  minPlayers: number;
  maxPlayers: number;
  config: Record<string, unknown>;
  options: OptionDescriptor[];
  /** Why the current config cannot start with the current seats (null = startable). */
  configError: string | null;
  canStart: boolean;
  canConfigure: boolean;
  /** The caller may seat a computer player now. */
  canAddBot: boolean;
  canUndo: boolean;
  actors: number[];
  game: unknown;
  results: PlayerResult[] | null;
}

export type ClientMsg =
  | { t: 'act'; id: string; v: number; a: unknown }
  | { t: 'undo'; id: string; v: number }
  | { t: 'config'; id: string; v: number; config: Record<string, unknown> }
  | { t: 'start'; id: string; v: number }
  | { t: 'kick'; id: string; v: number; seat: number }
  | { t: 'addBot'; id: string; v: number }
  | { t: 'leave'; id: string; v: number }
  | { t: 'rematch'; id: string; v: number }
  | { t: 'ping' };

export type ServerMsg =
  | { t: 'room'; room: RoomView }
  | { t: 'ack'; id: string; ok: true; v: number }
  | { t: 'ack'; id: string; ok: false; code: string; error: string; v: number }
  | { t: 'bye'; reason: string }
  | { t: 'pong' };

export interface CreateRoomResponse {
  code: string;
  seat: number;
}

export interface RoomSummary {
  code: string;
  gameId: string;
  gameName: string;
  status: RoomStatus;
  players: number;
  maxPlayers: number;
  /** The caller already holds a seat here (valid session cookie). */
  member: boolean;
  /** New players can take a seat. */
  joinable: boolean;
}

export interface ApiError {
  error: string;
  code: string;
}

/** Session cookie name for a room. The cookie is HttpOnly; scripts never see the credential. */
export const sessionCookie = (code: string) => `bg_${code}`;
