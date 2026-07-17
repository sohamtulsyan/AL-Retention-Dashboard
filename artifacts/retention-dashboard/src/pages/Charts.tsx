import { useCharts, getChartUrl } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileBox, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Charts() {
  const { data, isLoading } = useCharts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chart Artifacts</h1>
        <p className="text-muted-foreground">Generated visual artifacts directly from the analytical pipeline</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-[300px] w-full" />)}
        </div>
      ) : data?.charts && data.charts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.charts.map(chartName => {
            const url = getChartUrl(chartName);
            const isHtml = chartName.endsWith('.html');
            
            return (
              <Card key={chartName} className="overflow-hidden group flex flex-col">
                <CardContent className="p-0 bg-muted/20 relative flex-1 min-h-[300px]">
                  {isHtml ? (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-card">
                      <div className="text-center text-muted-foreground">
                        <FileBox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-mono text-sm">Interactive HTML Chart</p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <img 
                        src={url} 
                        alt={chartName} 
                        className="max-w-full max-h-full object-contain mix-blend-screen"
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <Button variant="secondary" asChild>
                      <a href={url} target="_blank" rel="noreferrer" className="font-mono text-sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        OPEN IN NEW TAB
                      </a>
                    </Button>
                  </div>
                </CardContent>
                <div className="p-3 border-t bg-card text-xs font-mono text-muted-foreground truncate">
                  {chartName}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 border rounded-lg border-dashed">
          <FileBox className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-1">No artifacts found</h3>
          <p className="text-muted-foreground">Run the pipeline to generate visual artifacts.</p>
        </div>
      )}
    </div>
  );
}
