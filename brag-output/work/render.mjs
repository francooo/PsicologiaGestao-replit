// Renders video.html frame by frame through headless Chrome (CDP), 30fps.
// usage: node render.mjs <outDir> [fps] [duration] [onlyTimes comma list]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] ?? path.join(here, 'frames');
const fps = Number(process.argv[3] ?? 30);
const duration = Number(process.argv[4] ?? 21.25);
const only = process.argv[5] ? process.argv[5].split(',').map(Number) : null;
mkdirSync(outDir, { recursive: true });

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9333;
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(here, 'chrome-profile')}`,
  '--hide-scrollbars', '--window-size=1080,1920', '--force-device-scale-factor=1', '--no-first-run', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
  await sleep(200);
}
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (m) => m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(path.join(here, 'video.html')).href });
await sleep(800);
let ok;
for (let i = 0; i < 40; i++) {
  try { ok = await send('Runtime.evaluate', { expression: 'window.__ready', awaitPromise: true, returnByValue: true }); if (ok.result && ok.result.value !== undefined) break; } catch {}
  await sleep(250);
}
console.log('fonts ok:', ok?.result?.value);

const times = only ?? Array.from({ length: Math.round(duration * fps) }, (_, i) => i / fps);
for (let i = 0; i < times.length; i++) {
  const t = times[i];
  await send('Runtime.evaluate', { expression: `render(${t}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, awaitPromise: true });
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 } });
  const name = only ? `still_${t.toFixed(2)}.png` : `f${String(i).padStart(5, '0')}.png`;
  writeFileSync(path.join(outDir, name), Buffer.from(shot.data, 'base64'));
  if (i % 60 === 0) console.log('frame', i, '/', times.length);
}
ws.close(); proc.kill();
console.log('done', times.length);
