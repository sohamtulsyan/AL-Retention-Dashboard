import { useState, useEffect } from 'react';
import { useConfig, useUpdateConfig, getApiUrl, setApiUrl } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, Link2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function Config() {
  const { data: config, isLoading } = useConfig();
  const updateConfig = useUpdateConfig();
  
  // Local state for API URL
  const [localApiUrl, setLocalApiUrl] = useState(getApiUrl());
  
  // Local state for config form
  const [formData, setFormData] = useState<any>({});

  // Initialize form when config loads
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSaveApiUrl = () => {
    setApiUrl(localApiUrl);
    toast.success('API Base URL updated. Reloading data...');
    window.location.reload();
  };

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSaveConfig = () => {
    // Only send the editable fields
    const payload = {
      seriesId: formData.seriesId,
      timezone: formData.timezone,
      totalDataTimeStart: formData.totalDataTimeStart,
      timelineStart: formData.timelineStart,
      timelineEnd: formData.timelineEnd,
      grain: formData.grain,
      windowStart: formData.windowStart,
      windowEnd: formData.windowEnd,
      strictHorizons: formData.strictHorizons,
      windowHorizons: formData.windowHorizons,
    };
    updateConfig.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
        <p className="text-muted-foreground">Client connection and pipeline settings</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              API Connection
            </CardTitle>
            <CardDescription>Local storage persisted backend target</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="apiUrl" className="sr-only">API URL</Label>
                <Input 
                  id="apiUrl" 
                  value={localApiUrl} 
                  onChange={(e) => setLocalApiUrl(e.target.value)} 
                  className="font-mono bg-background"
                />
              </div>
              <Button onClick={handleSaveApiUrl}>Update & Reload</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Pipeline Configuration
                </CardTitle>
                <CardDescription>Edit backend variables (PATCH to /api/v1/config)</CardDescription>
              </div>
              {config && (
                <Badge variant={config.clientCredentialsConfigured ? "default" : "destructive"} className="font-mono">
                  {config.clientCredentialsConfigured ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> SECRETS OK</>
                  ) : (
                    <><ShieldAlert className="w-3 h-3 mr-1" /> SECRETS MISSING</>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : config ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <Label>Series ID</Label>
                  <Input 
                    value={formData.seriesId || ''} 
                    onChange={e => handleChange('seriesId', e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">The ID used for CSV file matching</p>
                </div>

                <div className="space-y-2">
                  <Label>Grain</Label>
                  <Select 
                    value={formData.grain || 'Daily'} 
                    onValueChange={v => handleChange('grain', v)}
                  >
                    <SelectTrigger className="font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Default aggregation level</p>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input 
                    value={formData.timezone || ''} 
                    onChange={e => handleChange('timezone', e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Total Data Time Start</Label>
                  <Input 
                    type="date"
                    value={formData.totalDataTimeStart || ''} 
                    onChange={e => handleChange('totalDataTimeStart', e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2 border-t pt-4 mt-2 col-span-1 md:col-span-2">
                  <h4 className="font-medium text-sm text-primary mb-4">Timeline Filters</h4>
                </div>

                <div className="space-y-2">
                  <Label>Timeline Start</Label>
                  <Input 
                    type="date"
                    value={formData.timelineStart || ''} 
                    onChange={e => handleChange('timelineStart', e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Timeline End</Label>
                  <Input 
                    type="date"
                    value={formData.timelineEnd || ''} 
                    onChange={e => handleChange('timelineEnd', e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Window Start</Label>
                  <Input 
                    type="date"
                    value={formData.windowStart || ''} 
                    onChange={e => handleChange('windowStart', e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Window End</Label>
                  <Input 
                    type="date"
                    value={formData.windowEnd || ''} 
                    onChange={e => handleChange('windowEnd', e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2 border-t pt-4 mt-2 col-span-1 md:col-span-2">
                  <h4 className="font-medium text-sm text-primary mb-4">Retention Horizons</h4>
                </div>

                <div className="space-y-2">
                  <Label>Strict Horizons (comma sep)</Label>
                  <Input 
                    value={formData.strictHorizons || ''} 
                    onChange={e => handleChange('strictHorizons', e.target.value)}
                    className="font-mono"
                    placeholder="1,3,7,30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Window Horizons (comma sep)</Label>
                  <Input 
                    value={formData.windowHorizons || ''} 
                    onChange={e => handleChange('windowHorizons', e.target.value)}
                    className="font-mono"
                    placeholder="3,7,30"
                  />
                </div>

              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">Failed to load configuration</div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/50 py-4 flex justify-between items-center border-t">
            <div className="text-xs text-muted-foreground font-mono">
              {config && `Rate Limit: ${config.rateLimitRps} RPS | Workers: ${config.maxWorkers}`}
            </div>
            <Button onClick={handleSaveConfig} disabled={updateConfig.isPending || !config} className="font-mono">
              <Save className="w-4 h-4 mr-2" />
              SAVE PIPELINE CONFIG
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
