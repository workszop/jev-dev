# jev-router Worker

Proxies the demo page's requests to TypeSafe (`POST https://api.typesafe.ai/v1/systemone`)
so the API key never reaches the browser.

```bash
cd worker
npx wrangler deploy
npx wrangler secret put TYPESAFE_API_KEY   # paste the key when prompted
npx wrangler deploy                        # once more so the secret is picked up
curl https://jev-router.<account>.workers.dev/health
```

Local dev: put `TYPESAFE_API_KEY=...` in `worker/.dev.vars` (gitignored) and run
`npx wrangler dev --port 8787`.
