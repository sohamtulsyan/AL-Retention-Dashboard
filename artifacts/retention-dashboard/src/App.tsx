import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';

import Dashboard from '@/pages/Dashboard';
import Analysis from '@/pages/Analysis';
import Retention from '@/pages/Retention';
import NUU from '@/pages/NUU';
import Jobs from '@/pages/Jobs';
import Charts from '@/pages/Charts';
import Config from '@/pages/Config';

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/retention" component={Retention} />
        <Route path="/nuu" component={NUU} />
        <Route path="/jobs" component={Jobs} />
        <Route path="/charts" component={Charts} />
        <Route path="/config" component={Config} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster theme="dark" position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
