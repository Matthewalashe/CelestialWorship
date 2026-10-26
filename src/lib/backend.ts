import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Shared features (prayer requests, articles, events, directory, donations, backup) live in
 * Supabase tables created by the SQL in /supabase/migrations. Until those migrations are
 * applied, the tables don't exist; these helpers turn that into a clear message instead of
 * a broken page.
 */

export class BackendError extends Error {
  constructor(message: string, public readonly notSetUp = false) {
    super(message);
  }
}

export function isMissingTable(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message);
}

/** Throw a friendly error for a failed Supabase call */
export function raise(error: PostgrestError | null | undefined, action: string): void {
  if (!error) return;
  if (isMissingTable(error)) {
    throw new BackendError(`${action} isn't available yet, the church's online service is still being set up.`, true);
  }
  if (error.code === '42501' || /permission|row-level security/i.test(error.message)) {
    throw new BackendError(`You don't have permission to ${action.toLowerCase()}. Try signing in.`);
  }
  if (/fetch|network/i.test(error.message)) {
    throw new BackendError(`${action} needs an internet connection.`);
  }
  throw new BackendError(`${action} failed: ${error.message}`);
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}
