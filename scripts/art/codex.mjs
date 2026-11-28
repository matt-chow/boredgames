// Painting with Codex's built-in image tool (`codex exec`, the user's ChatGPT plan; no API key, no billing).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const GEN = join(homedir(), '.codex', 'generated_images');

const pngsSince = (t) =>
  existsSync(GEN)
    ? readdirSync(GEN).flatMap((d) => {
        const dir = join(GEN, d);
        if (!statSync(dir).isDirectory() || statSync(dir).mtimeMs < t - 1000) return [];
        return readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => join(dir, f)).filter((f) => statSync(f).mtimeMs >= t);
      }).sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
    : [];

/**
 * One Codex session paints a batch of [id, prompt] in order; pictures are matched to ids by the order they were saved.
 * Returns [id, png path] pairs, or [] if the count came back wrong.
 */
export function paint(items, refs) {
  const t = Date.now();
  const ids = items.map(([id]) => id);
  const refNote = refs.length
    ? `The attached image(s) are the locked style references for this game. Match their illustration style, palette, grain, outline weight, shading and level of detail exactly; take only the style from them, never their subject.\n\n`
    : '';
  const prompt =
    `You are producing illustrations for a board game. Use your built-in image generation tool once per item below, in this order, ` +
    `one separate image per item. Use each prompt exactly as given. Do not run shell commands and do not write files. ` +
    `After each image, print one line: DONE <item id>.\n\n${refNote}` +
    items.map(([id, p]) => `ITEM ${id}\n${p}`).join('\n\n');
  const args = ['exec', '-s', 'read-only', '--skip-git-repo-check', ...refs.flatMap((r) => ['-i', r]), '-'];
  const res = spawnSync('codex', args, { input: prompt, encoding: 'utf8', timeout: 25 * 60_000, maxBuffer: 64 << 20, shell: process.platform === 'win32' });
  const done = [...(res.stdout ?? '').matchAll(/^DONE (\S+)/gm)].map((m) => m[1]);
  // Codex prints its session id; that session's folder holds only this batch, even if another Codex is painting.
  const session = /session id:\s*([0-9a-f-]{36})/i.exec(`${res.stderr}${res.stdout}`)?.[1];
  const files = pngsSince(t).filter((p) => !session || p.includes(session));
  if (files.length !== ids.length) {
    console.error(`Expected ${ids.length} pictures, got ${files.length}. Codex said: ${(res.stdout ?? '').slice(-600)} ${(res.stderr ?? '').slice(-300)}`);
    return [];
  }
  if (done.length && done.join() !== ids.join()) console.warn(`Codex reported ${done.join()}; matching by order.`);
  return ids.map((id, i) => [id, files[i]]);
}
