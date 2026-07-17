import { useAnalysis } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, AreaChart, Area, ComposedChart } from 'recharts';

export default function Analysis() {
  const { data: analysis, isLoading, error } = useAnalysis();
  const [grain, setGrain] = useState<string>('Daily');

  const filteredData = useMemo(() => {
    if (!analysis) return { userGrowth: [], engagement: [], playState: [] };
    
    return {
      userGrowth: (analysis.user_growth || []).filter((d: any) => d.grain === grain).map((d: any) => ({
        ...d,
        value: d.value === 'N/A' ? null : d.value
      })),
      engagement: (analysis.engagement || []).filter((d: any) => d.grain === grain).map((d: any) => ({
        ...d,
        minutes: d.median_screen_time === 'N/A' ? null : d.median_screen_time / 60
      })),
      playState: (analysis.play_state || []).filter((d: any) => {
        // Find if this bucket has Daily data - backend doesn't explicitly grain play_state
        return true; 
      })
    };
  }, [analysis, grain]);

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
        <div className="w-48">
          <Select value={grain} onValueChange={setGrain}>
            <SelectTrigger className="font-mono">
              <SelectValue placeholder="Select Grain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Daily Grain</SelectItem>
              <SelectItem value="Weekly">Weekly Grain</SelectItem>
              <SelectItem value="Monthly">Monthly Grain</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : analysis ? (
        <div className="grid gap-6 grid-cols-1">
          
          <Card>
            <CardHeader>
              <CardTitle>Active Users ({grain})</CardTitle>
              <CardDescription>Distinct users active per period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData.userGrowth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                      tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--app-font-mono)' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]} 
                      name="Active Users"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Median Screen Time</CardTitle>
              <CardDescription>Median minutes played per active user vs total play count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredData.engagement} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                      tickFormatter={(v) => `${v}m`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ fontFamily: 'var(--app-font-mono)' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="right"
                      dataKey="play_count" 
                      fill="hsl(var(--muted))" 
                      name="Total Play Count" 
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
                      name="Median Minutes" 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Play State Distribution</CardTitle>
              <CardDescription>Funnel conversion (Loaded → Solving → Completed)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData.playState} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                      itemStyle={{ fontFamily: 'var(--app-font-mono)' }}
                    />
                    <Legend />
                    <Bar dataKey="loaded" stackId="a" fill="hsl(var(--muted))" name="Loaded" />
                    <Bar dataKey="solving" stackId="a" fill="hsl(var(--chart-2))" name="Solving" />
                    <Bar dataKey="completed" stackId="a" fill="hsl(var(--primary))" name="Completed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>
      ) : (
        <div className="text-center p-12 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No analysis data found.</p>
        </div>
      )}
    </div>
  );
}
