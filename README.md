# Jev Router

Single-file demo of an AI request router. Jev evaluates typed policy signals in one request;
the local policy then selects a local small model or a frontier model. Downstream calls are
simulated.

- `index.html` – Edulab PL/EN app. The main canvas is a tall four-stage flow: prompt → policy
  signals → Jev score bars → model selection. It calls live Jev through the project Worker by
  default; the key never leaves the Worker. `?mock=1` switches to the offline heuristic mock
  used by the probe.
- `sample-questions.md` – the example pool, six categories matching the six example buttons.
  Each press draws a random question (EN or PL by UI language) from that category. Edit the
  file to change the examples; the app fetches it at start and falls back to one built-in
  question per category when the file cannot be fetched (e.g. from `file://`).
- `worker/` – Cloudflare Worker that holds the TypeSafe key. See `worker/README.md`.
- `probe.mjs` – Playwright DOM-contract and interaction probe. It covers the six presets,
  signal CRUD, threshold re-decision, PL/EN, responsive contracts, empty prompts, and stale
  async responses in mock mode.
- `jev-demo.sh` – curl example of a raw Jev request.

Start a local server and run the mock probe:

```sh
python3 -m http.server 8766
node probe.mjs http://localhost:8766/index.html
```

Browser-free policy and markup regression tests: `node --test tests/router.test.mjs`.

If Playwright is not installed as a regular package, set `PLAYWRIGHT_MODULE` to its module
path; the probe also retains the workspace's historical absolute-path fallback. Use
`node --check probe.mjs` for a syntax-only check.

The **Open panel / Hide panel** header button toggles the native side sheet (also localized
in Polish). Closing it returns the reserved space to the visualization. It contains Examples, Signals,
Decision explanation, History, and Raw request panels; Settings is inside the sheet. The
Worker URL defaults to the project Worker; leaving the field empty restores that default.
The panel starts hidden. For a live-Jev probe run pass `--real <workerUrl>`.

At 1280px and wider the sheet docks on the right when opened, leaving the prompt and routing
controls usable. On smaller screens it opens as a modal sheet. The white prompt editor stays
tall; Policy and Jev Router fit their contents. Green local and blue frontier cards list
model-family examples, not pinned model versions.

Shortcuts: Ctrl+Enter routes, keys 1 to 6 run the presets, and Escape closes the active panel.
