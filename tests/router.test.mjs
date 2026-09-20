import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const INDEX_PATH = path.join(ROOT, 'index.html');
const HTML = fs.readFileSync(INDEX_PATH, 'utf8');
const THRESHOLDS = { noulYes: 0.65, noulNo: 0.35, scoreHigh: 1.5, minConfidence: 0.5 };

// ─── Browser-free script extraction ───

function fakeElement(id = '') {
  const element = {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    checked: false,
    required: false,
    dataset: {},
    style: {},
    classList: {
      toggle() {},
      add() {},
      remove() {},
      contains() { return false; },
    },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return fakeElement(); },
    querySelectorAll() { return []; },
    append() {},
    appendChild() {},
    prepend() {},
    replaceChildren() {},
    remove() {},
    focus() {},
    click() {},
    showModal() {},
    show() {},
    close() {},
    getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }; },
    setAttribute(name, value) { this[name] = String(value); },
    getAttribute(name) { return this[name] ?? null; },
  };
  return element;
}

function loadAppFromScript() {
  const match = HTML.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i);
  assert.ok(match, 'index.html should contain an inline application script');

  const elements = new Map();
  const body = fakeElement('body');
  const html = fakeElement('html');
  html.scrollWidth = 1440;
  html.clientWidth = 1440;
  const elementFor = (id) => {
    if (!elements.has(id)) elements.set(id, fakeElement(id));
    return elements.get(id);
  };
  const document = {
    body,
    documentElement: html,
    fonts: { ready: Promise.resolve() },
    activeElement: fakeElement(),
    querySelector(selector) {
      if (selector === 'body') return body;
      if (selector === 'html') return html;
      const idMatch = selector.match(/^#([\w-]+)$/);
      return idMatch ? elementFor(idMatch[1]) : fakeElement();
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement(tagName) { return fakeElement(tagName); },
  };
  const localStorage = {
    values: new Map(),
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; },
    setItem(key, value) { this.values.set(key, String(value)); },
    removeItem(key) { this.values.delete(key); },
  };
  const context = {
    console,
    document,
    localStorage,
    location: { search: '?mock=1' },
    innerWidth: 1440,
    innerHeight: 1000,
    URLSearchParams,
    URL,
    structuredClone,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (callback) => callback(),
    ResizeObserver: class { observe() {} disconnect() {} },
    fetch: async () => { throw new Error('fetch should not run in pure policy tests'); },
    confirm: () => true,
    Blob: class Blob {},
    FileReader: class FileReader {},
    window: { addEventListener() {}, removeEventListener() {} },
  };
  context.window.window = context.window;
  vm.runInNewContext(match[1], context, { filename: INDEX_PATH });
  assert.ok(context.window.App, 'inline script should expose window.App');
  return context.window.App;
}

const App = loadAppFromScript();
const plain = (value) => JSON.parse(JSON.stringify(value));

// ─── Small test fixtures ───

function noulSignal(id, policy = 'soft_frontier', enabled = true) {
  return {
    id,
    enabled,
    type: 'noul',
    policy,
    instructions: `Is ${id} present?`,
    criteria: { true: 'yes', false: 'no' },
  };
}

function scoreSignal(id, policy = 'soft_frontier', enabled = true) {
  return {
    id,
    enabled,
    type: 'score',
    policy,
    instructions: `How high is ${id}?`,
    criteria: ['low', 'medium', 'high'],
  };
}

// ─── Policy engine regressions ───

test('signalState handles noul boundaries and missing answers', () => {
  const signal = noulSignal('privacy', 'lock_local');
  assert.equal(App.signalState(signal, undefined, THRESHOLDS), 'idle');
  assert.equal(App.signalState(signal, { noul: 0.65 }, THRESHOLDS), 'fire');
  assert.equal(App.signalState(signal, { noul: 0.35 }, THRESHOLDS), 'clear');
  assert.equal(App.signalState(signal, { noul: 0.5 }, THRESHOLDS), 'uncertain');
});

test('signalState requires score confidence before firing a score signal', () => {
  const signal = scoreSignal('complexity');
  assert.equal(App.signalState(signal, { score: 1.5, confidence: 0.5 }, THRESHOLDS), 'fire');
  assert.equal(App.signalState(signal, { score: 1.5, confidence: 0.49 }, THRESHOLDS), 'uncertain');
  assert.equal(App.signalState(signal, { score: 1.49, confidence: 0.9 }, THRESHOLDS), 'clear');
});

test('signalState keeps malformed score answers deterministic', () => {
  const signal = scoreSignal('knowledge');
  // A malformed score cannot be routed as a high score. Non-numeric confidence
  // follows the existing fallback and does not silently become a low number.
  assert.equal(App.signalState(signal, { score: '2', confidence: 0.9 }, THRESHOLDS), 'uncertain');
  assert.equal(App.signalState(signal, { score: 2, confidence: 'not-a-number' }, THRESHOLDS), 'fire');
});

test('decide returns local for no enabled questions', () => {
  const result = App.decide([noulSignal('disabled', 'soft_frontier', false)], {}, THRESHOLDS);
  assert.deepStrictEqual(plain(result), {
    target: 'local',
    locks: [],
    votes: [],
    uncertain: [],
    reasons: [{ key: 'rNoQuestions' }],
  });
});

test('privacy lock_local takes precedence over frontier locks and votes', () => {
  const signals = [
    noulSignal('pii', 'lock_local'),
    noulSignal('frontierLock', 'lock_frontier'),
    scoreSignal('complexity', 'soft_frontier'),
  ];
  const answers = {
    pii: { noul: 0.95 },
    frontierLock: { noul: 0.95 },
    complexity: { score: 2, confidence: 0.9 },
  };
  const result = App.decide(signals, answers, THRESHOLDS);
  assert.equal(result.target, 'local');
  assert.deepStrictEqual(plain(result.locks), ['pii']);
  assert.deepStrictEqual(plain(result.votes), []);
  assert.deepStrictEqual(plain(result.uncertain), []);
});

test('uncertain privacy lock resolves to local safe side', () => {
  const signals = [noulSignal('pii', 'lock_local'), scoreSignal('complexity', 'soft_frontier')];
  const answers = {
    pii: { noul: 0.5 },
    complexity: { score: 2, confidence: 0.9 },
  };
  const result = App.decide(signals, answers, THRESHOLDS);
  assert.equal(result.target, 'local');
  assert.deepStrictEqual(plain(result.locks), ['pii']);
  assert.deepStrictEqual(plain(result.uncertain), ['pii']);
  assert.equal(result.reasons[0].key, 'rUncertainSafe');
});

test('soft frontier vote wins when it fires without a local vote', () => {
  const signals = [scoreSignal('complexity', 'soft_frontier'), scoreSignal('cost', 'soft_local')];
  const answers = {
    complexity: { score: 2, confidence: 0.9 },
    cost: { score: 0, confidence: 0.9 },
  };
  const result = App.decide(signals, answers, THRESHOLDS);
  assert.equal(result.target, 'frontier');
  assert.deepStrictEqual(plain(result.votes), ['complexity']);
});

test('soft local vote wins when the frontier vote is clear', () => {
  const signals = [scoreSignal('complexity', 'soft_frontier'), scoreSignal('cost', 'soft_local')];
  const answers = {
    complexity: { score: 0, confidence: 0.9 },
    cost: { score: 2, confidence: 0.9 },
  };
  const result = App.decide(signals, answers, THRESHOLDS);
  assert.equal(result.target, 'local');
  assert.deepStrictEqual(plain(result.votes), ['cost']);
});

test('buildRequest sends enabled signal questions once and preserves typed criteria', () => {
  const signals = [
    noulSignal('pii', 'lock_local'),
    scoreSignal('complexity'),
    { ...noulSignal('emptyCriteria'), criteria: { true: '', false: '' } },
    noulSignal('disabled', 'soft_frontier', false),
  ];
  const request = App.buildRequest('Keep this prompt private.', signals);
  assert.equal(request.state, 'Keep this prompt private.');
  assert.equal(request.model, 'jev-latest');
  assert.deepEqual(Object.keys(request.questions), ['pii', 'complexity', 'emptyCriteria']);
  assert.deepEqual(request.questions.pii.criteria, { true: 'yes', false: 'no' });
  assert.deepEqual(request.questions.complexity.criteria, ['low', 'medium', 'high']);
  assert.equal('criteria' in request.questions.emptyCriteria, false);
  assert.equal('disabled' in request.questions, false);
});

// ─── Static DOM contract ───

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function parseAttributes(token) {
  const attrs = {};
  const body = token.replace(/^<[^\s>]+\s*|\/?>$/g, '');
  const attrPattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrPattern.exec(body))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function parseMarkup(markup) {
  const root = { tagName: '#document', attrs: {}, children: [], start: 0, end: markup.length, parent: null };
  const stack = [root];
  const tokenPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>/g;
  let match;
  while ((match = tokenPattern.exec(markup))) {
    const token = match[0];
    if (token.startsWith('<!--') || token.startsWith('<!')) continue;
    if (token.startsWith('</')) {
      const closeName = token.match(/^<\/\s*([A-Za-z][\w:-]*)/)[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tagName === closeName) {
          stack[i].end = match.index + token.length;
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const openName = token.match(/^<\s*([A-Za-z][\w:-]*)/)[1].toLowerCase();
    const node = {
      tagName: openName,
      attrs: parseAttributes(token),
      children: [],
      start: match.index,
      end: match.index + token.length,
      parent: stack[stack.length - 1],
    };
    node.parent.children.push(node);
    if (!VOID_ELEMENTS.has(openName) && !/\/\s*>$/.test(token)) stack.push(node);
  }
  for (const node of stack.slice(1)) node.end = markup.length;
  return root;
}

function descendants(node) {
  return node.children.flatMap((child) => [child, ...descendants(child)]);
}

function nodeById(root, id) {
  return descendants(root).filter((node) => node.attrs.id === id);
}

function nodesByTag(root, tagName) {
  return descendants(root).filter((node) => node.tagName === tagName);
}

function isNested(node, ancestor) {
  for (let current = node.parent; current; current = current.parent) {
    if (current === ancestor) return true;
  }
  return false;
}

const markup = HTML.slice(0, HTML.search(/<script(?:\s|>)/i));
const domTree = parseMarkup(markup);

test('DOM contract has exactly one prompt textarea nested in nPrompt', () => {
  const prompts = nodeById(domTree, 'prompt');
  const nPrompt = nodeById(domTree, 'nPrompt');
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].tagName, 'textarea');
  assert.equal(nPrompt.length, 1);
  assert.equal(isNested(prompts[0], nPrompt[0]), true);
});

test('DOM contract keeps the four flow stages ordered inside main', () => {
  const main = nodesByTag(domTree, 'main');
  assert.equal(main.length, 1);
  const ids = ['nPrompt', 'nPolicy', 'nJev', 'modelSelection'];
  const stages = ids.map((id) => {
    const matches = nodeById(domTree, id);
    assert.equal(matches.length, 1, `expected exactly one #${id}`);
    assert.equal(isNested(matches[0], main[0]), true, `#${id} should be inside main`);
    assert.equal(matches[0].tagName, 'section', `#${id} should be a flow-stage section`);
    return matches[0];
  });
  assert.deepEqual(stages.map((stage) => stage.start).sort((a, b) => a - b), stages.map((stage) => stage.start));
});

test('DOM contract nests policy and score signal lists in their stages', () => {
  const policy = nodeById(domTree, 'nPolicy');
  const jev = nodeById(domTree, 'nJev');
  const policySignals = nodeById(domTree, 'policySignals');
  const scoreSignals = nodeById(domTree, 'scoreSignals');
  assert.equal(policy.length, 1);
  assert.equal(jev.length, 1);
  assert.equal(policySignals.length, 1);
  assert.equal(scoreSignals.length, 1);
  assert.equal(isNested(policySignals[0], policy[0]), true);
  assert.equal(isNested(scoreSignals[0], jev[0]), true);
});

test('DOM contract provides a native dialog side sheet', () => {
  const sideSheets = nodeById(domTree, 'sideSheet');
  assert.equal(sideSheets.length, 1);
  assert.equal(sideSheets[0].tagName, 'dialog');
});

test('model destinations show example families, not pinned versions', () => {
  assert.equal(App.T.pl.localExamples, 'np. PLLuM, Bielik, Gemma');
  assert.equal(App.T.en.frontierExamples, 'e.g. GPT, Claude, Gemini');
  assert.doesNotMatch(markup, /gemma4:12b|gpt-5\.6-luna/);
});

// ─── Attachments ───

test('buildRequest without attachments keeps state equal to the prompt', () => {
  const request = App.buildRequest('Plain prompt.', [noulSignal('pii')], []);
  assert.equal(request.state, 'Plain prompt.');
});

test('buildRequest appends each attachment as a named block after the prompt', () => {
  const attachments = [
    App.makeAttachment({ name: 'notes.md', text: 'alpha beta' }),
    App.makeAttachment({ name: 'data.csv', text: 'id,name\n1,Ala' }),
  ];
  const request = App.buildRequest('Summarise.', [noulSignal('pii')], attachments);
  assert.ok(request.state.startsWith('<user_prompt>\nSummarise.\n</user_prompt>'));
  assert.match(request.state, /<attachment name="notes\.md" type="md" truncated="false">\nalpha beta\n<\/attachment>/);
  assert.match(request.state, /<attachment name="data\.csv" type="csv" truncated="false">\nid,name\n1,Ala\n<\/attachment>/);
  assert.ok(request.state.indexOf('notes.md') < request.state.indexOf('data.csv'));
});

test('makeAttachment clips text to one page and flags truncation', () => {
  const long = 'x'.repeat(App.ATTACHMENT_CHARS + 500);
  const a = App.makeAttachment({ name: 'long.txt', text: long });
  assert.equal(a.text.length, App.ATTACHMENT_CHARS);
  assert.equal(a.truncated, true);
  assert.equal(a.chars, App.ATTACHMENT_CHARS);
  const short = App.makeAttachment({ name: 'short.txt', text: 'hello' });
  assert.equal(short.truncated, false);
  assert.equal(short.chars, 5);
});

test('ATTACHMENT_CHARS is one page of text', () => {
  assert.equal(App.ATTACHMENT_CHARS, 3000);
});

test('truncated attachment block carries truncated="true"', () => {
  const a = App.makeAttachment({ name: 'big.pdf', text: 'y'.repeat(App.ATTACHMENT_CHARS + 1) });
  const request = App.buildRequest('Read it.', [noulSignal('pii')], [a]);
  assert.match(request.state, /<attachment name="big\.pdf" type="pdf" truncated="true">/);
});

test('addAttachment accepts at most MAX_ATTACHMENTS files', () => {
  App.STATE.attachments = [];
  for (let i = 0; i < App.MAX_ATTACHMENTS; i++) assert.equal(App.addAttachment({ name: `f${i}.txt`, text: 'ok' }), true);
  assert.equal(App.addAttachment({ name: 'extra.txt', text: 'no' }), false);
  assert.equal(App.STATE.attachments.length, App.MAX_ATTACHMENTS);
  assert.equal(App.MAX_ATTACHMENTS, 3);
  App.STATE.attachments = [];
});

test('removeAttachment drops the attachment by index', () => {
  App.STATE.attachments = [];
  App.addAttachment({ name: 'a.txt', text: '1' });
  App.addAttachment({ name: 'b.txt', text: '2' });
  App.removeAttachment(0);
  assert.deepEqual(App.STATE.attachments.map((a) => a.name), ['b.txt']);
  App.STATE.attachments = [];
});

test('attachmentKind maps extensions and rejects unsupported files', () => {
  assert.equal(App.attachmentKind('Report.PDF'), 'pdf');
  assert.equal(App.attachmentKind('readme.md'), 'md');
  assert.equal(App.attachmentKind('x.csv'), 'csv');
  assert.equal(App.attachmentKind('x.txt'), 'txt');
  assert.equal(App.attachmentKind('x.docx'), null);
});

test('DOM contract has the attach file input and list inside nPrompt', () => {
  const input = nodeById(domTree, 'attachInput');
  const list = nodeById(domTree, 'attachments');
  const nPrompt = nodeById(domTree, 'nPrompt');
  assert.equal(input.length, 1);
  assert.equal(input[0].tagName, 'input');
  assert.equal(input[0].attrs.type, 'file');
  assert.equal(input[0].attrs.accept, '.txt,.md,.csv,.pdf');
  assert.equal('multiple' in input[0].attrs, true);
  assert.equal(list.length, 1);
  assert.equal(isNested(input[0], nPrompt[0]), true);
  assert.equal(isNested(list[0], nPrompt[0]), true);
});
