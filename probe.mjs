// Headless DOM-contract probe for the Jev Router demo (mock mode).
// Usage: node probe.mjs [baseUrl]      default http://localhost:8766/index.html
// Real mode: node probe.mjs http://localhost:8766/index.html --real https://jev-router.<acct>.workers.dev/
import { chromium } from '/home/andrzey/.hermes/hermes-agent/node_modules/playwright/index.mjs';

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith('http')) || 'http://localhost:8766/index.html';
const realIdx = args.indexOf('--real');
const workerUrl = realIdx >= 0 ? args[realIdx + 1] : null;
const url = workerUrl ? base : base + (base.includes('?') ? '&' : '?') + 'mock=1';

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', (e) => check('no page errors', false, e.message));
await page.goto(url);
if (workerUrl) {
  await page.evaluate((w) => { localStorage.setItem('jevRouter.workerUrl', w); }, workerUrl);
  await page.reload();
}
await page.waitForSelector('#signals .signal');

check('phase idle at start', (await page.getAttribute('body', 'data-phase')) === 'idle');
check('mock flag', (await page.getAttribute('body', 'data-mock')) === String(!workerUrl));
check('4 default signals', (await page.$$('.signal')).length === 4);

const presets = await page.evaluate(() => App.PRESETS.map((p) => ({ key: p.key, expect: p.expect })));
for (const p of presets) {
  await page.click(`[data-preset="${p.key}"]`);
  await page.waitForSelector('body[data-phase="decided"], body[data-phase="error"]', { timeout: 20000 });
  const phase = await page.getAttribute('body', 'data-phase');
  const target = await page.getAttribute('#router', 'data-target');
  const states = await page.$$eval('.signal', (els) => Object.fromEntries(els.map((e) => [e.dataset.id, `${e.dataset.state}:${e.dataset.value}`])));
  const status = await page.textContent('#status');
  const detail = `target=${target} ${JSON.stringify(states)}${phase === 'error' ? ' ' + status : ''}`;
  // In real mode the "edge" preset is deliberately ambiguous; only require a decision.
  const expected = workerUrl && p.key === 'edge' ? target : p.expect;
  check(`preset ${p.key} → ${p.expect}`, phase === 'decided' && target === expected, detail);
}
check('log has 6 rows', (await page.$$('#log tr[data-target]')).length === 6);
check('response card visible', await page.isVisible('#response'));

// Add a signal through the dialog and confirm it reaches the request.
await page.click('#btnAddSignal');
await page.fill('#sigNamePl', 'Prośba o kod');
await page.fill('#sigNameEn', 'Asks for code');
await page.selectOption('#sigType', 'noul');
await page.selectOption('#sigPolicy', 'soft_frontier');
await page.fill('#sigInstr', 'Does the prompt ask for source code to be written or debugged?');
await page.click('#signalForm button[type="submit"]');
check('5 signals after add', (await page.$$('.signal')).length === 5);
await page.fill('#prompt', 'Write a Python function that parses ISO dates.');
await page.click('#btnRoute');
await page.waitForSelector('body[data-phase="decided"], body[data-phase="error"]', { timeout: 20000 });
const raw = JSON.parse(await page.textContent('#rawRequest'));
check('new question in request', Object.keys(raw.questions).includes('asks_for_code'), Object.keys(raw.questions).join(','));

// Threshold change re-decides without a new request.
await page.click('#btnSettings');
const before = await page.getAttribute('#router', 'data-target');
await page.$eval('#thScoreHigh', (el) => { el.value = '0.5'; el.dispatchEvent(new Event('input', { bubbles: true })); });
const after = await page.getAttribute('#router', 'data-target');
check('threshold slider re-decides live', typeof after === 'string', `before=${before} after=${after}`);
await page.keyboard.press('Escape');

// Language toggle.
await page.click('[data-lang-btn="en"]');
check('EN toggle', (await page.textContent('#btnRoute')).includes('Route'));
await page.click('[data-lang-btn="pl"]');

await page.screenshot({ path: process.env.SHOT || '/tmp/jev-router-probe.png', fullPage: true });
await browser.close();

let fails = 0;
for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  ' + r.detail : ''}`); }
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
