import { useAnalysis } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import { bucketAxisBottomMargin } from '@/lib/bucketLabels';
import { createBucketAxisTick } from '@/lib/bucketAxisTick';
import { BucketChartTooltip } from '@/components/charts/BucketChartTooltip';
import { filterEdgeCensoredBuckets } from '@/lib/retentionCensoring';
import { formatBucketTooltipLabel } from '@/lib/bucketLabels';

function toFractionPct(v: unknown): number | null {
  if (v == null || v === 'N/A') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : +n.toFixed(2);
}

function PlayStateTooltip({
  active,
  payload,
  label,
  grain,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; color?: string; payload?: Record<string, unknown> }>;
  label?: string | number;
  grain?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const bucket = String(label ?? row.bucket ?? '');
  const states = [
    { key: 'loaded', label: 'Loaded', count: row.loaded, pct: row.loadedPct, color: 'hsl(var(--muted))' },
    { key: 'solving', label: 'Solving', count: row.solving, pct: row.solvingPct, color: 'hsl(var(--chart-2))' },
    { key: 'completed', label: 'Completed', count: row.completed, pct: row.completedPct, color: 'hsl(var(--primary))' },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
      <p className="font-mono text-sm text-muted-foreground mb-2">
        {formatBucketTooltipLabel(bucket, grain, row.coveredStart as string, row.coveredEnd as string)}
      </p>
      {typeof row.totalPlays === 'number' && (
        <p className="font-mono text-xs text-muted-foreground mb-2">
          {row.totalPlays.toLocaleString()} total plays
        </p>
      )}
      {states.map((s) => (
        <div key={s.key} className="flex justify-between gap-6 font-mono text-sm mb-1">
          <span style={{ color: s.color }}>{s.label}</span>
          <span>
            {Number(s.count ?? 0).toLocaleString()}
            {s.pct != null ? ` (${s.pct}%)` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';

export default function Analysis() {
  const { data: analysis, isLoading, error } = useAnalysis();

  const chartData = useMemo(() => {
    const metrics = analysis?.metrics;
    if (!metrics) return { userGrowth: [], engagement: [], playState: [] };

    return {
      userGrowth: filterEdgeCensoredBuckets(metrics.userGrowth?.buckets ?? []).map((d: any) => ({
        bucket: d.bucket,
        coveredStart: d.coveredStart,
        coveredEnd: d.coveredEnd,
        value: d.userGrowth ?? null,
      })),
      engagement: filterEdgeCensoredBuckets(metrics.engagement?.buckets ?? []).map((d: any) => ({
        bucket: d.bucket,
        coveredStart: d.coveredStart,
        coveredEnd: d.coveredEnd,
        minutes:
          d.medianScreenTimeSeconds == null
            ? null
            : +(Number(d.medianScreenTimeSeconds) / 60).toFixed(2),
        playCount: d.qualifyingPlays ?? 0,
      })),
      playState: filterEdgeCensoredBuckets(metrics.playState?.buckets ?? []).map((d: any) => ({
        bucket: d.bucket,
        coveredStart: d.coveredStart,
        coveredEnd: d.coveredEnd,
        loaded: d.loadedCount ?? 0,
        solving: d.solvingCount ?? 0,
        completed: d.completedCount ?? 0,
        totalPlays: d.totalPlays ?? 0,
        loadedPct: toFractionPct(d.loadedFractionPercent),
        solvingPct: toFractionPct(d.solvingFractionPercent),
        completedPct: toFractionPct(d.completedFractionPercent),
      })),
    };
  }, [analysis]);

  const grain = analysis?.grain;
  const axisBottom = bucketAxisBottomMargin(grain);

  const userGrowthTick = useMemo(
    () => createBucketAxisTick(grain, chartData.userGrowth),
    [grain, chartData.userGrowth],
  );
  const engagementTick = useMemo(
    () => createBucketAxisTick(grain, chartData.engagement),
    [grain, chartData.engagement],
  );
  const playStateTick = useMemo(
    () => createBucketAxisTick(grain, chartData.playState),
    [grain, chartData.playState],
  );

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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Behavior Analysis</h1>
          <p className="text-muted-foreground">User growth, engagement time, and funnel progress</p>
        </div>
        {grain && (
          <Badge variant="outline" className="font-mono">
            {grain}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : analysis?.metrics ? (
        <div className="grid gap-6 grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Active Users{grain ? ` (${grain})` : ''}</CardTitle>
              <CardDescription>Distinct users active per period</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.userGrowth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No user growth data</p>
              ) : (
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.userGrowth} margin={{ top: 10, right: 30, left: 0, bottom: axisBottom }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={userGrowthTick}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                      />
                      <RechartsTooltip content={<BucketChartTooltip grain={grain} />} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Active Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Median Screen Time</CardTitle>
              <CardDescription>Median minutes played vs qualifying play count</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.engagement.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No engagement data</p>
              ) : (
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.engagement} margin={{ top: 10, right: 30, left: 0, bottom: axisBottom }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={engagementTick}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}m`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                      />
                      <RechartsTooltip content={<BucketChartTooltip grain={grain} />} />
                      <Legend />
                      <Bar
                        yAxisId="right"
                        dataKey="playCount"
                        fill="hsl(var(--muted))"
                        name="Qualifying Plays"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="minutes"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                        name="Median Minutes"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Play State Distribution</CardTitle>
              <CardDescription>
                Funnel counts (stacked) and state rates % — Loaded → Solving → Completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.playState.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No play state data</p>
              ) : (
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.playState} margin={{ top: 10, right: 30, left: 0, bottom: axisBottom }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={playStateTick}
                      />
                      <YAxis
                        yAxisId="count"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                      />
                      <YAxis
                        yAxisId="pct"
                        orientation="right"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <RechartsTooltip content={<PlayStateTooltip grain={grain} />} />
                      <Legend />
                      <Bar yAxisId="count" dataKey="loaded" stackId="a" fill="hsl(var(--muted))" name="Loaded" />
                      <Bar yAxisId="count" dataKey="solving" stackId="a" fill="hsl(var(--chart-2))" name="Solving" />
                      <Bar
                        yAxisId="count"
                        dataKey="completed"
                        stackId="a"
                        fill="hsl(var(--primary))"
                        name="Completed"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="pct"
                        type="monotone"
                        dataKey="loadedPct"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        connectNulls={false}
                        name="Loaded %"
                      />
                      <Line
                        yAxisId="pct"
                        type="monotone"
                        dataKey="solvingPct"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        name="Solving %"
                      />
                      <Line
                        yAxisId="pct"
                        type="monotone"
                        dataKey="completedPct"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                        name="Completed %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center p-12 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No analysis data found. Run the pipeline first.</p>
        </div>
      )}
    </div>
  );
}
