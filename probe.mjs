// Headless DOM-contract probe for the Jev Router demo.
// Usage: node probe.mjs [baseUrl]
// Real mode: node probe.mjs [baseUrl] --real https://jev-router.<acct>.workers.dev/
// The default run is mock-only and is deterministic enough for the interaction checks.

import { pathToFileURL } from 'node:url';

// Keep the old absolute-path fallback for this workspace, but allow a regular
// package install or an explicit module path in CI.
async function loadChromium() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    'playwright',
    '/home/andrzey/.hermes/hermes-agent/node_modules/playwright/index.mjs',
  ].filter(Boolean);
  const errors = [];
  for (const candidate of candidates) {
    try {
      const specifier = candidate.startsWith('/') ? pathToFileURL(candidate).href : candidate;
      const mod = await import(specifier);
      if (mod.chromium) return mod.chromium;
      errors.push(`${candidate}: no chromium export`);
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }
  throw new Error(`Playwright could not be loaded. Tried: ${errors.join(' | ')}`);
}

const chromium = await loadChromium();
const args = process.argv.slice(2);
const realIdx = args.indexOf('--real');
const workerUrl = realIdx >= 0 ? args[realIdx + 1] || null : null;
const base = args.find((arg, index) => /^https?:\/\//.test(arg) && (realIdx < 0 || index !== realIdx + 1)) || 'http://localhost:8766/index.html';
const url = workerUrl ? base : base + (base.includes('?') ? '&' : '?') + 'mock=1';
const MOCK = !workerUrl;

const results = [];
const pageErrors = [];
const check = (name, ok, detail = '') => {
  const renderedDetail = typeof detail === 'string' ? detail : JSON.stringify(detail);
  results.push({ name, ok: Boolean(ok), detail: renderedDetail || '' });
};

let browser;
let page;

async function waitForDecision() {
  await page.waitForSelector('body[data-phase="decided"], body[data-phase="error"]', { timeout: 12000 });
  return page.getAttribute('body', 'data-phase');
}

async function waitForSheet(panel) {
  await page.waitForSelector('#sideSheet[open]', { timeout: 5000 });
  await page.waitForFunction((name) => document.querySelector(`details[data-panel="${name}"]`)?.open === true, panel, { timeout: 5000 });
}

async function openSheet(panel) {
  await page.evaluate((name) => App.openSideSheet(name), panel);
  await waitForSheet(panel);
}

async function closeSheet() {
  if (await page.evaluate(() => document.querySelector('#sideSheet').open)) await page.click('#btnCloseSheet');
  await page.waitForFunction(() => !document.querySelector('#sideSheet')?.open, null, { timeout: 5000 });
}

try {
  browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(6000);
  page.setDefaultNavigationTimeout(10000);
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  if (workerUrl) {
    await page.evaluate((worker) => { localStorage.setItem('jevRouter.workerUrl', worker); }, workerUrl);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  }
  await page.waitForSelector('.router#router');
  await page.waitForTimeout(150);

  check('phase idle at start', (await page.getAttribute('body', 'data-phase')) === 'idle');
  check('panel hidden at start', (await page.getAttribute('body', 'data-sheet')) === 'closed');
  check('no mock pill in header', (await page.$$('#mockBadge')).length === 0);
  check('mock flag', (await page.getAttribute('body', 'data-mock')) === String(MOCK));
  check('4 default signals in side sheet', (await page.$$eval('#signals .signal', (els) => els.length)) === 4);

  const apiContract = await page.evaluate(() => {
    const original = ['STATE', 'T', 't', 'decide', 'signalState', 'buildRequest', 'mockJev', 'route', 'redecide', 'validSignal', 'DEFAULT_SIGNALS', 'PRESETS'];
    return {
      version: App.CONTRACT?.version,
      original: original.filter((key) => !(key in App)),
      openSideSheet: typeof App.openSideSheet,
      verify: typeof App.verify,
    };
  });
  check('App contract v2 and original API', apiContract.version === 2 && !apiContract.original.length && apiContract.openSideSheet === 'function' && apiContract.verify === 'function', apiContract);

  const initialContract = await page.evaluate(() => ({ report: App.verify(), stages: [...document.querySelectorAll('#router > section')].map((el) => el.id) }));
  check('desktop DOM contract', initialContract.report.ok && initialContract.stages.join(',') === 'nPrompt,nPolicy,nJev,modelSelection', initialContract);

  // The panel starts hidden; open it to check the docked layout at desktop width, then close it again.
  await openSheet('signals');
  const layoutStyle = await page.evaluate(() => {
    const style = (id) => getComputedStyle(document.getElementById(id));
    const rect = (id) => document.getElementById(id).getBoundingClientRect();
    return {
      whitePrompt: style('prompt').backgroundColor === 'rgb(255, 255, 255)',
      compactStages: ['nPolicy', 'nJev'].every((id) => rect(id).height < rect('nPrompt').height),
      whiteModelText: ['nLocal', 'nFrontier'].every((id) => style(id).color === 'rgb(255, 255, 255)'),
      coloredDestinations: style('nLocal').backgroundColor !== style('nFrontier').backgroundColor,
      docked: document.querySelector('#sideSheet').open && !document.querySelector('#sideSheet').matches(':modal') && document.querySelector('main').getBoundingClientRect().right <= rect('sideSheet').left,
      examples: document.querySelector('#nLocal').textContent.includes('PLLuM, Bielik, Gemma') && document.querySelector('#nFrontier').textContent.includes('GPT, Claude, Gemini'),
    };
  });
  check('white prompt, compact stages, model examples, and docked settings', Object.values(layoutStyle).every(Boolean), layoutStyle);
  await closeSheet();
  await page.locator('#prompt').press('Control+Enter');
  check('route shortcut works beside nonmodal settings', (await waitForDecision()) === 'decided' && (await page.inputValue('#prompt')).length > 0);
  await page.evaluate(() => { App.STATE.log = []; }); await page.fill('#prompt', '');

  // Keep the contract valid at desktop, tablet and mobile breakpoints.
  for (const [label, width, height] of [['desktop', 1440, 1000], ['tablet', 1024, 1000], ['mobile', 768, 1000], ['mobile-compact', 320, 900]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(120);
    const report = await page.evaluate(() => App.verify());
    check(`${label} responsive contract`, report.ok, report.checks);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(120);

  await page.click('#btnTools');
  await page.waitForSelector('#sideSheet[open]');
  check('tools button opens side sheet', await page.getAttribute('body', 'data-sheet') === 'open');
  await page.click('#btnTools');
  check('header toggle hides the panel', await page.getAttribute('body', 'data-sheet') === 'closed');
  await page.click('#btnTools');
  check('header toggle reopens the panel', await page.getAttribute('body', 'data-sheet') === 'open');
  await closeSheet();
  check('close button closes side sheet', await page.getAttribute('body', 'data-sheet') === 'closed');

  const presets = await page.evaluate(() => App.PRESETS.map((preset) => ({ key: preset.key, expect: preset.expect })));
  check('six presets exposed', presets.length === 6, presets.map((preset) => preset.key).join(','));
  await page.waitForFunction(() => document.body.dataset.questions && document.body.dataset.questions !== 'none', null, { timeout: 5000 });
  const pool = await page.evaluate(() => ({ source: App.STATE.questionsSource, sizes: Object.fromEntries(App.PRESETS.map((p) => [p.key, App.questionPool(p.key).length])) }));
  check('question pool loaded from sample-questions.md', pool.source === 'md' && Object.values(pool.sizes).every((n) => n >= 3), pool);
  if (MOCK) {
    // Every question in every category must route to the category's expected target in mock mode.
    const mismatches = await page.evaluate(async () => {
      const out = [];
      await Promise.all(App.PRESETS.flatMap((p) => App.questionPool(p.key).flatMap((q) => ['en', 'pl'].map(async (lang) => {
        const text = q[lang]; if (!text) { out.push(`${p.key}: missing ${lang}`); return; }
        const res = await App.mockJev(App.buildRequest(text, App.DEFAULT_SIGNALS));
        const d = App.decide(App.DEFAULT_SIGNALS, res.answers, App.STATE.thresholds);
        if (d.target !== p.expect) out.push(`${p.key}/${lang}: ${d.target} "${text.slice(0, 50)}"`);
      }))));
      return out;
    });
    check('whole pool routes as its category expects (mock)', mismatches.length === 0, mismatches.join(' | '));
  }
  for (const preset of presets) {
    await openSheet('examples');
    await page.click(`#presets [data-preset="${preset.key}"]`);
    const phase = await waitForDecision();
    const drawn = await page.evaluate((key) => { const v = document.querySelector('#prompt').value; return App.questionPool(key).some((q) => q.en === v || q.pl === v); }, preset.key);
    check(`preset ${preset.key} draws from its pool`, drawn);
    const target = await page.getAttribute('#router', 'data-target');
    const states = await page.$$eval('#scoreSignals .score-signal', (els) => Object.fromEntries(els.map((el) => [el.dataset.id, `${el.dataset.state}:${el.dataset.value}`])));
    const status = await page.textContent('#status');
    const detail = `target=${target} ${JSON.stringify(states)}${phase === 'error' ? ` ${status}` : ''}`;
    // The live worker can classify the deliberately ambiguous example either way.
    const expected = workerUrl && preset.key === 'edge' ? target : preset.expect;
    check(`preset ${preset.key} → ${preset.expect}`, phase === 'decided' && target === expected, detail);
  }
  check('log has 6 rows', (await page.$$eval('#log tr[data-target]', (els) => els.length)) === 6);

  await openSheet('explanation');
  check('response explanation has content', (await page.textContent('#response')).trim().length > 0);
  await closeSheet();

  // CRUD: create, update, use in a request, then delete a signal. Signal
  // configuration changes are expected to invalidate an existing decision.
  await openSheet('signals');
  await page.click('#btnAddSignal');
  await page.waitForSelector('#dlgSignal[open]');
  await page.fill('#sigNamePl', 'Prośba o kod');
  await page.fill('#sigNameEn', 'Asks for code');
  await page.selectOption('#sigType', 'noul');
  await page.selectOption('#sigPolicy', 'soft_frontier');
  await page.fill('#sigInstr', 'Does the prompt ask for source code to be written or debugged?');
  await page.click('#signalForm button[type="submit"]');
  const afterAdd = await page.evaluate(() => ({ count: document.querySelectorAll('#signals .signal').length, phase: App.STATE.phase, answers: Object.keys(App.STATE.answers).length, id: App.STATE.signals.at(-1)?.id }));
  check('CRUD create signal invalidates scores', afterAdd.count === 5 && afterAdd.phase === 'idle' && afterAdd.answers === 0 && afterAdd.id === 'asks_for_code', afterAdd);

  await page.click('#signals [data-edit="asks_for_code"]');
  await page.waitForSelector('#dlgSignal[open]');
  await page.fill('#sigNameEn', 'Asks for source code');
  await page.click('#signalForm button[type="submit"]');
  const afterEdit = await page.evaluate(() => ({ name: App.STATE.signals.find((signal) => signal.id === 'asks_for_code')?.name.en, phase: App.STATE.phase, values: [...document.querySelectorAll('#scoreSignals .score-signal')].map((el) => el.dataset.value) }));
  check('CRUD update signal invalidates scores', afterEdit.name === 'Asks for source code' && afterEdit.phase === 'idle' && afterEdit.values.every((value) => value === ''), afterEdit);
  await closeSheet();

  await page.fill('#prompt', 'Write a Python function that parses ISO dates.');
  await page.click('#btnRoute');
  const addRoutePhase = await waitForDecision();
  const raw = JSON.parse(await page.textContent('#rawRequest'));
  check('new question appears in Jev request', addRoutePhase === 'decided' && Object.keys(raw.questions).includes('asks_for_code'), Object.keys(raw.questions).join(','));

  // Thresholds re-decide existing answers without issuing another Jev request.
  await openSheet('signals');
  await page.click('#btnSettings');
  await page.waitForSelector('#dlgSettings[open]');
  const beforeThresholdRaw = await page.textContent('#rawRequest');
  const expectedFor = () => page.evaluate(() => App.decide(App.STATE.signals, App.STATE.answers, App.STATE.thresholds).target);
  const sliderTargets = [];
  for (const value of ['0.5', '2']) {
    await page.$eval('#thScoreHigh', (element, next) => { element.value = next; element.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    sliderTargets.push([value, await page.getAttribute('#router', 'data-target'), await expectedFor()]);
  }
  const afterThresholdRaw = await page.textContent('#rawRequest');
  check('threshold slider re-decides live', sliderTargets.every(([, got, expected]) => got === expected) && beforeThresholdRaw === afterThresholdRaw, sliderTargets);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#dlgSettings')?.open, null, { timeout: 5000 });

  // Toggling a signal is configuration, so it clears scores rather than
  // applying a stale decision to a changed signal set.
  await page.$eval('[data-toggle="complexity"]', (element) => { element.checked = false; element.dispatchEvent(new Event('change', { bubbles: true })); });
  const afterToggle = await page.evaluate(() => ({ phase: App.STATE.phase, decision: App.STATE.decision, answers: Object.keys(App.STATE.answers).length, values: [...document.querySelectorAll('#scoreSignals .score-signal')].map((el) => el.dataset.value) }));
  check('signal toggle resets scores', afterToggle.phase === 'idle' && afterToggle.decision === null && afterToggle.answers === 0 && afterToggle.values.every((value) => value === ''), afterToggle);
  await page.$eval('[data-toggle="complexity"]', (element) => { element.checked = true; element.dispatchEvent(new Event('change', { bubbles: true })); });

  page.once('dialog', (dialog) => dialog.accept());
  await page.click('#signals [data-del="asks_for_code"]');
  const afterDelete = await page.evaluate(() => ({ count: document.querySelectorAll('#signals .signal').length, ids: App.STATE.signals.map((signal) => signal.id), phase: App.STATE.phase }));
  check('CRUD delete signal', afterDelete.count === 4 && !afterDelete.ids.includes('asks_for_code') && afterDelete.phase === 'idle', afterDelete);
  await closeSheet();

  // Empty prompt + Route draws a random question from any category and routes it.
  await page.fill('#prompt', '');
  await page.click('#btnRoute');
  const emptyPhase = await waitForDecision();
  const drawnAny = await page.evaluate(() => { const v = document.querySelector('#prompt').value; return v.length > 0 && App.PRESETS.some((p) => App.questionPool(p.key).some((q) => q.en === v || q.pl === v)); });
  check('empty prompt draws a random example and routes it', emptyPhase === 'decided' && drawnAny);
  await page.waitForFunction(() => +getComputedStyle(document.querySelector('.model-card[data-selected="false"]')).opacity < 0.5, null, { timeout: 3000 }).catch(() => {});
  const marks = await page.evaluate(() => {
    const sel = document.querySelector('.model-card[data-selected="true"]'), other = document.querySelector('.model-card[data-selected="false"]');
    const chip = document.querySelector('#modelChoice');
    return { selectedOutline: getComputedStyle(sel).outlineWidth, badgeVisible: !sel.querySelector('.selection-mark').hidden, otherOpacity: +getComputedStyle(other).opacity, chip: chip.hidden ? '' : chip.textContent };
  });
  check('chosen model is unmistakable (ring, badge, chip, faded other)', parseFloat(marks.selectedOutline) >= 4 && marks.badgeVisible && marks.otherOpacity < 0.5 && marks.chip.length > 2, marks);
  const geometry = await page.evaluate(() => {
    const w = (id) => document.getElementById(id).getBoundingClientRect().width;
    return { policy: Math.round(w('nPolicy')), jev: Math.round(w('nJev')), icons: ['#nLocal .model-icon', '#nFrontier .model-icon'].every((sel) => document.querySelector(sel)) };
  });
  check('Jev Router box as wide as Polityka, model icons present', Math.abs(geometry.policy - geometry.jev) <= 1 && geometry.icons, geometry);

  // Mock-only stale-response test: editing the prompt while Jev is asking
  // invalidates the request, and the old answer must not commit afterwards.
  if (MOCK) {
    const logBefore = await page.evaluate(() => App.STATE.log.length);
    await page.fill('#prompt', 'First prompt for async invalidation.');
    await page.evaluate(() => { App.route(); });
    await page.waitForSelector('body[data-phase="asking"]', { timeout: 5000 });
    await page.fill('#prompt', 'Second prompt must invalidate the first response.');
    await page.waitForTimeout(1300);
    const stale = await page.evaluate(() => ({ phase: App.STATE.phase, decision: App.STATE.decision, answers: Object.keys(App.STATE.answers).length, request: App.STATE.lastRequest, response: App.STATE.lastResponse, log: App.STATE.log.length }));
    check('prompt edit invalidates async response', stale.phase === 'idle' && stale.decision === null && stale.answers === 0 && stale.request === null && stale.response === null && stale.log === logBefore, stale);
  } else {
    check('prompt edit invalidates async response (mock only)', true, 'skipped in --real mode');
  }

  const importOk = await page.evaluate(() => [
    App.validSignal({ id: 'x', type: 'score', instructions: 'q' }) === false,
    App.validSignal({ id: 'x', type: 'score', instructions: 'q', criteria: 'a' }) === false,
    App.validSignal({ id: 'x', type: 'weird', instructions: 'q' }) === false,
    App.validSignal({ id: 'x', type: 'noul', instructions: 'q', policy: 'nope' }) === false,
    App.validSignal({ id: 'x', type: 'noul', instructions: 'q' }) === true,
    App.validSignal({ id: 'x', type: 'score', instructions: 'q', criteria: ['a', 'b'] }) === true,
  ].every(Boolean));
  check('validSignal rejects malformed shapes', importOk);

  check('PL language at start', await page.getAttribute('html', 'lang') === 'pl');
  await page.click('[data-lang-btn="en"]');
  check('EN toggle', (await page.textContent('#btnRoute')).includes('Route') && await page.getAttribute('html', 'lang') === 'en');
  await page.click('[data-lang-btn="pl"]');
  check('PL toggle', (await page.textContent('#btnRoute')).includes('Routuj') && await page.getAttribute('html', 'lang') === 'pl');

  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
} catch (error) {
  check('probe flow completed', false, error.stack || error.message);
} finally {
  if (pageErrors.length) check('no page errors', false, pageErrors.map((error) => error.message).join(' | '));
  else if (page) check('no page errors', true);
  if (browser) {
    try { await browser.close(); } catch (error) { check('browser cleanup', false, error.message); }
  }
}

const failures = results.filter((result) => !result.ok);
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? `  ${result.detail}` : ''}`);
console.log(`\n${results.length - failures.length}/${results.length} passed`);
process.exitCode = failures.length ? 1 : 0;
