import { load, save } from './storage';

/** Room codes this browser has joined (codes are not credentials; the cookie is). */
const KEY = 'bg.recent';
const MAX = 6;

export function recentRooms(): string[] {
  return load<{ codes: string[] }>(KEY, { codes: [] }).codes.filter((c) => typeof c === 'string');
}

export function rememberRoom(code: string) {
  save(KEY, { codes: [code, ...recentRooms().filter((c) => c !== code)].slice(0, MAX) });
}

export function forgetRoom(code: string) {
  save(KEY, { codes: recentRooms().filter((c) => c !== code) });
}
