import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { trackEvent } from './useAnalytics';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../supabase';

/** Moderators approve shared content; admins also manage the directory and events */
export type UserRole = 'member' | 'moderator' | 'admin';

export interface Profile {
  id: string;
  display_name: string | null;
  role: UserRole;
  parish_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** True for moderators and admins */
  canModerate: boolean;
  loading: boolean;
  error: AuthError | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Resolves to true when the account needs email confirmation before first sign-in */
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) { setProfile(null); return; }
    // The profiles table is created by the migrations; without it everyone is a member
    let { data } = await supabase.from('profiles').select('id, display_name, role, parish_id').eq('id', u.id).maybeSingle();
    // An account made before its profile could be created gets one now
    if (!data && !(await supabase.rpc('ensure_profile')).error) {
      ({ data } = await supabase.from('profiles').select('id, display_name, role, parish_id').eq('id', u.id).maybeSingle());
    }
    setProfile(data
      ? (data as Profile)
      : { id: u.id, display_name: (u.user_metadata?.display_name as string) ?? null, role: 'member', parish_id: null });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session);
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
      if (error) setError(error);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const wrap = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err: any) {
      setError(err);
      throw err;
    }
  };

  const signInWithGoogle = () => wrap(async () => {
    trackEvent('sign_in', { method: 'google' });
    const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${returnTo}` },
    });
    if (error) throw error;
  });

  const signInWithEmail = (email: string, password: string) => wrap(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    trackEvent('sign_in', { method: 'email' });
  });

  const signUpWithEmail = (email: string, password: string, displayName: string) => wrap(async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // The confirmation link brings them back where they were going (an invitation, a parish …)
      options: { data: { display_name: displayName }, emailRedirectTo: `${window.location.origin}${new URLSearchParams(window.location.search).get('returnTo') || '/'}` },
    });
    if (error) throw error;
    trackEvent('sign_up', { method: 'email' });
    return !data.session;
  });

  const signOut = () => wrap(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        canModerate: profile?.role === 'moderator' || profile?.role === 'admin',
        loading,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile: () => loadProfile(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
