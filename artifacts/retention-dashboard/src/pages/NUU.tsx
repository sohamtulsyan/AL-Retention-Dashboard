import { useNuuRetention, useSignupFraction } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ComposedChart, Bar } from 'recharts';
import { useMemo } from 'react';

export default function NUU() {
  const { data: nuuData, isLoading: nuuLoading } = useNuuRetention();
  const { data: signupData, isLoading: signupLoading } = useSignupFraction();

  const formattedNuu = useMemo(() => {
    if (!nuuData || !nuuData.nuu_counts) return [];
    return nuuData.nuu_counts.map((d: any) => ({
      ...d,
      count: d.count === 'N/A' ? null : d.count
    }));
  }, [nuuData]);

  const formattedSignup = useMemo(() => {
    if (!signupData || !signupData.signup_fraction) return [];
    return signupData.signup_fraction.map((d: any) => ({
      ...d,
      fraction: d.fraction === 'N/A' ? null : Number((d.fraction * 100).toFixed(2))
    }));
  }, [signupData]);

  const isLoading = nuuLoading || signupLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">NUU & Signup</h1>
        <p className="text-muted-foreground">New Unregistered Users and account conversion metrics</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>NUU Growth</CardTitle>
              <CardDescription>New Unregistered Users volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedNuu} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="bucket" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ fontFamily: 'var(--app-font-mono)', color: 'hsl(var(--chart-5))' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--chart-5))" 
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                      name="NUU Volume"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signup Fraction</CardTitle>
              <CardDescription>Percentage of NUUs that convert to registered accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={formattedSignup} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="bucket" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ fontFamily: 'var(--app-font-mono)' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="right"
                      dataKey="cohort_size" 
                      fill="hsl(var(--muted))" 
                      name="Cohort Size" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="fraction" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                      name="Signup Conversion %" 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
