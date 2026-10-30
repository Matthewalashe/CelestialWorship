// POST /functions/v1/join-listed  { listed_id }
// Parishes listed from the Church's public directory are files in the app until someone joins one. The first person to
// join makes it a real parish, from the app's own list (never from what the caller sends), so it can have a space.
import { adminClient, json, preflight, userClient } from '../_shared/common.ts';

interface Listed {
  id: string; name: string; country: string; state_region?: string | null; city?: string | null; address?: string | null;
  phone?: string | null; email?: string | null; shepherd_name?: string | null; latitude?: number | null; longitude?: number | null;
  continent?: string | null; geo_precision?: string | null;
}

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const user = userClient(req);
    const { data: { user: me } } = await user.auth.getUser();
    if (!me) return json({ error: 'Sign in first' }, 401);

    const { listed_id } = await req.json();
    const file = /^seed-/.test(listed_id) ? 'parishes_seed' : /^listed-/.test(listed_id) ? 'parishes_listed' : null;
    if (!file) return json({ error: 'That parish is not in the directory' }, 400);
    const origin = Deno.env.get('APP_ORIGIN') ?? 'https://celestialworship.online';
    const list: Listed[] = await (await fetch(`${origin}/data/${file}.json`)).json();
    const p = list.find(x => x.id === listed_id);
    if (!p) return json({ error: 'That parish is not in the directory' }, 404);

    const admin = adminClient();
    let q = admin.from('parishes').select('id').ilike('name', p.name.replace(/[%_\\]/g, '\\$&')).eq('status', 'published').limit(1);
    q = p.city ? q.ilike('city', p.city.replace(/[%_\\]/g, '\\$&')) : q.is('city', null);
    const { data: found, error: findError } = await q.maybeSingle();
    if (findError) throw findError;

    let parishId = found?.id as string | undefined;
    if (!parishId) {
      const { data: made, error } = await admin.from('parishes').insert({
        name: p.name, kind: 'parish', status: 'published', country: p.country, state_region: p.state_region ?? null, city: p.city ?? null,
        address: p.address ?? null, phone: p.phone ?? null, email: p.email ?? null, shepherd_name: p.shepherd_name ?? null,
        latitude: p.latitude ?? null, longitude: p.longitude ?? null, continent: p.continent ?? null, contact_public: true,
      }).select('id').single();
      if (error) throw error;
      parishId = made.id;
    }

    const { data: state, error } = await user.rpc('request_to_join_space', { pid: parishId, p_note: null });
    if (error) throw error;
    return json({ parish_id: parishId, state });
  } catch (e) {
    console.error('join-listed', (e as Error).message);
    return json({ error: 'Joining the parish failed. Please try again.' }, 500);
  }
});
