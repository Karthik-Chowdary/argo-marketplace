// ============================================================
// ArgoCD Marketplace — Shared Types
// ============================================================

// ---- ArgoCD Application Types ----

export type HealthStatus = 'Healthy' | 'Progressing' | 'Degraded' | 'Suspended' | 'Missing' | 'Unknown';
export type SyncStatus = 'Synced' | 'OutOfSync' | 'Unknown';
export type OperationPhase = 'Running' | 'Succeeded' | 'Failed' | 'Error' | 'Terminating';

export interface ArgoApplication {
  name: string;
  namespace: string;
  project: string;
  repoURL: string;
  path: string;
  targetRevision: string;
  chart?: string;
  helm?: {
    valueFiles?: string[];
    values?: string;
    parameters?: Array<{ name: string; value: string }>;
  };
  destination: {
    server: string;
    namespace: string;
  };
  syncPolicy?: {
    automated?: {
      prune: boolean;
      selfHeal: boolean;
    };
    syncOptions?: string[];
  };
  status: {
    health: {
      status: HealthStatus;
      message?: string;
    };
    sync: {
      status: SyncStatus;
      revision?: string;
      comparedTo?: {
        source: {
          repoURL: string;
          path: string;
          targetRevision: string;
        };
        destination: {
          server: string;
          namespace: string;
        };
      };
    };
    operationState?: {
      phase: OperationPhase;
      message?: string;
      startedAt?: string;
      finishedAt?: string;
      syncResult?: {
        resources?: ResourceResult[];
      };
    };
    reconciledAt?: string;
    resources?: ResourceStatus[];
    conditions?: ApplicationCondition[];
    history?: RevisionHistory[];
  };
  createdAt?: string;
}

export interface ResourceStatus {
  group: string;
  version: string;
  kind: string;
  namespace: string;
  name: string;
  status: SyncStatus;
  health?: {
    status: HealthStatus;
    message?: string;
  };
  requiresPruning?: boolean;
}

export interface ResourceResult {
  group: string;
  version: string;
  kind: string;
  namespace: string;
  name: string;
  status: string;
  message: string;
  hookPhase?: string;
}

export interface ApplicationCondition {
  type: string;
  message: string;
  lastTransitionTime?: string;
}

export interface RevisionHistory {
  revision: string;
  deployedAt: string;
  id: number;
  source: {
    repoURL: string;
    path: string;
    targetRevision: string;
    chart?: string;
  };
}

// ---- Marketplace / Artifact Hub Types ----

export interface ArtifactHubPackage {
  package_id: string;
  name: string;
  normalized_name: string;
  description: string;
  logo_image_id?: string;
  repository: {
    name: string;
    display_name?: string;
    url: string;
    kind: number;
    official: boolean;
    verified_publisher: boolean;
  };
  version: string;
  app_version?: string;
  stars?: number;
  official?: boolean;
  signed?: boolean;
  production_organizations_count?: number;
  ts?: number;
}

export interface ArtifactHubSearchResult {
  packages: ArtifactHubPackage[];
  facets?: Array<{
    title: string;
    filter_key: string;
    options: Array<{
      id: number;
      name: string;
      total: number;
    }>;
  }>;
}

export interface ChartDetail {
  package_id: string;
  name: string;
  normalized_name: string;
  description: string;
  logo_image_id?: string;
  version: string;
  app_version?: string;
  content_url?: string;
  readme?: string;
  install?: string;
  links?: Array<{ name: string; url: string }>;
  maintainers?: Array<{ name: string; email?: string }>;
  repository: {
    name: string;
    display_name?: string;
    url: string;
    kind: number;
    official: boolean;
    verified_publisher: boolean;
  };
  available_versions?: Array<{ version: string; ts: number }>;
  default_values?: string;
  values_schema?: Record<string, unknown>;
  stars?: number;
  created_at?: number;
}

// ---- Deploy Types ----

export interface DeployRequest {
  appName: string;
  chartRepo: string;
  chartName: string;
  chartVersion: string;
  repoUrl: string;
  targetNamespace: string;
  values?: string;
  syncPolicy: {
    automated: boolean;
    prune: boolean;
    selfHeal: boolean;
  };
  syncOptions?: string[];
}

export type DeployStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DeployStep {
  id: string;
  label: string;
  status: DeployStepStatus;
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DeployProgress {
  deployId: string;
  appName: string;
  steps: DeployStep[];
  currentStep: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
}

// ---- WebSocket Message Types ----

export type WSMessageType =
  | 'app_update'
  | 'app_added'
  | 'app_deleted'
  | 'deploy_progress'
  | 'deploy_complete'
  | 'deploy_error'
  | 'connection_ack'
  | 'subscribe'
  | 'unsubscribe'
  | 'ping'
  | 'pong';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
}

export interface WSAppUpdate {
  type: 'app_update';
  payload: {
    app: ArgoApplication;
  };
  timestamp: string;
}

export interface WSDeployProgress {
  type: 'deploy_progress';
  payload: DeployProgress;
  timestamp: string;
}

// ---- API Response Types ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}
