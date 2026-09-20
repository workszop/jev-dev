// jev-router worker: proxies POST / to TypeSafe's System One endpoint with the server-side key.
const TYPESAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_MODEL = 'jev-latest';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/health') return json({ ok: true, model: DEFAULT_MODEL });
    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
    if (!env.TYPESAFE_API_KEY) return json({ error: 'Missing TYPESAFE_API_KEY' }, 500);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
    if (!body || body.state === undefined || !body.questions) {
      return json({ error: 'Body needs "state" and "questions"' }, 400);
    }
    if (!body.model) body.model = DEFAULT_MODEL;

    const upstream = await fetch(TYPESAFE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.TYPESAFE_API_KEY}` },
      body: JSON.stringify(body),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  },
};
