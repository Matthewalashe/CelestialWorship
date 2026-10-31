import { useEffect, useState } from 'react';
import { PRICING_ON, getSubscription } from '../plan';
import { myAdminParishes } from '../parishAdmin';

/**
 * What the Live Studio allows on each plan: Free, Premium and Enterprise.
 * While PRICING_ON is false nobody can upgrade, so every limit sleeps and only our mark stays on.
 */

export type StudioTier = 'free' | 'premium' | 'enterprise';

export interface StudioAllowance {
  plan: StudioTier | 'testing';
  /** How many platforms at once */
  platforms: number;
  /** How long one stream may run, in hours */
  hours: number;
  watermark: boolean;
  transcript: boolean;
  /** Viewers, reactions and past broadcasts */
  analytics: boolean;
  hd: boolean;
  /** Comments and prayer requests from the app, and polls */
  audience: boolean;
  /** How many saved looks */
  kits: number;
  clips: boolean;
  schedule: boolean;
  /** Reports across every parish on the account */
  allParishes: boolean;
}

export const FREE_ALLOWANCE: StudioAllowance = { plan: 'free', platforms: 2, hours: 3, watermark: true, transcript: false, analytics: false, hd: false, audience: false, kits: 0, clips: false, schedule: false, allParishes: false };
export const PREMIUM_ALLOWANCE: StudioAllowance = { plan: 'premium', platforms: 8, hours: Infinity, watermark: false, transcript: true, analytics: true, hd: true, audience: true, kits: 5, clips: true, schedule: true, allParishes: false };
export const ENTERPRISE_ALLOWANCE: StudioAllowance = { ...PREMIUM_ALLOWANCE, plan: 'enterprise', kits: Infinity, allParishes: true };
export const TESTING_ALLOWANCE: StudioAllowance = { ...ENTERPRISE_ALLOWANCE, plan: 'testing', watermark: true };

export function allowanceFor(pricingOn: boolean, tier: StudioTier): StudioAllowance {
  if (!pricingOn) return TESTING_ALLOWANCE;
  return tier === 'enterprise' ? ENTERPRISE_ALLOWANCE : tier === 'premium' ? PREMIUM_ALLOWANCE : FREE_ALLOWANCE;
}

/** The plan a subscription stands for. A plan's id names its tier, such as enterprise-monthly. */
export function tierOf(sub: { plan_id: string; status: string } | null): StudioTier {
  if (!sub || !['active', 'non_renewing'].includes(sub.status)) return 'free';
  return /enterprise/i.test(sub.plan_id) ? 'enterprise' : 'premium';
}

const RANK: StudioTier[] = ['free', 'premium', 'enterprise'];

export function useStudioAllowance(signedIn: boolean): StudioAllowance {
  const [tier, setTier] = useState<StudioTier>('free');
  useEffect(() => {
    if (!PRICING_ON || !signedIn) return;
    let live = true;
    myAdminParishes()
      .then(list => Promise.all(list.map(m => getSubscription(m.parish.id))))
      .then(subs => { if (live) setTier(subs.map(tierOf).reduce((best, t) => (RANK.indexOf(t) > RANK.indexOf(best) ? t : best), 'free' as StudioTier)); })
      .catch(() => {});
    return () => { live = false; };
  }, [signedIn]);
  return allowanceFor(PRICING_ON, tier);
}

/** Roughly how much upload speed a number of platforms needs: each is sent the whole stream */
export const MBPS_PER_PLATFORM = 3.5;
export const uploadNeeded = (platforms: number, quality: '720p' | '1080p' = '720p') => platforms * (quality === '1080p' ? 6.5 : MBPS_PER_PLATFORM);
export const dataPerHour = (platforms: number, quality: '720p' | '1080p' = '720p') => platforms * (quality === '1080p' ? 2.8 : 1.35);

/** Giving during a service waits for the payment gateway. Everything is built; this opens it. */
export const GIVING_ON = import.meta.env.VITE_GIVING_ON === 'true';

/** How full the goal bar is, 0 to 1 */
export function goalShare(raised: number, target: number): number {
  if (!Number.isFinite(raised) || !Number.isFinite(target) || target <= 0 || raised <= 0) return 0;
  return Math.min(1, raised / target);
}

export const STUDIO_PLANS: { name: string; tier: StudioTier; features: string[] }[] = [
  { name: 'Free', tier: 'free', features: ['Up to 2 platforms at once', 'Up to 3 hours at a stretch', '720p', 'Your logo beside our small mark'] },
  { name: 'Premium', tier: 'premium', features: ['Up to 8 platforms at once', 'No time limit', '1080p', 'Your logo in place of our mark', 'Live captions, a transcript and sermon notes', 'Viewers, reactions and past broadcasts', 'Comments, prayer requests and polls', 'Saved brand looks', 'Upright clips for TikTok and Instagram', 'Scheduled recorded services', 'Receive gifts during the service'] },
  { name: 'Enterprise', tier: 'enterprise', features: ['Everything in Premium', 'Reports across all your parishes', 'Unlimited brand looks', 'A person to help you set up'] },
];
