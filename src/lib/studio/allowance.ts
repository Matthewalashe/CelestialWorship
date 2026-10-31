import { useEffect, useState } from 'react';
import { PRICING_ON, hasPlan } from '../plan';
import { myAdminParishes } from '../parishAdmin';

/**
 * What the Live Studio allows. Our mark stays on every stream, recording and picture unless the church has upgraded.
 * While PRICING_ON is false nobody can upgrade, so the other limits sleep and only the mark is on.
 */

export interface StudioAllowance {
  plan: 'free' | 'paid' | 'testing';
  /** How many platforms at once */
  platforms: number;
  /** How long one stream may run, in hours */
  hours: number;
  watermark: boolean;
  transcript: boolean;
  /** Viewers, reactions and past broadcasts */
  analytics: boolean;
}

export const FREE_ALLOWANCE: StudioAllowance = { plan: 'free', platforms: 2, hours: 3, watermark: true, transcript: false, analytics: false };
export const PAID_ALLOWANCE: StudioAllowance = { plan: 'paid', platforms: Infinity, hours: Infinity, watermark: false, transcript: true, analytics: true };
export const TESTING_ALLOWANCE: StudioAllowance = { ...PAID_ALLOWANCE, plan: 'testing', watermark: true };

export function allowanceFor(pricingOn: boolean, paid: boolean): StudioAllowance {
  if (!pricingOn) return TESTING_ALLOWANCE;
  return paid ? PAID_ALLOWANCE : FREE_ALLOWANCE;
}

export function useStudioAllowance(signedIn: boolean): StudioAllowance {
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    if (!PRICING_ON || !signedIn) return;
    let live = true;
    myAdminParishes()
      .then(list => Promise.all(list.map(m => hasPlan(m.parish.id))))
      .then(plans => { if (live) setPaid(plans.some(Boolean)); })
      .catch(() => {});
    return () => { live = false; };
  }, [signedIn]);
  return allowanceFor(PRICING_ON, paid);
}

/** Roughly how much upload speed a number of platforms needs: each is sent the whole stream */
export const MBPS_PER_PLATFORM = 3.5;
export const uploadNeeded = (platforms: number) => platforms * MBPS_PER_PLATFORM;
