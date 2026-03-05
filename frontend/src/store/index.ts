import { create } from 'zustand';
import type { ArgoApplication, DeployProgress, MarketplacePackage, ChartDetail } from '../types';

// ---- App Store ----
interface AppState {
  applications: ArgoApplication[];
  selectedApp: ArgoApplication | null;
  isLoading: boolean;
  error: string | null;
  setApplications: (apps: ArgoApplication[]) => void;
  updateApplication: (app: ArgoApplication) => void;
  addApplication: (app: ArgoApplication) => void;
  removeApplication: (name: string) => void;
  setSelectedApp: (app: ArgoApplication | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  applications: [],
  selectedApp: null,
  isLoading: false,
  error: null,
  setApplications: (applications) => set({ applications, isLoading: false, error: null }),
  updateApplication: (app) =>
    set((state) => ({
      applications: state.applications.map((a) => (a.name === app.name ? app : a)),
      selectedApp: state.selectedApp?.name === app.name ? app : state.selectedApp,
    })),
  addApplication: (app) =>
    set((state) => ({
      applications: [...state.applications.filter((a) => a.name !== app.name), app],
    })),
  removeApplication: (name) =>
    set((state) => ({
      applications: state.applications.filter((a) => a.name !== name),
      selectedApp: state.selectedApp?.name === name ? null : state.selectedApp,
    })),
  setSelectedApp: (selectedApp) => set({ selectedApp }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));

// ---- Deploy Store ----
interface DeployState {
  activeDeployments: Map<string, DeployProgress>;
  selectedChart: ChartDetail | null;
  deployValues: string;
  deployConfig: {
    appName: string;
    targetNamespace: string;
    syncPolicy: {
      automated: boolean;
      prune: boolean;
      selfHeal: boolean;
    };
  };
  setActiveDeployment: (id: string, progress: DeployProgress) => void;
  removeDeployment: (id: string) => void;
  setSelectedChart: (chart: ChartDetail | null) => void;
  setDeployValues: (values: string) => void;
  setDeployConfig: (config: Partial<DeployState['deployConfig']>) => void;
  resetDeploy: () => void;
}

const defaultDeployConfig = {
  appName: '',
  targetNamespace: 'default',
  syncPolicy: {
    automated: true,
    prune: true,
    selfHeal: true,
  },
};

export const useDeployStore = create<DeployState>((set) => ({
  activeDeployments: new Map(),
  selectedChart: null,
  deployValues: '',
  deployConfig: { ...defaultDeployConfig },
  setActiveDeployment: (id, progress) =>
    set((state) => {
      const newMap = new Map(state.activeDeployments);
      newMap.set(id, progress);
      return { activeDeployments: newMap };
    }),
  removeDeployment: (id) =>
    set((state) => {
      const newMap = new Map(state.activeDeployments);
      newMap.delete(id);
      return { activeDeployments: newMap };
    }),
  setSelectedChart: (selectedChart) => set({ selectedChart }),
  setDeployValues: (deployValues) => set({ deployValues }),
  setDeployConfig: (config) =>
    set((state) => ({
      deployConfig: { ...state.deployConfig, ...config },
    })),
  resetDeploy: () =>
    set({
      selectedChart: null,
      deployValues: '',
      deployConfig: { ...defaultDeployConfig },
    }),
}));

// ---- UI Store ----
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  searchQuery: string;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  searchQuery: '',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));

// ---- Marketplace Store ----
interface MarketplaceState {
  searchResults: MarketplacePackage[];
  popularCharts: MarketplacePackage[];
  searchQuery: string;
  isSearching: boolean;
  total: number;
  setSearchResults: (results: MarketplacePackage[], total: number) => void;
  setPopularCharts: (charts: MarketplacePackage[]) => void;
  setSearchQuery: (query: string) => void;
  setSearching: (searching: boolean) => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  searchResults: [],
  popularCharts: [],
  searchQuery: '',
  isSearching: false,
  total: 0,
  setSearchResults: (searchResults, total) => set({ searchResults, total, isSearching: false }),
  setPopularCharts: (popularCharts) => set({ popularCharts }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearching: (isSearching) => set({ isSearching }),
}));
