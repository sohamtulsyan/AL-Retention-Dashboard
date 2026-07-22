import { parseISO, startOfDay } from 'date-fns';
import { bucketEndDate, bucketStartDate } from '@/lib/bucketLabels';

export function parseTimelineDate(value?: string): Date | null {
  if (!value) return null;
  const raw = value.length === 10 ? value : value.slice(0, 10);
  const d = parseISO(raw);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export interface TimelineBucket {
  bucket?: string;
  coveredStart?: string;
  coveredEnd?: string;
}

function bucketRange(bucket: TimelineBucket): { start: Date; end: Date } | null {
  const start =
    (bucket.coveredStart ? parseTimelineDate(bucket.coveredStart) : null) ??
    (bucket.bucket ? bucketStartDate(bucket.bucket) : null);
  const end =
    (bucket.coveredEnd ? parseTimelineDate(bucket.coveredEnd) : null) ??
    (bucket.bucket ? bucketEndDate(bucket.bucket) : null);
  if (!start || !end) return null;
  return { start, end };
}

/** Keep buckets that overlap the analysis timeline (inclusive). */
export function filterBucketsByTimeline<T extends TimelineBucket>(
  buckets: readonly T[],
  timelineStart?: string,
  timelineEnd?: string,
): T[] {
  const tStart = parseTimelineDate(timelineStart);
  const tEnd = parseTimelineDate(timelineEnd);
  if (!tStart || !tEnd) return [...buckets];

  return buckets.filter((b) => {
    const range = bucketRange(b);
    if (!range) return true;
    return range.start.getTime() <= tEnd.getTime() && range.end.getTime() >= tStart.getTime();
  });
}

export function formatTimelineRange(start?: string, end?: string): string | null {
  const s = parseTimelineDate(start);
  const e = parseTimelineDate(end);
  if (!s || !e) return null;
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}`;
}

export function timelinesMatch(
  aStart?: string,
  aEnd?: string,
  bStart?: string,
  bEnd?: string,
): boolean {
  const as = parseTimelineDate(aStart)?.getTime();
  const ae = parseTimelineDate(aEnd)?.getTime();
  const bs = parseTimelineDate(bStart)?.getTime();
  const be = parseTimelineDate(bEnd)?.getTime();
  if (as == null || ae == null || bs == null || be == null) return true;
  return as === bs && ae === be;
}

/** Add coveredStart/End when only an ISO bucket key is present (e.g. nuu signup rows). */
export function enrichBucketDates<T extends { bucket: string }>(
  row: T,
): T & { coveredStart?: string; coveredEnd?: string } {
  const start = bucketStartDate(row.bucket);
  const end = bucketEndDate(row.bucket);
  return {
    ...row,
    coveredStart: start ? start.toISOString().slice(0, 10) : undefined,
    coveredEnd: end ? end.toISOString().slice(0, 10) : undefined,
  };
}
