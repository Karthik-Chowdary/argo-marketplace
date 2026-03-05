// ============================================================
// ArgoCD Marketplace — Frontend Types
// ============================================================

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
    };
    operationState?: {
      phase: OperationPhase;
      message?: string;
      startedAt?: string;
      finishedAt?: string;
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

export interface MarketplacePackage {
  package_id: string;
  name: string;
  normalized_name: string;
  description: string;
  logo_image_id?: string;
  logo_url?: string | null;
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

export interface ChartDetail extends MarketplacePackage {
  readme?: string;
  install?: string;
  content_url?: string;
  links?: Array<{ name: string; url: string }>;
  maintainers?: Array<{ name: string; email?: string }>;
  available_versions?: Array<{ version: string; ts: number }>;
  default_values?: string;
  values_schema?: Record<string, unknown>;
  created_at?: number;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  _mock?: boolean;
}

export type WSMessageType =
  | 'app_update'
  | 'app_added'
  | 'app_deleted'
  | 'deploy_progress'
  | 'connection_ack'
  | 'pong';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
}
