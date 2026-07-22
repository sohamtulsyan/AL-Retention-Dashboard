/** Helpers for hiding PRD-flagged censored buckets from dashboard charts. */

import { addDays, parseISO, startOfDay } from 'date-fns';

export type CensorSide = 'left' | 'right' | 'both' | null | undefined;

/**
 * Minimum share of the bucket base that must be eligible for horizon N to plot.
 * Right-censoring shrinks totalCohort toward the timeline end; a valid 0% on 8/500
 * users is not comparable to 25% on 400/500 — hide when the majority is censored.
 */
export const MIN_ELIGIBLE_FRACTION = 0.8;

export interface CensoredBucket {
  partialBucket?: boolean;
  censorSide?: CensorSide;
  coveredStart?: string;
}

export interface RetentionHorizon {
  retentionPercent?: unknown;
  totalCohort?: number | null;
  censored?: number | null;
  totalActiveInBucket?: number | null;
  totalNuuInBucket?: number | null;
  totalOuuInBucket?: number | null;
}

export interface RetentionDisplayContext {
  horizonKey?: string;
  coveredStart?: string;
  timelineEnd?: string;
}

/** Left/right partial calendar buckets (User Growth §6) — not comparable to full buckets. */
export function isEdgeCensoredBucket(bucket: CensoredBucket | null | undefined): boolean {
  return bucket?.partialBucket === true;
}

export function parseHorizonDays(horizonKey: string): number | null {
  const m = /^D(\d+)$/.exec(horizonKey);
  return m ? Number(m[1]) : null;
}

/** Fixed bucket base before horizon censoring (Rolling §3: same for every N in a bucket). */
export function retentionBucketBase(horizon: RetentionHorizon | null | undefined): number | null {
  if (!horizon) return null;
  const explicit = horizon.totalActiveInBucket ?? horizon.totalNuuInBucket ?? horizon.totalOuuInBucket;
  if (explicit != null && explicit > 0) return explicit;
  const cohort = horizon.totalCohort ?? 0;
  const censored = horizon.censored ?? 0;
  const reconstructed = cohort + censored;
  return reconstructed > 0 ? reconstructed : null;
}

/** Share of the bucket base that is eligible for this horizon (1 = fully observed). */
export function retentionEligibleFraction(horizon: RetentionHorizon | null | undefined): number | null {
  if (!horizon) return null;
  const base = retentionBucketBase(horizon);
  if (base == null || base === 0) return null;
  return (horizon.totalCohort ?? 0) / base;
}

/**
 * True when at least one user in the bucket could reach D0+N inside the timeline.
 * Matches backend: d0 + N ≤ timelineEnd (Common Framework §4.1).
 * Uses coveredStart (earliest in-window day in the bucket) as the earliest possible D0.
 */
export function isHorizonObservableForBucket(
  coveredStart: string | undefined,
  horizonDays: number,
  timelineEnd: string | undefined,
): boolean {
  if (!coveredStart || !timelineEnd) return true;
  const start = startOfDay(parseISO(coveredStart));
  const end = startOfDay(parseISO(timelineEnd));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
  const latestTarget = startOfDay(addDays(start, horizonDays));
  return latestTarget.getTime() <= end.getTime();
}

/**
 * Whether a retention point should be drawn.
 *
 * Hides when:
 * - backend sent N/A or zero eligible cohort (hard right-censor)
 * - earliest D0 in bucket cannot reach D+N before timelineEnd (bucket unobservable for N)
 * - eligible fraction totalCohort / bucketBase < MIN_ELIGIBLE_FRACTION (majority right-censored)
 */
export function isRetentionHorizonDisplayable(
  horizon: RetentionHorizon | null | undefined,
  ctx: RetentionDisplayContext = {},
): boolean {
  if (!horizon) return false;

  const totalCohort = horizon.totalCohort ?? 0;
  if (totalCohort === 0) return false;

  const horizonDays = ctx.horizonKey ? parseHorizonDays(ctx.horizonKey) : null;
  if (
    horizonDays != null &&
    !isHorizonObservableForBucket(ctx.coveredStart, horizonDays, ctx.timelineEnd)
  ) {
    return false;
  }

  const eligibleFraction = retentionEligibleFraction(horizon);
  if (eligibleFraction != null && eligibleFraction < MIN_ELIGIBLE_FRACTION) {
    return false;
  }

  const v = horizon.retentionPercent;
  if (v == null || v === 'N/A') return false;
  const n = Number(v);
  return !Number.isNaN(n);
}

export function toRetentionPercent(
  horizon: RetentionHorizon | null | undefined,
  ctx: RetentionDisplayContext = {},
): number | null {
  if (!isRetentionHorizonDisplayable(horizon, ctx)) return null;
  return +Number(horizon!.retentionPercent).toFixed(2);
}

export function filterEdgeCensoredBuckets<T extends CensoredBucket>(buckets: readonly T[]): T[] {
  return buckets.filter((b) => !isEdgeCensoredBucket(b));
}
