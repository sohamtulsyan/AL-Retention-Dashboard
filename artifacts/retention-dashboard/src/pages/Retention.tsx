import { useAnalysis } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMemo } from 'react';

const COLORS = {
  'D1': 'hsl(var(--chart-1))',
  'D3': 'hsl(var(--chart-2))',
  'D7': 'hsl(var(--primary))',
  'D30': 'hsl(var(--chart-4))'
};

function RetentionChart({ data, title, description }: { data: any, title: string, description: string }) {
  // Transform object-keyed array to unified array by bucket
  const chartData = useMemo(() => {
    if (!data) return [];
    const buckets = new Set<string>();
    const byBucket: Record<string, any> = {};
    
    Object.keys(data).forEach(horizon => {
      data[horizon].forEach((row: any) => {
        buckets.add(row.bucket);
        if (!byBucket[row.bucket]) byBucket[row.bucket] = { bucket: row.bucket };
        // convert to percentage for display
        byBucket[row.bucket][horizon] = row.retention_pct === 'N/A' ? null : Number((row.retention_pct * 100).toFixed(2));
        byBucket[row.bucket][`${horizon}_cohort`] = row.total_cohort;
      });
    });

    return Array.from(buckets).sort().map(b => byBucket[b]);
  }, [data]);

  const horizons = Object.keys(data || {}).sort((a, b) => {
    return parseInt(a.replace('D','')) - parseInt(b.replace('D',''));
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-mono text-sm text-muted-foreground mb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex justify-between gap-4 font-mono text-sm mb-1">
              <span style={{ color: p.color }}>{p.name}: {p.value}%</span>
              <span className="text-muted-foreground text-xs">Cohort: {p.payload[`${p.dataKey}_cohort`]}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center border border-dashed rounded-lg text-muted-foreground">
        No retention data available
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
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
              {horizons.map(h => (
                <Line
                  key={h}
                  type="monotone"
                  dataKey={h}
                  stroke={COLORS[h as keyof typeof COLORS] || 'hsl(var(--muted))'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Retention() {
  const { data: analysis, isLoading, error } = useAnalysis();

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retention Curves</h1>
        <p className="text-muted-foreground">Cohort performance across multiple horizon models</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-[500px] w-full" />
      ) : analysis ? (
        <Tabs defaultValue="strict" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="strict" className="font-mono">Strict</TabsTrigger>
            <TabsTrigger value="cumulative" className="font-mono">Cumulative</TabsTrigger>
            <TabsTrigger value="consecutive" className="font-mono">Consecutive</TabsTrigger>
            <TabsTrigger value="rolling" className="font-mono">Rolling</TabsTrigger>
          </TabsList>
          
          <TabsContent value="strict" className="mt-0">
            <RetentionChart 
              data={analysis.strict_retention} 
              title="Strict Retention" 
              description="Users returning exactly on day N" 
            />
          </TabsContent>
          <TabsContent value="cumulative" className="mt-0">
            <RetentionChart 
              data={analysis.cumulative_retention} 
              title="Cumulative Retention" 
              description="Users returning on or before day N" 
            />
          </TabsContent>
          <TabsContent value="consecutive" className="mt-0">
            <RetentionChart 
              data={analysis.consecutive_retention} 
              title="Consecutive Retention" 
              description="Users returning every day up to day N" 
            />
          </TabsContent>
          <TabsContent value="rolling" className="mt-0">
            <RetentionChart 
              data={analysis.rolling_retention} 
              title="Rolling Retention" 
              description="Users returning on day N or any day after" 
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
