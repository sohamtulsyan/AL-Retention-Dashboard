import { useNuuRetention, useSignupFraction, useNuuSignupFraction } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
  ComposedChart, Bar,
} from 'recharts';
import { useMemo } from 'react';
import { filterEdgeCensoredBuckets, toRetentionPercent } from '@/lib/retentionCensoring';

const HORIZON_COLORS: Record<string, string> = {
  D1:  'hsl(var(--chart-1))',
  D3:  'hsl(var(--chart-2))',
  D7:  'hsl(var(--chart-3))',
  D30: 'hsl(var(--chart-5))',
};

const tooltipStyle = {
  contentStyle: { backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' },
  itemStyle:    { fontFamily: 'var(--app-font-mono)', fontSize: 12 },
  labelStyle:   { color: 'hsl(var(--muted-foreground))', marginBottom: '8px', fontWeight: 600 },
};

function toPct(v: unknown): number | null {
  if (v == null || v === 'N/A') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : +n.toFixed(2);
}

export default function NUU() {
  const { data: nuuData, isLoading: nuuLoading } = useNuuRetention();
  const { data: signupData, isLoading: signupLoading } = useSignupFraction();
  const { data: nuuSignupData, isLoading: nuuSignupLoading } = useNuuSignupFraction();

  // Flatten strictRetention buckets into chart rows
  const nuuVolumeData = useMemo(() => {
    const buckets: any[] = nuuData?.metrics?.strictRetention?.buckets ?? [];
    return filterEdgeCensoredBuckets(buckets).map((b: any) => {
      const total = b.horizons?.D1?.totalNuuInBucket ?? b.horizons?.D3?.totalNuuInBucket ?? null;
      return { bucket: b.bucket, count: total };
    });
  }, [nuuData]);

  const nuuRetentionData = useMemo(() => {
    const buckets: any[] = nuuData?.metrics?.strictRetention?.buckets ?? [];
    const timelineEnd = nuuData?.timelineEnd as string | undefined;
    return filterEdgeCensoredBuckets(buckets).map((b: any) => {
      const ctx = (key: string) => ({
        horizonKey: key,
        coveredStart: b.coveredStart as string | undefined,
        timelineEnd,
      });
      return {
        bucket: b.bucket,
        D1: toRetentionPercent(b.horizons?.D1, ctx('D1')),
        D3: toRetentionPercent(b.horizons?.D3, ctx('D3')),
        D7: toRetentionPercent(b.horizons?.D7, ctx('D7')),
        D30: toRetentionPercent(b.horizons?.D30, ctx('D30')),
      };
    });
  }, [nuuData]);

  const signupChartData = useMemo(() => {
    const buckets: any[] = signupData?.metric?.buckets ?? [];
    return filterEdgeCensoredBuckets(buckets).map((b: any) => ({
      bucket: b.bucket,
      signupFraction: toPct(b.signupFractionPercent),
      activeUsers: b.activeUsers ?? 0,
      signups: b.signups ?? 0,
    }));
  }, [signupData]);

  const nuuSignupChartData = useMemo(() => {
    const buckets: any[] = nuuSignupData?.buckets ?? [];
    return buckets.map((b: any) => ({
      bucket: b.bucket,
      signupFraction: toPct(b.signupFractionPercent),
      nuuCount: b.nuuCount ?? 0,
      signups: b.signups ?? 0,
    }));
  }, [nuuSignupData]);

  const isLoading = nuuLoading || signupLoading || nuuSignupLoading;
  const grain = nuuData?.grain ?? signupData?.grain ?? '';
  const totalSignups = signupData?.metric?.totalSignups ?? nuuSignupData?.totalSignups;

  const availableHorizons = useMemo(() => {
    const first = nuuData?.metrics?.strictRetention?.buckets?.[0]?.horizons ?? {};
    return Object.keys(first).filter(k => k in HORIZON_COLORS);
  }, [nuuData]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NUU &amp; Signup</h1>
          <p className="text-muted-foreground">New Unregistered Users and account conversion metrics</p>
        </div>
        <div className="flex gap-2 items-center">
          {grain && <Badge variant="outline" className="font-mono">{grain}</Badge>}
          {totalSignups != null && (
            <Badge variant="secondary" className="font-mono">
              {totalSignups.toLocaleString()} total signups
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[350px] w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      ) : (
        <div className="grid gap-6">

          {/* NUU Volume */}
          <Card>
            <CardHeader>
              <CardTitle>NUU Volume</CardTitle>
              <CardDescription>New Unregistered Users per {grain.toLowerCase() || 'period'}</CardDescription>
            </CardHeader>
            <CardContent>
              {nuuVolumeData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No NUU data available</p>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={nuuVolumeData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="nuuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="hsl(var(--chart-5))" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                      <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
                      <RechartsTooltip {...tooltipStyle} formatter={(v: any) => [v?.toLocaleString(), 'NUU']}/>
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--chart-5))" strokeWidth={2} fillOpacity={1} fill="url(#nuuGrad)" name="NUU"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NUU Strict Retention Curves */}
          <Card>
            <CardHeader>
              <CardTitle>NUU Strict Retention</CardTitle>
              <CardDescription>% of NUU cohort returning on exactly day N, by cohort week</CardDescription>
            </CardHeader>
            <CardContent>
              {nuuRetentionData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No NUU retention data available</p>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={nuuRetentionData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                      <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`}/>
                      <RechartsTooltip {...tooltipStyle} formatter={(v: any, name: string) => [`${v?.toFixed(2)}%`, name]}/>
                      <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--app-font-mono)' }}/>
                      {availableHorizons.map(h => (
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
              )}
            </CardContent>
          </Card>

          {/* Signup Fraction of NUUs */}
          <Card>
            <CardHeader>
              <CardTitle>Signup Fraction of NUUs</CardTitle>
              <CardDescription>
                Signups / new unique users (%) — conversion of NUUs into accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nuuSignupChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No NUU signup fraction data — run the <span className="font-mono">nuu_signup_fraction</span> job
                </p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={nuuSignupChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                      <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
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
                      <RechartsTooltip
                        {...tooltipStyle}
                        formatter={(v: any, name: string) => {
                          if (name === 'Signup / NUU %') return [`${Number(v).toFixed(2)}%`, name];
                          return [v?.toLocaleString(), name];
                        }}
                      />
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

          {/* Signup Fraction (active users) */}
          <Card>
            <CardHeader>
              <CardTitle>Signup Fraction</CardTitle>
              <CardDescription>Signups as % of active users, with weekly active user volume</CardDescription>
            </CardHeader>
            <CardContent>
              {signupChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No signup data available</p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={signupChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                      <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
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
                      <RechartsTooltip
                        {...tooltipStyle}
                        formatter={(v: any, name: string) => {
                          if (name === 'Signup %') return [`${Number(v).toFixed(2)}%`, name];
                          return [v?.toLocaleString(), name];
                        }}
                      />
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
