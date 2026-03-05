import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchApplications,
  fetchApplication,
  syncApplication,
  deleteApplication,
  searchMarketplace,
  fetchPopularCharts,
  fetchChartDetail,
  startDeploy,
  fetchDeployStatus,
} from '../services/api';
import type { DeployRequest } from '../types';

// ---- Applications ----

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useApplication(name: string) {
  return useQuery({
    queryKey: ['application', name],
    queryFn: () => fetchApplication(name),
    enabled: !!name,
    refetchInterval: 15000,
    staleTime: 5000,
  });
}

export function useSyncApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => syncApplication(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteApplication(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

// ---- Marketplace ----

export function useMarketplaceSearch(query: string, offset = 0, limit = 20) {
  return useQuery({
    queryKey: ['marketplace', 'search', query, offset, limit],
    queryFn: () => searchMarketplace(query, offset, limit),
    enabled: query.length > 0,
    staleTime: 60000,
  });
}

export function usePopularCharts() {
  return useQuery({
    queryKey: ['marketplace', 'popular'],
    queryFn: fetchPopularCharts,
    staleTime: 300000,
  });
}

export function useChartDetail(repo: string, name: string, version?: string) {
  return useQuery({
    queryKey: ['marketplace', 'chart', repo, name, version],
    queryFn: () => fetchChartDetail(repo, name, version),
    enabled: !!repo && !!name,
    staleTime: 120000,
  });
}

// ---- Deploy ----

export function useDeploy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: DeployRequest) => startDeploy(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useDeployStatus(deployId: string) {
  return useQuery({
    queryKey: ['deploy', deployId],
    queryFn: () => fetchDeployStatus(deployId),
    enabled: !!deployId,
    refetchInterval: 2000,
  });
}
