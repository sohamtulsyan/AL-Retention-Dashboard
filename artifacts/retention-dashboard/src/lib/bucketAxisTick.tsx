import { formatBucketTickLines } from '@/lib/bucketLabels';

type Grain = 'Daily' | 'Weekly' | 'Monthly' | string | undefined;

export interface BucketCoveredRange {
  start?: string;
  end?: string;
}

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value?: string };
  index?: number;
}

export function createBucketAxisTick(
  grain: Grain,
  coveredRangeAt: (index: number) => BucketCoveredRange | undefined,
  fontSize = 11,
) {
  return function BucketAxisTick({ x = 0, y = 0, payload, index = 0 }: TickProps) {
    const bucket = payload?.value ?? '';
    const range = coveredRangeAt(index) ?? {};
    const lines = formatBucketTickLines(bucket, grain, range.start, range.end);

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
