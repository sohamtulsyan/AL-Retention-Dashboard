import { format, getISOWeek, parse, parseISO } from 'date-fns';

type Grain = 'Daily' | 'Weekly' | 'Monthly' | string | undefined;

export interface BucketTickLines {
  primary: string;
  secondary?: string;
}

/** Monday of the ISO week encoded in `YYYY-Www`. */
function parseIsoWeekMonday(bucket: string): Date | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(bucket);
  if (!m) return null;
  const monday = parse(`${m[1]}-W${m[2]}-1`, "RRRR-'W'II-i", new Date());
  return Number.isNaN(monday.getTime()) ? null : monday;
}

function parseMonthStart(bucket: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(bucket);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}

function parseWeekNumber(bucket: string): number | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(bucket);
  return m ? Number(m[2]) : null;
}

function parseDayBucket(bucket: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bucket)) return null;
  const parsed = parseISO(bucket);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function bucketStartDate(bucket: string, coveredStart?: string): Date | null {
  if (coveredStart) {
    const parsed = parseISO(coveredStart);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return parseDayBucket(bucket) ?? parseIsoWeekMonday(bucket) ?? parseMonthStart(bucket);
}

export function bucketEndDate(bucket: string, coveredEnd?: string): Date | null {
  if (coveredEnd) {
    const parsed = parseISO(coveredEnd);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const weekStart = parseIsoWeekMonday(bucket);
  if (weekStart) {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }
  const monthStart = parseMonthStart(bucket);
  if (monthStart) {
    return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  }
  return parseDayBucket(bucket);
}

/** Compact range for axis secondary line and tooltips. */
export function formatBucketDateRange(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return format(start, 'MMM d, yyyy');

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
  }
  if (sameYear) {
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}

/** Two-line axis label: primary row + optional date-range row. */
export function formatBucketTickLines(
  bucket: string,
  grain?: Grain,
  coveredStart?: string,
  coveredEnd?: string,
): BucketTickLines {
  const start = bucketStartDate(bucket, coveredStart);
  const end = bucketEndDate(bucket, coveredEnd);

  if (grain === 'Weekly') {
    const weekNum = parseWeekNumber(bucket) ?? (start ? getISOWeek(start) : null);
    return {
      primary: weekNum != null ? `Week ${weekNum}` : bucket,
      secondary: start && end ? formatBucketDateRange(start, end) : undefined,
    };
  }

  if (grain === 'Monthly') {
    return {
      primary: start ? format(start, 'MMMM yyyy') : bucket,
      secondary: start && end ? formatBucketDateRange(start, end) : undefined,
    };
  }

  return {
    primary: start ? format(start, 'MMM d, yyyy') : bucket,
  };
}

/** @deprecated Use formatBucketTickLines for charts. */
export function formatBucketTick(bucket: string, grain?: Grain, coveredStart?: string): string {
  const lines = formatBucketTickLines(bucket, grain, coveredStart);
  return lines.secondary ? `${lines.primary}\n${lines.secondary}` : lines.primary;
}

export function formatBucketTooltipLabel(
  bucket: string,
  grain?: Grain,
  coveredStart?: string,
  coveredEnd?: string,
): string {
  const start = bucketStartDate(bucket, coveredStart);
  const end = bucketEndDate(bucket, coveredEnd);

  if (grain === 'Weekly') {
    const weekNum = parseWeekNumber(bucket) ?? (start ? getISOWeek(start) : null);
    if (start && end) {
      const range = formatBucketDateRange(start, end);
      return weekNum != null ? `Week ${weekNum}: ${range}` : range;
    }
    return weekNum != null ? `Week ${weekNum}` : bucket;
  }

  if (grain === 'Monthly') {
    if (start && end) {
      const range = formatBucketDateRange(start, end);
      const month = format(start, 'MMMM yyyy');
      return `${month}: ${range}`;
    }
  }

  if (start && end && grain === 'Daily') {
    return format(start, 'MMM d, yyyy');
  }

  const lines = formatBucketTickLines(bucket, grain, coveredStart, coveredEnd);
  if (lines.secondary) return `${lines.primary} · ${lines.secondary}`;
  return lines.primary;
}

/** Extra chart bottom margin for multi-line bucket labels. */
export function bucketAxisBottomMargin(grain?: Grain): number {
  if (grain === 'Weekly' || grain === 'Monthly') return 56;
  return 8;
}
