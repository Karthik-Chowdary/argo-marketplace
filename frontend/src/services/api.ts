import type { ApiResponse, ArgoApplication, MarketplacePackage, ChartDetail, DeployRequest, DeployProgress } from '../types';

const API_BASE = '/api';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ---- Applications ----

export async function fetchApplications(): Promise<ArgoApplication[]> {
  const res = await fetchApi<ApiResponse<ArgoApplication[]>>('/apps');
  return res.data || [];
}

export async function fetchApplication(name: string): Promise<ArgoApplication> {
  const res = await fetchApi<ApiResponse<ArgoApplication>>(`/apps/${name}`);
  if (!res.data) throw new Error('Application not found');
  return res.data;
}

export async function syncApplication(name: string): Promise<void> {
  await fetchApi(`/apps/${name}/sync`, { method: 'POST' });
}

export async function deleteApplication(name: string): Promise<void> {
  await fetchApi(`/apps/${name}`, { method: 'DELETE' });
}

// ---- Marketplace ----

export async function searchMarketplace(
  query: string,
  offset = 0,
  limit = 20,
  options?: { official?: boolean; verified?: boolean }
): Promise<{ packages: MarketplacePackage[]; total: number }> {
  const params = new URLSearchParams({
    q: query,
    offset: String(offset),
    limit: String(limit),
  });
  if (options?.official) params.set('official', 'true');
  if (options?.verified) params.set('verified', 'true');

  const res = await fetchApi<ApiResponse<MarketplacePackage[]> & { total: number }>(
    `/marketplace/search?${params.toString()}`
  );
  return {
    packages: res.data || [],
    total: res.total || 0,
  };
}

export async function fetchPopularCharts(): Promise<MarketplacePackage[]> {
  const res = await fetchApi<ApiResponse<MarketplacePackage[]>>('/marketplace/popular');
  return res.data || [];
}

export async function fetchChartDetail(repo: string, name: string, version?: string): Promise<ChartDetail> {
  const params = version ? `?version=${version}` : '';
  const res = await fetchApi<ApiResponse<ChartDetail>>(`/marketplace/chart/${repo}/${name}${params}`);
  if (!res.data) throw new Error('Chart not found');
  return res.data;
}

// ---- Deploy ----

export async function startDeploy(request: DeployRequest): Promise<{ deployId: string; appName: string }> {
  const res = await fetchApi<ApiResponse<{ deployId: string; appName: string }>>('/deploy', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (!res.data) throw new Error('Deploy failed');
  return res.data;
}

export async function fetchDeployStatus(deployId: string): Promise<DeployProgress> {
  const res = await fetchApi<ApiResponse<DeployProgress>>(`/deploy/${deployId}/status`);
  if (!res.data) throw new Error('Deployment not found');
  return res.data;
}

export async function previewDeployYaml(request: DeployRequest): Promise<string> {
  const response = await fetch(`${API_BASE}/deploy/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Preview failed');
  return response.text();
}

// ---- Health ----

export async function fetchHealth(): Promise<{
  status: string;
  version: string;
  uptime: number;
  wsClients: number;
}> {
  return fetchApi('/health');
}
