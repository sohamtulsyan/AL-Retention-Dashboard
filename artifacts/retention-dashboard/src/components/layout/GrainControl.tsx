import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  useConfig,
  useUpdateConfig,
  createJob,
  waitForJob,
  type Config,
} from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const GRAINS: NonNullable<Config['grain']>[] = ['Daily', 'Weekly', 'Monthly'];

export function GrainControl() {
  const { data: config, isLoading } = useConfig();
  const updateConfig = useUpdateConfig({ silent: true });
  const queryClient = useQueryClient();
  const [reloading, setReloading] = useState(false);

  const current = config?.grain || 'Weekly';

  const handleChange = async (grain: string) => {
    if (grain === current || reloading) return;

    setReloading(true);
    const toastId = toast.loading(`Recomputing analysis at ${grain} grain…`);

    try {
      await updateConfig.mutateAsync({ grain: grain as Config['grain'] });
      const pipelineJob = await createJob({ type: 'pipeline', params: { grain } });
      const pipelineResult = await waitForJob(pipelineJob.id);

      if (pipelineResult.status === 'failed') {
        toast.error(`Grain reload failed: ${pipelineResult.error || 'pipeline failed'}`, {
          id: toastId,
        });
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analysis'] }),
        queryClient.invalidateQueries({ queryKey: ['nuu-retention'] }),
        queryClient.invalidateQueries({ queryKey: ['ouu-retention'] }),
        queryClient.invalidateQueries({ queryKey: ['signup-fraction'] }),
        queryClient.invalidateQueries({ queryKey: ['nuu-signup-fraction'] }),
        queryClient.invalidateQueries({ queryKey: ['charts'] }),
        queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      ]);

      toast.success(`Analysis reloaded at ${grain} grain`, { id: toastId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to change grain: ${message}`, { id: toastId });
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
      <Label htmlFor="grain-control" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        Grain
      </Label>
      <Select
        value={current}
        onValueChange={handleChange}
        disabled={isLoading || reloading || updateConfig.isPending}
      >
        <SelectTrigger
          id="grain-control"
          className="h-8 w-[130px] font-mono text-xs"
        >
          <SelectValue placeholder="Grain" />
        </SelectTrigger>
        <SelectContent>
          {GRAINS.map((g) => (
            <SelectItem key={g} value={g} className="font-mono text-xs">
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {reloading && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Reloading…
        </span>
      )}
    </div>
  );
}
