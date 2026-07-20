import { format, parseISO } from 'date-fns';

type Grain = 'Daily' | 'Weekly' | 'Monthly' | string | undefined;

export interface BucketTickLines {
  primary: string;
  secondary?: string;
}

function parseWeekStart(bucket: string): Date | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(bucket);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const isoWeek1Monday = new Date(jan4);
  isoWeek1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  isoWeek1Monday.setUTCDate(isoWeek1Monday.getUTCDate() + (week - 1) * 7);
  return new Date(
    isoWeek1Monday.getUTCFullYear(),
    isoWeek1Monday.getUTCMonth(),
    isoWeek1Monday.getUTCDate(),
  );
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

export function bucketStartDate(bucket: string, coveredStart?: string): Date | null {
  if (coveredStart) {
    const parsed = parseISO(coveredStart);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return parseWeekStart(bucket) ?? parseMonthStart(bucket);
}

export function bucketEndDate(bucket: string, coveredEnd?: string): Date | null {
  if (coveredEnd) {
    const parsed = parseISO(coveredEnd);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const weekStart = parseWeekStart(bucket);
  if (weekStart) {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }
  const monthStart = parseMonthStart(bucket);
  if (monthStart) {
    return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  }
  return null;
}

/** Two-line axis label: primary row + optional end-date row. */
export function formatBucketTickLines(
  bucket: string,
  grain?: Grain,
  coveredStart?: string,
  coveredEnd?: string,
): BucketTickLines {
  if (grain === 'Weekly') {
    const weekNum = parseWeekNumber(bucket);
    const end = bucketEndDate(bucket, coveredEnd);
    return {
      primary: weekNum != null ? `Week ${weekNum}` : bucket,
      secondary: end ? format(end, 'MMM d, yyyy') : undefined,
    };
  }

  if (grain === 'Monthly') {
    const start = bucketStartDate(bucket, coveredStart);
    const end = bucketEndDate(bucket, coveredEnd);
    return {
      primary: start ? format(start, 'MMMM yyyy') : bucket,
      secondary: end ? format(end, 'MMM d, yyyy') : undefined,
    };
  }

  const day = bucketStartDate(bucket, coveredStart ?? bucket);
  return {
    primary: day ? format(day, 'MMM d, yyyy') : bucket,
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
  const lines = formatBucketTickLines(bucket, grain, coveredStart, coveredEnd);
  if (grain === 'Weekly' || grain === 'Monthly') {
    return lines.secondary ? `${lines.primary} · ends ${lines.secondary}` : lines.primary;
  }
  return lines.primary;
}

/** Extra chart bottom margin for multi-line bucket labels. */
export function bucketAxisBottomMargin(grain?: Grain): number {
  if (grain === 'Weekly' || grain === 'Monthly') return 56;
  return 8;
}
