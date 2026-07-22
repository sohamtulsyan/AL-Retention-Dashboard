import { useAnalysis, useOuuRetention } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useMemo } from 'react';
import { bucketAxisBottomMargin } from '@/lib/bucketLabels';
import { createBucketAxisTick } from '@/lib/bucketAxisTick';
import { BucketChartTooltip } from '@/components/charts/BucketChartTooltip';
import { RetentionCensoringNote } from '@/components/charts/RetentionCensoringNote';
import { filterEdgeCensoredBuckets, toRetentionPercent } from '@/lib/retentionCensoring';
import {
  filterBucketsByTimeline,
  formatTimelineRange,
  timelinesMatch,
} from '@/lib/timelineFilter';
import { AlertCircle } from 'lucide-react';

const HORIZON_COLORS: Record<string, string> = {
  D1: 'hsl(var(--chart-1))',
  D3: 'hsl(var(--chart-2))',
  D7: 'hsl(var(--chart-3))',
  D30: 'hsl(var(--chart-5))',
};

type ChartRow = {
  bucket: string;
  coveredStart?: string;
  coveredEnd?: string;
};

function useBucketAxis(grain: string | undefined, rows: ChartRow[]) {
  const axisBottom = bucketAxisBottomMargin(grain);
  const tick = useMemo(() => createBucketAxisTick(grain, rows), [grain, rows]);
  return { axisBottom, tick };
}

function bucketVolume(b: any): number | null {
  const horizons = b.horizons ?? {};
  for (const key of Object.keys(horizons)) {
    const v = horizons[key]?.totalOuuInBucket;
    if (v != null) return v;
  }
  return null;
}

function mapRetentionRows(
  buckets: any[],
  timelineStart: string | undefined,
  timelineEnd: string | undefined,
) {
  const filtered = filterBucketsByTimeline(
    filterEdgeCensoredBuckets(buckets),
    timelineStart,
    timelineEnd,
  );
  return filtered.map((b: any) => {
    const ctx = (key: string) => ({
      horizonKey: key,
      coveredStart: b.coveredStart as string | undefined,
      timelineEnd,
    });
    const row: Record<string, string | number | null | undefined> = {
      bucket: b.bucket,
      coveredStart: b.coveredStart,
      coveredEnd: b.coveredEnd,
    };
    for (const key of Object.keys(b.horizons ?? {})) {
      const h = b.horizons[key];
      row[key] = toRetentionPercent(h, ctx(key));
      const displayable = row[key] != null;
      row[`${key}_retained`] = displayable ? (h?.retainedCohort ?? null) : null;
      row[`${key}_cohort`] = displayable ? (h?.totalCohort ?? null) : null;
    }
    return row;
  });
}

function OuuRetentionChart({
  title,
  description,
  grain,
  rows,
}: {
  title: string;
  description: string;
  grain: string;
  rows: Record<string, string | number | null | undefined>[];
}) {
  const axis = useBucketAxis(grain, rows as ChartRow[]);
  const horizons = useMemo(() => {
    const first = rows[0] ?? {};
    return Object.keys(first)
      .filter((k) => /^D\d+$/.test(k))
      .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No OUU retention data for this timeline
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: axis.axisBottom }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="bucket"
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={axis.tick}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip content={<BucketChartTooltip grain={grain} />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--app-font-mono)' }} />
              {horizons.map((h) => (
                <Line
                  key={h}
                  type="monotone"
                  dataKey={h}
                  stroke={HORIZON_COLORS[h] || 'hsl(var(--muted))'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  name={h}
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

export default function OUU() {
  const { data: analysis } = useAnalysis();
  const { data: ouuData, isLoading } = useOuuRetention();

  const timelineStart = analysis?.timelineStart ?? ouuData?.timelineStart;
  const timelineEnd = analysis?.timelineEnd ?? ouuData?.timelineEnd;
  const ouuGrain = ouuData?.grain ?? analysis?.grain ?? '';
  const timelineLabel = formatTimelineRange(timelineStart, timelineEnd);

  const ouuStale =
    analysis?.timelineStart &&
    analysis?.timelineEnd &&
    ouuData &&
    !timelinesMatch(
      analysis.timelineStart,
      analysis.timelineEnd,
      ouuData.timelineStart,
      ouuData.timelineEnd,
    );

  const ouuVolumeData = useMemo(() => {
    const buckets: any[] = ouuData?.metrics?.strictRetention?.buckets ?? [];
    const filtered = filterBucketsByTimeline(
      filterEdgeCensoredBuckets(buckets),
      timelineStart,
      timelineEnd,
    );
    return filtered.map((b: any) => ({
      bucket: b.bucket,
      coveredStart: b.coveredStart,
      coveredEnd: b.coveredEnd,
      count: bucketVolume(b),
    }));
  }, [ouuData, timelineStart, timelineEnd]);

  const strictRows = useMemo(
    () => mapRetentionRows(ouuData?.metrics?.strictRetention?.buckets ?? [], timelineStart, timelineEnd),
    [ouuData, timelineStart, timelineEnd],
  );
  const cumulativeRows = useMemo(
    () =>
      mapRetentionRows(ouuData?.metrics?.cumulativeRetention?.buckets ?? [], timelineStart, timelineEnd),
    [ouuData, timelineStart, timelineEnd],
  );
  const consecutiveRows = useMemo(
    () =>
      mapRetentionRows(ouuData?.metrics?.consecutiveRetention?.buckets ?? [], timelineStart, timelineEnd),
    [ouuData, timelineStart, timelineEnd],
  );

  const volumeAxis = useBucketAxis(ouuGrain, ouuVolumeData);
  const grainLabel = ouuGrain.toLowerCase() || 'period';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OUU</h1>
          <p className="text-muted-foreground">
            Old Unique Users — returning users anchored on first activity in each {grainLabel}
          </p>
          {timelineLabel && (
            <p className="text-sm font-mono text-muted-foreground mt-1">{timelineLabel}</p>
          )}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {timelineLabel && (
            <Badge variant="secondary" className="font-mono">
              {timelineLabel}
            </Badge>
          )}
          {ouuGrain && <Badge variant="outline" className="font-mono">OUU {ouuGrain}</Badge>}
        </div>
      </div>

      {ouuStale && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            OUU results are out of date for the current analysis period ({timelineLabel}).
            Run a full pipeline or change grain to recompute OUU metrics.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      ) : !ouuData?.metrics ? (
        <div className="text-center p-12 border rounded-lg border-dashed">
          <p className="text-muted-foreground">
            No OUU data. Run the pipeline to generate it.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>OUU Volume</CardTitle>
              <CardDescription>
                Old Unique Users per {grainLabel} (counted once on their in-bucket D0)
                {timelineLabel ? ` · ${timelineLabel}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ouuVolumeData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No OUU data for this timeline
                </p>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={ouuVolumeData}
                      margin={{ top: 10, right: 16, left: 0, bottom: volumeAxis.axisBottom }}
                    >
                      <defs>
                        <linearGradient id="ouuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={volumeAxis.tick}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      />
                      <RechartsTooltip content={<BucketChartTooltip grain={ouuGrain} />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#ouuGrad)"
                        name="OUU"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

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
            </TabsList>

            <TabsContent value="strict" className="mt-0">
              <OuuRetentionChart
                title="OUU Strict Retention"
                description={`% of OUU cohort returning on exactly day N, by cohort ${grainLabel}${timelineLabel ? ` · ${timelineLabel}` : ''}`}
                grain={ouuGrain}
                rows={strictRows}
              />
            </TabsContent>
            <TabsContent value="cumulative" className="mt-0">
              <OuuRetentionChart
                title="OUU Cumulative Retention"
                description={`% of OUU cohort returning on any day in D1…DN, by cohort ${grainLabel}${timelineLabel ? ` · ${timelineLabel}` : ''}`}
                grain={ouuGrain}
                rows={cumulativeRows}
              />
            </TabsContent>
            <TabsContent value="consecutive" className="mt-0">
              <OuuRetentionChart
                title="OUU Consecutive Retention"
                description={`% of OUU cohort active every day in D1…DN, by cohort ${grainLabel}${timelineLabel ? ` · ${timelineLabel}` : ''}`}
                grain={ouuGrain}
                rows={consecutiveRows}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
