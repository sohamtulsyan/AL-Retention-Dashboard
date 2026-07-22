import { formatBucketTickLines } from '@/lib/bucketLabels';

type Grain = 'Daily' | 'Weekly' | 'Monthly' | string | undefined;

export interface BucketChartRow {
  bucket: string;
  coveredStart?: string;
  coveredEnd?: string;
}

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value?: string };
}

/** Axis tick that resolves covered dates by bucket key (not array index). */
export function createBucketAxisTick(
  grain: Grain,
  rows: BucketChartRow[],
  fontSize = 11,
) {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));

  return function BucketAxisTick({ x = 0, y = 0, payload }: TickProps) {
    const bucket = String(payload?.value ?? '');
    const row = byBucket.get(bucket);
    const lines = formatBucketTickLines(bucket, grain, row?.coveredStart, row?.coveredEnd);

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize={fontSize}
        >
          <tspan x={0} dy={14}>
            {lines.primary}
          </tspan>
          {lines.secondary ? (
            <tspan x={0} dy={14} fontSize={fontSize - 1} opacity={0.75}>
              {lines.secondary}
            </tspan>
          ) : null}
        </text>
      </g>
    );
  };
}
