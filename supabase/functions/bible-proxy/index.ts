// GET /functions/v1/bible-proxy/v1/bibles/{id}/chapters/{chapter}?…
// Forwards read-only chapter requests to API.Bible so the API key stays on the server.
// Set VITE_BIBLE_PROXY_URL=https://<project>.supabase.co/functions/v1/bible-proxy in the app.
import { corsHeaders, json, preflight } from '../_shared/common.ts';

const ALLOWED = /^\/v1\/bibles\/[\w-]+\/chapters\/[1-3]?[A-Z]{2,3}\.\d{1,3}$/;

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/bible-proxy/, '');
  if (req.method !== 'GET' || !ALLOWED.test(path)) return json({ error: 'Not allowed' }, 400);

  const key = Deno.env.get('API_BIBLE_KEY');
  if (!key) return json({ error: 'API_BIBLE_KEY is not set' }, 500);
  const upstream = await fetch(`https://api.scripture.api.bible${path}${url.search}`, { headers: { 'api-key': key } });
  return new Response(upstream.body, {
    status: upstream.status,
    // Licensed text: no shared caching
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=0' },
  });
});
