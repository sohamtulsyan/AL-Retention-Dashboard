import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:8000';
  return localStorage.getItem('retention_api_url') || 'http://localhost:8000';
};

export const setApiUrl = (url: string) => {
  localStorage.setItem('retention_api_url', url);
};

export const getChartUrl = (name: string) => {
  return `${getApiUrl().replace(/\/$/, '')}/api/v1/artifacts/charts/${name}`;
};

async function fetcher(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getApiUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown Error');
      throw new Error(`API Error: ${res.status} - ${errorText}`);
    }
    
    // For 204 No Content
    if (res.status === 204) return null;
    
    return res.json();
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
  windowStart?: string;
  windowEnd?: string;
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
  created_at: string;
  updated_at: string;
  error?: string;
}

// Hooks

// Config
export const useConfig = () => {
  return useQuery<Config>({
    queryKey: ['config'],
    queryFn: () => fetcher('/api/v1/config'),
    retry: false,
  });
};

export const useUpdateConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Config>) => 
      fetcher('/api/v1/config', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['config'], data);
      toast.success('Configuration updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to update config: ' + err.message);
    }
  });
};

// Jobs
export const useJobs = (limit = 20) => {
  return useQuery<Job[]>({
    queryKey: ['jobs', { limit }],
    queryFn: () => fetcher(`/api/v1/jobs?limit=${limit}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasActive = data.some(j => j.status === 'pending' || j.status === 'running');
      return hasActive ? 3000 : false;
    }
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
    }
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string, params?: any }) => 
      fetcher('/api/v1/jobs', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job queued successfully');
    },
    onError: (err: Error) => {
      toast.error('Failed to queue job: ' + err.message);
    }
  });
};

// Data & Analysis
export const useCoverage = () => {
  return useQuery<{ dates: string[] }>({
    queryKey: ['coverage'],
    queryFn: () => fetcher('/api/v1/data/coverage'),
    retry: false
  });
};

export const useAnalysis = () => {
  return useQuery<any>({
    queryKey: ['analysis'],
    queryFn: () => fetcher('/api/v1/results/analysis'),
    retry: false
  });
};

export const useNuuRetention = () => {
  return useQuery<any>({
    queryKey: ['nuu-retention'],
    queryFn: () => fetcher('/api/v1/results/nuu-retention'),
    retry: false
  });
};

export const useSignupFraction = () => {
  return useQuery<any>({
    queryKey: ['signup-fraction'],
    queryFn: () => fetcher('/api/v1/results/signup-fraction'),
    retry: false
  });
};

// Charts
export const useCharts = () => {
  return useQuery<{ charts: string[] }>({
    queryKey: ['charts'],
    queryFn: () => fetcher('/api/v1/artifacts/charts'),
    retry: false
  });
};
