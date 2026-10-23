import { createClient } from '@supabase/supabase-js';

// These are PUBLIC client-side keys (anon key is safe to expose).
// Override via environment variables if needed.
// Values pasted into a dashboard can carry an invisible byte-order mark or a newline; a header
// containing one makes the browser refuse every request, so keep printable ASCII only
const clean = (v: string | undefined) => v?.replace(/[^\x21-\x7E]/g, '') || undefined;

const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL) || 'https://cwguzsvmghowmnfkovyx.supabase.co';
const supabaseAnonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Z3V6c3ZtZ2hvd21uZmtvdnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzAzNTUsImV4cCI6MjEwMjIwNjM1NX0.dgRxebcfnTK7-IHwE2Zqwh09OE4DoEZnLbRxDr7fswg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
