import { useAnalysis, useNuuRetention, useSignupFraction, useNuuSignupFraction } from '@/lib/api';
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
  ComposedChart, Bar,
} from 'recharts';
import { useMemo } from 'react';
import { bucketAxisBottomMargin } from '@/lib/bucketLabels';
import { createBucketAxisTick } from '@/lib/bucketAxisTick';
import { BucketChartTooltip } from '@/components/charts/BucketChartTooltip';
import { filterEdgeCensoredBuckets, toRetentionPercent } from '@/lib/retentionCensoring';
import { RetentionCensoringNote } from '@/components/charts/RetentionCensoringNote';
import {
  enrichBucketDates,
  filterBucketsByTimeline,
  formatTimelineRange,
  timelinesMatch,
} from '@/lib/timelineFilter';
import { AlertCircle } from 'lucide-react';

const HORIZON_COLORS: Record<string, string> = {
  D1:  'hsl(var(--chart-1))',
  D3:  'hsl(var(--chart-2))',
  D7:  'hsl(var(--chart-3))',
  D30: 'hsl(var(--chart-5))',
};

function toPct(v: unknown): number | null {
  if (v == null || v === 'N/A') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : +n.toFixed(2);
}

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

function mapNuuRetentionRows(
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
      const h = b.horizons?.[key];
      row[key] = toRetentionPercent(h, ctx(key));
      const displayable = row[key] != null;
      row[`${key}_retained`] = displayable ? (h?.retainedCohort ?? null) : null;
      row[`${key}_cohort`] = displayable ? (h?.totalCohort ?? null) : null;
    }
    return row;
  });
}

function NuuRetentionChart({
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
      .filter((k) => k in HORIZON_COLORS)
      .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No NUU retention data for this timeline
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
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: axis.axisBottom }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
              <XAxis
                dataKey="bucket"
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={axis.tick}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`}/>
              <RechartsTooltip content={<BucketChartTooltip grain={grain} />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--app-font-mono)' }}/>
              {horizons.map(h => (
                <Line
                  key={h}
                  type="monotone"
                  dataKey={h}
                  stroke={HORIZON_COLORS[h]}
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

export default function NUU() {
  const { data: analysis } = useAnalysis();
  const { data: nuuData, isLoading: nuuLoading } = useNuuRetention();
  const { data: signupData, isLoading: signupLoading } = useSignupFraction();
  const { data: nuuSignupData, isLoading: nuuSignupLoading } = useNuuSignupFraction();

  const timelineStart = analysis?.timelineStart ?? nuuData?.timelineStart;
  const timelineEnd = analysis?.timelineEnd ?? nuuData?.timelineEnd;
  const nuuGrain = nuuData?.grain ?? analysis?.grain ?? '';
  const signupGrain = signupData?.grain ?? signupData?.metric?.grain ?? 'Weekly';
  const timelineLabel = formatTimelineRange(timelineStart, timelineEnd);

  const nuuStale =
    analysis?.timelineStart &&
    analysis?.timelineEnd &&
    nuuData &&
    !timelinesMatch(
      analysis.timelineStart,
      analysis.timelineEnd,
      nuuData.timelineStart,
      nuuData.timelineEnd,
    );

  const signupStale =
    analysis?.timelineStart &&
    analysis?.timelineEnd &&
    signupData &&
    !timelinesMatch(
      analysis.timelineStart,
      analysis.timelineEnd,
      signupData.timelineStart ?? signupData.metric?.timelineStart,
      signupData.timelineEnd ?? signupData.metric?.timelineEnd,
    );

  const nuuVolumeData = useMemo(() => {
    const buckets: any[] = nuuData?.metrics?.strictRetention?.buckets ?? [];
    const filtered = filterBucketsByTimeline(
      filterEdgeCensoredBuckets(buckets),
      timelineStart,
      timelineEnd,
    );
    return filtered.map((b: any) => {
      const total = b.horizons?.D1?.totalNuuInBucket ?? b.horizons?.D3?.totalNuuInBucket ?? null;
      return {
        bucket: b.bucket,
        coveredStart: b.coveredStart,
        coveredEnd: b.coveredEnd,
        count: total,
      };
    });
  }, [nuuData, timelineStart, timelineEnd]);

  const strictRows = useMemo(
    () => mapNuuRetentionRows(nuuData?.metrics?.strictRetention?.buckets ?? [], timelineStart, timelineEnd),
    [nuuData, timelineStart, timelineEnd],
  );
  const cumulativeRows = useMemo(
    () => mapNuuRetentionRows(nuuData?.metrics?.cumulativeRetention?.buckets ?? [], timelineStart, timelineEnd),
    [nuuData, timelineStart, timelineEnd],
  );
  const consecutiveRows = useMemo(
    () => mapNuuRetentionRows(nuuData?.metrics?.consecutiveRetention?.buckets ?? [], timelineStart, timelineEnd),
    [nuuData, timelineStart, timelineEnd],
  );

  const signupChartData = useMemo(() => {
    const buckets: any[] = signupData?.metric?.buckets ?? [];
    const filtered = filterBucketsByTimeline(
      filterEdgeCensoredBuckets(buckets),
      timelineStart,
      timelineEnd,
    );
    return filtered.map((b: any) => ({
      bucket: b.bucket,
      coveredStart: b.coveredStart,
      coveredEnd: b.coveredEnd,
      signupFraction: toPct(b.signupFractionPercent),
      activeUsers: b.activeUsers ?? 0,
      signups: b.signups ?? 0,
    }));
  }, [signupData, timelineStart, timelineEnd]);

  const nuuSignupChartData = useMemo(() => {
    const buckets: any[] = nuuSignupData?.buckets ?? [];
    const filtered = filterBucketsByTimeline(
      filterEdgeCensoredBuckets(buckets.map(enrichBucketDates)),
      timelineStart,
      timelineEnd,
    );
    return filtered.map((b: any) => ({
      bucket: b.bucket,
      coveredStart: b.coveredStart,
      coveredEnd: b.coveredEnd,
      signupFraction: toPct(b.signupFractionPercent),
      nuuCount: b.nuuCount ?? 0,
      signups: b.signups ?? 0,
    }));
  }, [nuuSignupData, timelineStart, timelineEnd]);

  const nuuVolumeAxis = useBucketAxis(nuuGrain, nuuVolumeData);
  const nuuSignupAxis = useBucketAxis(signupGrain, nuuSignupChartData);
  const signupAxis = useBucketAxis(signupGrain, signupChartData);

  const isLoading = nuuLoading || signupLoading || nuuSignupLoading;
  const totalSignups = signupData?.metric?.totalSignups ?? nuuSignupData?.totalSignups;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NUU &amp; Signup</h1>
          <p className="text-muted-foreground">New Unregistered Users and account conversion metrics</p>
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
          {nuuGrain && <Badge variant="outline" className="font-mono">NUU {nuuGrain}</Badge>}
          <Badge variant="outline" className="font-mono">Signup {signupGrain}</Badge>
          {totalSignups != null && (
            <Badge variant="secondary" className="font-mono">
              {totalSignups.toLocaleString()} total signups
            </Badge>
          )}
        </div>
      </div>

      {(nuuStale || signupStale) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            NUU/signup results are out of date for the current analysis period ({timelineLabel}).
            Run a full pipeline or change grain to recompute NUU and signup metrics.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[350px] w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      ) : (
        <div className="grid gap-6">

          <Card>
            <CardHeader>
              <CardTitle>NUU Volume</CardTitle>
              <CardDescription>
                New Unregistered Users per {nuuGrain.toLowerCase() || 'period'}
                {timelineLabel ? ` · ${timelineLabel}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nuuVolumeData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No NUU data for this timeline</p>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={nuuVolumeData} margin={{ top: 10, right: 16, left: 0, bottom: nuuVolumeAxis.axisBottom }}>
                      <defs>
                        <linearGradient id="nuuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="hsl(var(--chart-5))" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                      <XAxis
                        dataKey="bucket"
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={nuuVolumeAxis.tick}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
                      <RechartsTooltip content={<BucketChartTooltip grain={nuuGrain} />} />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--chart-5))" strokeWidth={2} fillOpacity={1} fill="url(#nuuGrad)" name="NUU"/>
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
              <NuuRetentionChart
                title="NUU Strict Retention"
                description={`% of NUU cohort returning on exactly day N, by cohort ${nuuGrain.toLowerCase() || 'period'}${timelineLabel ? ` · ${timelineLabel}` : ''}`}
                grain={nuuGrain}
                rows={strictRows}
              />
            </TabsContent>
            <TabsContent value="cumulative" className="mt-0">
              <NuuRetentionChart
                title="NUU Cumulative Retention"
                description={`% of NUU cohort returning on any day in D1…DN, by cohort ${nuuGrain.toLowerCase() || 'period'}${timelineLabel ? ` · ${timelineLabel}` : ''}`}
                grain={nuuGrain}
                rows={cumulativeRows}
              />
            </TabsContent>
            <TabsContent value="consecutive" className="mt-0">
              <NuuRetentionChart
                title="NUU Consecutive Retention"
                description={`% of NUU cohort active every day in D1…DN, by cohort ${nuuGrain.toLowerCase() || 'period'}${timelineLabel ? ` · ${timelineLabel}` : ''}`}
                grain={nuuGrain}
                rows={consecutiveRows}
              />
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Signup Fraction of NUUs</CardTitle>
              <CardDescription>
                Signups / new unique users (%) — conversion of NUUs into accounts
                {timelineLabel ? ` · ${timelineLabel}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nuuSignupChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No NUU signup fraction data. Run the pipeline to generate it.
                </p>
              ) : (
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={nuuSignupChartData} margin={{ top: 10, right: 16, left: 0, bottom: nuuSignupAxis.axisBottom }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                      <XAxis
                        dataKey="bucket"
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={nuuSignupAxis.tick}
                      />
                      <YAxis
                        yAxisId="users"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      />
                      <YAxis
                        yAxisId="pct"
                        orientation="right"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <RechartsTooltip content={<BucketChartTooltip grain={signupGrain} />} />
                      <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--app-font-mono)' }}/>
                      <Bar yAxisId="users" dataKey="nuuCount" fill="hsl(var(--chart-5)/0.25)" name="NUU" radius={[3, 3, 0, 0]}/>
                      <Line
                        yAxisId="pct"
                        type="monotone"
                        dataKey="signupFraction"
                        stroke="#1f4e79"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                        name="Signup / NUU %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signup Fraction</CardTitle>
              <CardDescription>
                Signups as % of active users, with weekly active user volume
                {timelineLabel ? ` · ${timelineLabel}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {signupChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No signup data for this timeline</p>
              ) : (
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={signupChartData} margin={{ top: 10, right: 16, left: 0, bottom: signupAxis.axisBottom }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                      <XAxis
                        dataKey="bucket"
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={signupAxis.tick}
                      />
                      <YAxis
                        yAxisId="users"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      />
                      <YAxis
                        yAxisId="pct"
                        orientation="right"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <RechartsTooltip content={<BucketChartTooltip grain={signupGrain} />} />
                      <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--app-font-mono)' }}/>
                      <Bar yAxisId="users" dataKey="activeUsers" fill="hsl(var(--muted-foreground)/0.2)" name="Active Users" radius={[3, 3, 0, 0]}/>
                      <Line yAxisId="pct" type="monotone" dataKey="signupFraction" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} connectNulls={false} name="Signup %"/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
