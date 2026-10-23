// Shared helpers for CelestialWorship Edge Functions (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}

/** Service-role client: bypasses RLS, so every function must check permissions itself */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/** Client acting as the caller (their JWT), so RLS and auth.uid() apply */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}

/** Flutterwave v3 API with the platform's secret key. Throws Flutterwave's message on failure. */
export async function flutterwave(path: string, init: RequestInit = {}) {
  const key = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
  if (!key) throw new Error('FLUTTERWAVE_SECRET_KEY is not set');
  const res = await fetch(`https://api.flutterwave.com/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status !== 'success') throw new Error(body.message ?? `Flutterwave error ${res.status}`);
  return body.data;
}

/** The app stores kobo/cents; Flutterwave takes and returns whole units (naira, dollars) */
export const toMajor = (minor: number) => Number(minor) / 100;
export const toMinor = (major: number) => Math.round(Number(major) * 100);

/** Our page, where Flutterwave sends the payer back (with ?status=…&tx_ref=…&transaction_id=…) */
export const appOrigin = () => Deno.env.get('APP_ORIGIN') ?? 'https://celestialworship.vercel.app';
