import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// FastAPI base URL is stored in localStorage (Settings page).
// Browser calls go to same-origin /api/fastapi-proxy/* (Vite → Express),
// and Express forwards server-to-server to FastAPI (avoids browser CORS).
const PROXY_BASE = '/api/fastapi-proxy';

export const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:8000';
  return localStorage.getItem('retention_api_url') || 'http://localhost:8000';
};

export const setApiUrl = (url: string) => {
  localStorage.setItem('retention_api_url', url);
};

// For <img src> where we can't set headers, pass FastAPI URL as _target.
export const getChartUrl = (name: string) => {
  const target = encodeURIComponent(getApiUrl().replace(/\/$/, ''));
  return `${PROXY_BASE}/api/v1/artifacts/charts/${name}?_target=${target}`;
};

async function fetcher(endpoint: string, options: RequestInit = {}) {
  const fastapiUrl = getApiUrl().replace(/\/$/, '');
  const url = `${PROXY_BASE}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Target-Url': fastapiUrl,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown Error');
      throw new Error(`API Error: ${res.status} - ${errorText}`);
    }

    if (res.status === 204) return null;

    return await res.json();
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}

// Types
export interface Config {
  apiBaseUrl?: string;
  seriesId?: string;
  timezone?: string;
  totalDataTimeStart?: string;
  timelineStart?: string;
  timelineEnd?: string;
  grain?: 'Daily' | 'Weekly' | 'Monthly';
  strictHorizons?: string;
  windowHorizons?: string;
  rateLimitRps?: number;
  maxWorkers?: number;
  clientCredentialsConfigured?: boolean;
}

export interface Job {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  params?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  error?: string;
}

// Hooks

export const useConfig = () => {
  return useQuery<Config>({
    queryKey: ['config'],
    queryFn: () => fetcher('/api/v1/config'),
    retry: false,
  });
};

export const useUpdateConfig = (opts?: { silent?: boolean }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Config>) =>
      fetcher('/api/v1/config', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['config'], data);
      if (!opts?.silent) toast.success('Configuration updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to update config: ' + err.message);
    },
  });
};

export const useJobs = (limit = 20) => {
  return useQuery<Job[]>({
    queryKey: ['jobs', { limit }],
    queryFn: () => fetcher(`/api/v1/jobs?limit=${limit}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasActive = data.some(j => j.status === 'pending' || j.status === 'running');
      return hasActive ? 3000 : false;
    },
  });
};

export const useJob = (id: string) => {
  return useQuery<Job>({
    queryKey: ['jobs', id],
    queryFn: () => fetcher(`/api/v1/jobs/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return (data.status === 'pending' || data.status === 'running') ? 3000 : false;
    },
  });
};

export const createJob = (data: { type: string; params?: any }) =>
  fetcher('/api/v1/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  }) as Promise<Job>;

/** Poll until a job leaves pending/running (or timeout). */
export async function waitForJob(
  id: string,
  { intervalMs = 2000, timeoutMs = 10 * 60 * 1000 } = {},
): Promise<Job> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = (await fetcher(`/api/v1/jobs/${id}`)) as Job;
    if (job.status !== 'pending' && job.status !== 'running') return job;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Job ${id} timed out after ${timeoutMs}ms`);
}

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Pipeline run queued successfully');
    },
    onError: (err: Error) => {
      toast.error('Failed to queue pipeline run: ' + err.message);
    },
  });
};

export const useCoverage = () => {
  return useQuery<{ days?: string[]; dates?: string[]; dayCount?: number }>({
    queryKey: ['coverage'],
    queryFn: () => fetcher('/api/v1/data/coverage'),
    retry: false,
  });
};

export const useAnalysis = () => {
  return useQuery<any>({
    queryKey: ['analysis'],
    queryFn: () => fetcher('/api/v1/results/analysis'),
    retry: false,
  });
};

export const useNuuRetention = () => {
  return useQuery<any>({
    queryKey: ['nuu-retention'],
    queryFn: () => fetcher('/api/v1/results/nuu-retention'),
    retry: false,
  });
};

export const useOuuRetention = () => {
  return useQuery<any>({
    queryKey: ['ouu-retention'],
    queryFn: () => fetcher('/api/v1/results/ouu-retention'),
    retry: false,
  });
};

export const useSignupFraction = () => {
  return useQuery<any>({
    queryKey: ['signup-fraction'],
    queryFn: () => fetcher('/api/v1/results/signup-fraction'),
    retry: false,
  });
};

/** Signups / NUU × 100 (weekly ISO buckets). */
export const useNuuSignupFraction = () => {
  return useQuery<any>({
    queryKey: ['nuu-signup-fraction'],
    queryFn: () => fetcher('/api/v1/results/nuu-signup-fraction'),
    retry: false,
  });
};

export const useCharts = () => {
  return useQuery<{ charts: string[] }>({
    queryKey: ['charts'],
    queryFn: () => fetcher('/api/v1/artifacts/charts'),
    retry: false,
  });
};
