import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a real client only when credentials are configured.
// Otherwise, provide a dummy that won't crash the app on load.
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Lightweight stub so the rest of the app can render without valid credentials.
  // Auth operations will fail gracefully with descriptive errors.
  console.warn(
    '[CelestialWorship] Supabase credentials not configured. Auth features are disabled.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };
