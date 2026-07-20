import { MIN_ELIGIBLE_FRACTION } from '@/lib/retentionCensoring';

export function RetentionCensoringNote() {
  const pct = Math.round(MIN_ELIGIBLE_FRACTION * 100);
  return (
    <p className="text-xs text-muted-foreground mt-3">
      Partial first/last weekly or monthly buckets are hidden. Retention points are omitted when
      the horizon is not observable, the eligible cohort is zero, or fewer than {pct}% of the
      bucket&apos;s active users can be measured for that horizon (majority right-censored near
      timeline end).
    </p>
  );
}
