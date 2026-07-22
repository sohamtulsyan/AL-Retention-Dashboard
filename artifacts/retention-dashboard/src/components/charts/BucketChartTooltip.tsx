import { formatBucketTooltipLabel } from '@/lib/bucketLabels';

type Grain = 'Daily' | 'Weekly' | 'Monthly' | string | undefined;

interface BucketChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: unknown;
    name?: string;
    color?: string;
    dataKey?: string | number;
    payload?: Record<string, unknown>;
  }>;
  label?: string | number;
  grain?: Grain;
}

function formatPctWithAbs(pct: number, retained: unknown, cohort: unknown): string {
  const pctStr = `${Number(pct).toFixed(2)}%`;
  if (retained == null || cohort == null) return pctStr;
  return `${pctStr} (${Number(retained).toLocaleString()}/${Number(cohort).toLocaleString()})`;
}

function isPercentSeries(name: string, dataKey: string): boolean {
  if (/^D\d+$/.test(dataKey)) return true;
  const n = name.toLowerCase();
  return n.includes('%') || n.includes('retention') || n.includes('fraction');
}

export function BucketChartTooltip({ active, payload, label, grain }: BucketChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  const bucket = String(label ?? row?.bucket ?? '');
  const coveredStart = row?.coveredStart as string | undefined;
  const coveredEnd = row?.coveredEnd as string | undefined;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-mono text-sm text-muted-foreground mb-2">
        {formatBucketTooltipLabel(bucket, grain, coveredStart, coveredEnd)}
      </p>
      {payload.map((p, i) => {
        if (p.value == null) return null;
        const name = p.name ?? '';
        const dataKey = String(p.dataKey ?? '');
        const rowData = (p.payload ?? {}) as Record<string, unknown>;

        let formatted: string;
        if (typeof p.value === 'number' && isPercentSeries(name, dataKey)) {
          const retainedKey = rowData[`${dataKey}_retained`];
          const cohortKey = rowData[`${dataKey}_cohort`];
          if (retainedKey != null && cohortKey != null) {
            formatted = formatPctWithAbs(p.value, retainedKey, cohortKey);
          } else if (rowData.signups != null) {
            const den = rowData.nuuCount ?? rowData.activeUsers ?? rowData.ouuCount;
            formatted = formatPctWithAbs(p.value, rowData.signups, den);
          } else {
            formatted = `${Number(p.value).toFixed(2)}%`;
          }
        } else if (typeof p.value === 'number') {
          formatted = p.value.toLocaleString();
        } else {
          formatted = String(p.value);
        }

        return (
          <div key={i} className="flex justify-between gap-4 font-mono text-sm mb-1">
            <span style={{ color: p.color }}>{name}</span>
            <span>{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}
