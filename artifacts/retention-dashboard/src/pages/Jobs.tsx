import { useState, Fragment } from 'react';
import { useJobs, useCreateJob } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Play, AlertCircle, CheckCircle2, Activity, Clock, Terminal } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const JOB_TYPES = [
  'backfill', 'daily', 'analyze', 'pipeline', 
  'nuu_counts', 'nuu_retention', 'signup_fraction', 'nuu_signup_fraction'
];

const formSchema = z.object({
  type: z.string().min(1, "Job type is required"),
  paramsRaw: z.string().optional(),
});

function JobStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'succeeded': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
    case 'running': return <Activity className="w-4 h-4 text-amber-500 animate-spin" />;
    case 'pending': return <Clock className="w-4 h-4 text-blue-500" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function Jobs() {
  const { data: jobs, isLoading } = useJobs(50);
  const createJob = useCreateJob();
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'pipeline',
      paramsRaw: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    let params = undefined;
    if (values.paramsRaw) {
      try {
        params = JSON.parse(values.paramsRaw);
      } catch (e) {
        form.setError('paramsRaw', { message: 'Invalid JSON' });
        return;
      }
    }
    createJob.mutate({ type: values.type, params });
    form.reset({ ...values, paramsRaw: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Runner</h1>
        <p className="text-muted-foreground">Trigger and monitor backend data processing tasks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              New Job
            </CardTitle>
            <CardDescription>Dispatch a background worker</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-mono text-xs">
                            <SelectValue placeholder="Select a job type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {JOB_TYPES.map(type => (
                            <SelectItem key={type} value={type} className="font-mono text-xs">
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="paramsRaw"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parameters (Optional JSON)</FormLabel>
                      <FormControl>
                        <textarea 
                          {...field}
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                          placeholder='{"date": "2023-01-01"}'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={createJob.isPending} className="w-full font-mono">
                  <Play className="w-4 h-4 mr-2" />
                  DISPATCH
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Job Queue</CardTitle>
            <CardDescription>Live status of recent dispatches</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs?.map(job => (
                    <Fragment key={job.id}>
                      <TableRow className="group">
                        <TableCell>
                          <JobStatusIcon status={job.status} />
                        </TableCell>
                        <TableCell className="font-mono font-medium">{job.type}</TableCell>
                        <TableCell className="font-mono text-xs uppercase">{job.status}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {job.created_at ? format(parseISO(job.created_at), 'MMM d, HH:mm:ss') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {job.error && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs text-destructive hover:text-destructive/80"
                              onClick={() => setExpandedError(expandedError === job.id ? null : job.id)}
                            >
                              {expandedError === job.id ? 'Hide Error' : 'View Error'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedError === job.id && job.error && (
                        <TableRow className="bg-destructive/5 hover:bg-destructive/5">
                          <TableCell colSpan={5} className="p-4">
                            <pre className="text-xs text-destructive font-mono whitespace-pre-wrap max-h-[300px] overflow-auto">
                              {job.error}
                            </pre>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                  {(!jobs || jobs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Queue is empty
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
