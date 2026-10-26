import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { raise } from '../lib/backend';

/**
 * The member's profile. Filled in during onboarding and editable on the profile page.
 * It lives on the device so the app works without an account; when the person signs in,
 * it is saved to their account (profiles table) as well.
 */

export type MemberType = 'laity' | 'church_worker' | 'shepherd' | 'independent_shepherd' | 'church_admin';

export const MEMBER_TYPES: Record<MemberType, { label: string; yoruba: string; description: string; needsVerification: boolean }> = {
  laity: { label: 'Member (laity)', yoruba: 'Ọmọ ìjọ', description: 'A worshipper in the congregation', needsVerification: false },
  church_worker: { label: 'Church worker', yoruba: 'Òṣìṣẹ́ ìjọ', description: 'Choir, usher, prayer band, Sunday school, youth, sanitation…', needsVerification: false },
  shepherd: { label: 'Parish shepherd', yoruba: 'Olùṣọ́-àgùntàn ìjọ', description: 'Shepherd in charge of a parish — verified by the church before admin tools unlock', needsVerification: true },
  independent_shepherd: {
    label: 'Independent shepherd', yoruba: 'Olùṣọ́-àgùntàn aládàáni',
    description: 'A shepherd not attached to a parish — run your own ministry page: articles, livestreams, prayer requests and giving',
    needsVerification: true,
  },
  church_admin: { label: 'Church admin', yoruba: 'Alákòóso ìjọ', description: 'Parish secretary or administrator — verified before you can manage a parish', needsVerification: true },
};

/** Common forms of address; the field is free text because titles vary between parishes */
export const CHURCH_TITLE_SUGGESTIONS = [
  'Brother', 'Sister', 'Leader', 'Senior Leader', 'Elder', 'Senior Elder', 'Evangelist', 'Senior Evangelist',
  'Prophet', 'Prophetess', 'Wolijah', 'Wolider', 'Shepherd', 'Assistant Shepherd',
];

export const MINISTRY_SUGGESTIONS = [
  'Choir', 'Ushering', 'Prayer band', 'Visioners', 'Sunday school', 'Youth fellowship', 'Women’s guild',
  'Men’s fellowship', 'Sanitation', 'Evangelism', 'Media & projection', 'Welfare',
];

export interface MemberProfile {
  displayName: string;
  memberType: MemberType;
  churchTitle: string;
  ministry: string;
  parishId: string | null;
  parishName: string;
  country: string;
  stateRegion: string;
  phone: string;
  phonePublic: boolean;
  /** Phone and email shown to fellow members of the parish spaces they belong to */
  shareContactInSpaces: boolean;
  birthday: string; // YYYY-MM-DD or ''
  preferredLanguage: 'en' | 'yo' | 'fr' | 'egun';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  onboardedAt: string | null;
  /** Profile photo and banner (set through lib/media.ts) */
  avatarUrl: string | null;
  bannerUrl: string | null;
  /** Spiritual rank, e.g. "Senior Leader"; office, e.g. "Head of Province" over "Lagos Province 3" */
  rank: string;
  rankLine: '' | 'men' | 'women';
  office: string;
  officeScope: string;
  bio: string;
}

const KEY = 'cw-profile';
const CHANGE_EVENT = 'cw-profile-changed';

export const EMPTY_PROFILE: MemberProfile = {
  displayName: '', memberType: 'laity', churchTitle: '', ministry: '', parishId: null, parishName: '', country: '',
  stateRegion: '', phone: '', phonePublic: false, shareContactInSpaces: true, birthday: '', preferredLanguage: 'en', verificationStatus: 'unverified', avatarUrl: null, bannerUrl: null, rank: '', rankLine: '', office: '', officeScope: '', bio: '',
  onboardedAt: null,
};

export function readLocalProfile(): MemberProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY_PROFILE, ...JSON.parse(raw) };
  } catch {}
  return EMPTY_PROFILE;
}

function writeLocalProfile(p: MemberProfile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function hasOnboarded(): boolean {
  return !!readLocalProfile().onboardedAt;
}

function toRow(p: MemberProfile) {
  return {
    display_name: p.displayName || null,
    member_type: p.memberType,
    church_title: p.churchTitle || null,
    ministry: p.ministry || null,
    parish_id: p.parishId,
    country: p.country || null,
    state_region: p.stateRegion || null,
    phone: p.phone || null,
    phone_public: p.phonePublic,
    share_contact_in_spaces: p.shareContactInSpaces,
    birthday: p.birthday || null,
    preferred_language: p.preferredLanguage,
    onboarded_at: p.onboardedAt,
    rank: p.rank || null,
    rank_line: p.rankLine || null,
    office: p.office || null,
    office_scope: p.officeScope || null,
    bio: p.bio || null,
  };
}

function fromRow(row: any, local: MemberProfile): MemberProfile {
  return {
    ...local,
    displayName: row.display_name ?? local.displayName,
    memberType: row.member_type ?? local.memberType,
    churchTitle: row.church_title ?? local.churchTitle,
    ministry: row.ministry ?? local.ministry,
    parishId: row.parish_id ?? local.parishId,
    country: row.country ?? local.country,
    stateRegion: row.state_region ?? local.stateRegion,
    phone: row.phone ?? local.phone,
    phonePublic: row.phone_public ?? local.phonePublic,
    shareContactInSpaces: row.share_contact_in_spaces ?? local.shareContactInSpaces ?? true,
    birthday: row.birthday ?? local.birthday,
    preferredLanguage: row.preferred_language ?? local.preferredLanguage,
    verificationStatus: row.verification_status ?? local.verificationStatus,
    onboardedAt: row.onboarded_at ?? local.onboardedAt,
    avatarUrl: row.avatar_url ?? null,
    rank: row.rank ?? local.rank ?? '',
    rankLine: row.rank_line ?? local.rankLine ?? '',
    office: row.office ?? local.office ?? '',
    officeScope: row.office_scope ?? local.officeScope ?? '',
    bio: row.bio ?? local.bio ?? '',
    bannerUrl: row.banner_url ?? null,
  };
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfile>(readLocalProfile);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const sync = () => setProfile(readLocalProfile());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  // On sign-in: account values win where set, and local details fill the gaps
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (cancelled || error) return;
      const local = readLocalProfile();
      if (data) {
        const merged = fromRow(data, local);
        writeLocalProfile(merged);
        // Push local details the account doesn't have yet (e.g. filled in before signing up)
        const missing = Object.fromEntries(Object.entries(toRow(local)).filter(([k, v]) => v && !data[k]));
        if (Object.keys(missing).length) await supabase.from('profiles').update(missing).eq('id', user.id);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const save = useCallback(async (updates: Partial<MemberProfile>) => {
    const next = { ...readLocalProfile(), ...updates };
    // Verification is decided by the church, not the app: choosing a role that needs it marks it pending
    if (updates.memberType && updates.memberType !== profile.memberType) {
      next.verificationStatus = MEMBER_TYPES[updates.memberType].needsVerification ? 'pending' : 'unverified';
    }
    writeLocalProfile(next);
    if (user) {
      setSyncing(true);
      try {
        const { data, error } = await supabase.from('profiles').update(toRow(next)).eq('id', user.id).select('verification_status').maybeSingle();
        if (error && error.code !== 'PGRST116') raise(error, 'Saving your profile');
        if (data?.verification_status) writeLocalProfile({ ...next, verificationStatus: data.verification_status });
      } catch {
        // Kept on the device; it will sync next time
      } finally {
        setSyncing(false);
      }
    }
    return next;
  }, [user, profile.memberType]);

  /** Ask the church to confirm a shepherd / church admin / worker role */
  const requestVerification = useCallback(async (memberType: MemberType, details: string) => {
    if (!user) throw new Error('Sign in to request verification');
    const p = readLocalProfile();
    const { error } = await supabase.from('verification_requests').insert({
      user_id: user.id, member_type: memberType, parish_id: p.parishId, details,
    });
    raise(error, 'Sending the verification request');
    writeLocalProfile({ ...p, memberType, verificationStatus: 'pending' });
  }, [user]);

  return { profile, save, syncing, requestVerification, signedIn: !!user };
}
