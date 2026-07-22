import { useAnalysis } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMemo } from 'react';
import { bucketAxisBottomMargin, formatBucketTooltipLabel } from '@/lib/bucketLabels';
import { createBucketAxisTick, type BucketChartRow } from '@/lib/bucketAxisTick';
import { RetentionCensoringNote } from '@/components/charts/RetentionCensoringNote';
import {
  filterEdgeCensoredBuckets,
  isRetentionHorizonDisplayable,
  toRetentionPercent,
} from '@/lib/retentionCensoring';

const COLORS: Record<string, string> = {
  D1: 'hsl(var(--chart-1))',
  D3: 'hsl(var(--chart-2))',
  D7: 'hsl(var(--primary))',
  D30: 'hsl(var(--chart-4))',
};

function RetentionChart({
  metric,
  timelineEnd,
  title,
  description,
}: {
  metric: any;
  timelineEnd?: string;
  title: string;
  description: string;
}) {
  const buckets: any[] = metric?.buckets ?? [];
  const grain = metric?.grain;

  const chartData = useMemo(() => {
    return filterEdgeCensoredBuckets(buckets).map((b: any) => {
      const row: BucketChartRow & Record<string, string | number | null> = {
        bucket: b.bucket,
        coveredStart: b.coveredStart,
        coveredEnd: b.coveredEnd,
      };
      const horizons = b.horizons ?? {};
      for (const [key, h] of Object.entries(horizons) as [string, any][]) {
        const ctx = {
          horizonKey: key,
          coveredStart: b.coveredStart as string | undefined,
          timelineEnd,
        };
        row[key] = toRetentionPercent(h, ctx);
        row[`${key}_cohort`] = isRetentionHorizonDisplayable(h, ctx) ? (h?.totalCohort ?? null) : null;
        row[`${key}_retained`] = isRetentionHorizonDisplayable(h, ctx) ? (h?.retainedCohort ?? null) : null;
      }
      return row;
    });
  }, [buckets, timelineEnd]);

  const horizons = useMemo(() => {
    const first = filterEdgeCensoredBuckets(buckets)[0]?.horizons ?? {};
    return Object.keys(first).sort(
      (a, b) => parseInt(a.replace('D', ''), 10) - parseInt(b.replace('D', ''), 10),
    );
  }, [buckets]);

  const axisBottom = bucketAxisBottomMargin(grain);
  const bucketTick = useMemo(
    () => createBucketAxisTick(grain, chartData),
    [grain, chartData],
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const coveredStart = payload[0]?.payload?.coveredStart as string | undefined;
    const coveredEnd = payload[0]?.payload?.coveredEnd as string | undefined;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-mono text-sm text-muted-foreground mb-2">
          {formatBucketTooltipLabel(String(label), grain, coveredStart, coveredEnd)}
        </p>
        {payload.map((p: any, i: number) => {
          const cohort = p.payload[`${p.dataKey}_cohort`];
          const retained = p.payload[`${p.dataKey}_retained`];
          if (p.value == null) return null;
          const abs =
            retained != null && cohort != null
              ? ` (${Number(retained).toLocaleString()}/${Number(cohort).toLocaleString()})`
              : cohort != null
                ? ` (cohort ${Number(cohort).toLocaleString()})`
                : '';
          return (
            <div key={i} className="flex justify-between gap-4 font-mono text-sm mb-1">
              <span style={{ color: p.color }}>
                {p.name}: {p.value}%{abs}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (buckets.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center border border-dashed rounded-lg text-muted-foreground">
        No retention data available
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center border border-dashed rounded-lg text-muted-foreground">
        No fully-covered buckets in this timeline
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: axisBottom }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="bucket"
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={bucketTick}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
              {horizons.map((h) => (
                <Line
                  key={h}
                  type="monotone"
                  dataKey={h}
                  stroke={COLORS[h] || 'hsl(var(--muted))'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <RetentionCensoringNote />
      </CardContent>
    </Card>
  );
}

export default function Retention() {
  const { data: analysis, isLoading, error } = useAnalysis();
  const metrics = analysis?.metrics;
  const grain = analysis?.grain;

  if (error) {
    return (
      <div className="p-8 border border-destructive/50 bg-destructive/10 rounded-lg">
        <h2 className="text-destructive font-mono font-bold mb-2">DATA FETCH ERROR</h2>
        <p className="font-mono text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retention Curves</h1>
          <p className="text-muted-foreground">Cohort performance across multiple horizon models</p>
        </div>
        {grain && (
          <Badge variant="outline" className="font-mono">
            {grain}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-[500px] w-full" />
      ) : metrics ? (
        <Tabs defaultValue="strict" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="strict" className="font-mono">
              Strict
            </TabsTrigger>
            <TabsTrigger value="cumulative" className="font-mono">
              Cumulative
            </TabsTrigger>
            <TabsTrigger value="consecutive" className="font-mono">
              Consecutive
            </TabsTrigger>
            <TabsTrigger value="rolling" className="font-mono">
              Rolling
            </TabsTrigger>
          </TabsList>

          <TabsContent value="strict" className="mt-0">
            <RetentionChart
              metric={metrics.strictRetention}
              timelineEnd={analysis?.timelineEnd}
              title="Strict Retention"
              description="Users returning exactly on day N"
            />
          </TabsContent>
          <TabsContent value="cumulative" className="mt-0">
            <RetentionChart
              metric={metrics.cumulativeRetention}
              timelineEnd={analysis?.timelineEnd}
              title="Cumulative Retention"
              description="Users returning on or before day N"
            />
          </TabsContent>
          <TabsContent value="consecutive" className="mt-0">
            <RetentionChart
              metric={metrics.consecutiveRetention}
              timelineEnd={analysis?.timelineEnd}
              title="Consecutive Retention"
              description="Users returning every day up to day N"
            />
          </TabsContent>
          <TabsContent value="rolling" className="mt-0">
            <RetentionChart
              metric={metrics.rollingRetention}
              timelineEnd={analysis?.timelineEnd}
              title="Rolling Retention"
              description="Users returning on day N or any day after"
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center p-12 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No analysis data found. Run the pipeline first.</p>
        </div>
      )}
    </div>
  );
}
