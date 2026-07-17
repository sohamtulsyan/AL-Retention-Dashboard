import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalysis, useJobs, useCreateJob, useCoverage, getApiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Clock, Users, Play, AlertCircle, Database, CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';
import { format, parseISO } from 'date-fns';

function JobStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'succeeded': return <span className="text-emerald-500 font-mono text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> SUCCESS</span>;
    case 'failed': return <span className="text-red-500 font-mono text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> FAILED</span>;
    case 'running': return <span className="text-amber-500 font-mono text-xs flex items-center gap-1"><Activity className="w-3 h-3 animate-spin"/> RUNNING</span>;
    case 'pending': return <span className="text-blue-500 font-mono text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> PENDING</span>;
    default: return <span className="text-muted-foreground font-mono text-xs">{status}</span>;
  }
}

function Heatmap({ dates }: { dates: string[] }) {
  if (!dates || dates.length === 0) return <div className="text-sm text-muted-foreground">No data available</div>;
  
  // Create a 7x52 grid (roughly a year)
  // Simplified for the demo to just show a dense dot grid
  return (
    <div className="flex flex-wrap gap-1">
      {dates.slice(-365).map((date) => (
        <div 
          key={date}
          className="w-3 h-3 rounded-sm bg-primary/80 hover:bg-primary cursor-pointer"
          title={date}
        />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data: analysis, isLoading: analysisLoading } = useAnalysis();
  const { data: jobs, isLoading: jobsLoading } = useJobs(5);
  const { data: coverage } = useCoverage();
  const createJob = useCreateJob();
  const apiUrl = getApiUrl();

  const handleRunPipeline = () => {
    createJob.mutate({ type: 'pipeline' });
  };

  const getKpi = () => {
    if (!analysis) return { dau: '-', time: '-', d7: '-' };
    
    // Get latest DAU from user growth
    const ug = analysis.user_growth?.filter((d: any) => d.grain === 'Daily');
    const dau = ug && ug.length > 0 ? ug[ug.length - 1].value : '-';
    
    // Get latest engagement
    const eng = analysis.engagement?.filter((d: any) => d.grain === 'Daily');
    const time = eng && eng.length > 0 ? (eng[eng.length - 1].median_screen_time / 60).toFixed(1) + 'm' : '-';
    
    // Get latest D7 Strict
    const d7 = analysis.strict_retention?.['D7'];
    const ret = d7 && d7.length > 0 ? (d7[d7.length - 1].retention_pct * 100).toFixed(1) + '%' : '-';
    
    return { dau, time, d7 };
  };

  const kpi = getKpi();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground">Connected to <code className="text-xs bg-muted px-1 py-0.5 rounded">{apiUrl}</code></p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRunPipeline} disabled={createJob.isPending} className="font-mono">
            <Play className="w-4 h-4 mr-2" />
            RUN FULL PIPELINE
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latest DAU</CardDescription>
            <CardTitle className="text-4xl font-mono">
              {analysisLoading ? <Skeleton className="h-10 w-24" /> : kpi.dau}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Based on latest daily grain data</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Median Screen Time</CardDescription>
            <CardTitle className="text-4xl font-mono text-amber-500">
              {analysisLoading ? <Skeleton className="h-10 w-24" /> : kpi.time}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Per active user session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Strict D7 Retention</CardDescription>
            <CardTitle className="text-4xl font-mono text-primary">
              {analysisLoading ? <Skeleton className="h-10 w-24" /> : kpi.d7}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Rolling 7-day cohort snapshot</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Data Coverage</CardTitle>
            <CardDescription>Days with parsed CSV data available</CardDescription>
          </CardHeader>
          <CardContent>
            {coverage ? (
              <Heatmap dates={coverage.dates || []} />
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Live polling status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : jobs && jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div>
                      <div className="font-mono text-sm">{job.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(job.created_at), 'MMM d, HH:mm:ss')}
                      </div>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-2 font-mono text-xs" asChild>
                  <Link href="/jobs">VIEW ALL JOBS</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center p-4 border rounded-lg border-dashed">
                <Database className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">No recent jobs found</p>
                <Button size="sm" onClick={handleRunPipeline} disabled={createJob.isPending}>
                  Trigger Initial Sync
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
