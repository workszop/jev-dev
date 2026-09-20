# Jev Router

A single-file demo of an AI request router. The prompt is evaluated by TypeSafe's Jev model
(one request, one typed question per signal); a policy in JS decides whether the prompt goes
to a local small model or an external frontier model. Downstream calls are simulated.

- `index.html` – the app (Edulab look, PL/EN). Opens from `file://` in mock mode.
- `worker/` – Cloudflare Worker that holds the TypeSafe key. See `worker/README.md`.
- `probe.mjs` – Playwright DOM-contract probe (`node probe.mjs <url>`; add `--real <workerUrl>` for live Jev).
- `jev-demo.sh` – curl example of a raw Jev request.

Real mode: open Settings (gear icon) and paste the Worker URL. Empty URL = mock mode.
Shortcuts: Ctrl+Enter routes, keys 1 to 6 run the presets.
