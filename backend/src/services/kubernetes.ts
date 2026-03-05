import * as k8s from '@kubernetes/client-node';
import { logger } from '../middleware/logger';
import {
  ArgoApplication,
  HealthStatus,
  SyncStatus,
  OperationPhase,
  ResourceStatus,
  RevisionHistory,
  ApplicationCondition,
} from '../types';

class KubernetesService {
  private kc: k8s.KubeConfig;
  private customApi: k8s.CustomObjectsApi;
  private coreApi: k8s.CoreV1Api;

  private readonly ARGO_GROUP = 'argoproj.io';
  private readonly ARGO_VERSION = 'v1alpha1';
  private readonly ARGO_PLURAL = 'applications';
  private readonly ARGO_NAMESPACE = process.env.ARGOCD_NAMESPACE || 'argocd';

  constructor() {
    this.kc = new k8s.KubeConfig();

    if (process.env.KUBECONFIG) {
      this.kc.loadFromFile(process.env.KUBECONFIG);
    } else if (process.env.KUBERNETES_SERVICE_HOST) {
      this.kc.loadFromCluster();
    } else {
      this.kc.loadFromDefault();
    }

    this.customApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    logger.info('Kubernetes client initialized');
  }

  private mapArgoApp(item: Record<string, any>): ArgoApplication {
    const metadata = item.metadata || {};
    const spec = item.spec || {};
    const status = item.status || {};
    const source = spec.source || {};
    const destination = spec.destination || {};
    const syncPolicy = spec.syncPolicy || {};
    const automated = syncPolicy.automated;
    const health = status.health || {};
    const sync = status.sync || {};
    const operationState = status.operationState;
    const resources = status.resources || [];
    const conditions = status.conditions || [];
    const history = status.history || [];

    return {
      name: metadata.name,
      namespace: metadata.namespace,
      project: spec.project || 'default',
      repoURL: source.repoURL || '',
      path: source.path || '',
      targetRevision: source.targetRevision || 'HEAD',
      chart: source.chart,
      helm: source.helm,
      destination: {
        server: destination.server || 'https://kubernetes.default.svc',
        namespace: destination.namespace || 'default',
      },
      syncPolicy: syncPolicy
        ? {
            automated: automated
              ? {
                  prune: automated.prune || false,
                  selfHeal: automated.selfHeal || false,
                }
              : undefined,
            syncOptions: syncPolicy.syncOptions,
          }
        : undefined,
      status: {
        health: {
          status: (health.status as HealthStatus) || 'Unknown',
          message: health.message,
        },
        sync: {
          status: (sync.status as SyncStatus) || 'Unknown',
          revision: sync.revision,
        },
        operationState: operationState
          ? {
              phase: (operationState.phase as OperationPhase) || 'Running',
              message: operationState.message,
              startedAt: operationState.startedAt,
              finishedAt: operationState.finishedAt,
            }
          : undefined,
        reconciledAt: status.reconciledAt,
        resources: resources.map(
          (r: any): ResourceStatus => ({
            group: r.group || '',
            version: r.version || 'v1',
            kind: r.kind || '',
            namespace: r.namespace || '',
            name: r.name || '',
            status: (r.status as SyncStatus) || 'Unknown',
            health: r.health,
            requiresPruning: r.requiresPruning,
          })
        ),
        conditions: conditions.map(
          (c: any): ApplicationCondition => ({
            type: c.type || '',
            message: c.message || '',
            lastTransitionTime: c.lastTransitionTime,
          })
        ),
        history: history.map(
          (h: any): RevisionHistory => ({
            revision: h.revision || '',
            deployedAt: h.deployedAt || '',
            id: h.id || 0,
            source: {
              repoURL: h.source?.repoURL || '',
              path: h.source?.path || '',
              targetRevision: h.source?.targetRevision || '',
              chart: h.source?.chart,
            },
          })
        ),
      },
      createdAt: metadata.creationTimestamp,
    };
  }

  async listApplications(): Promise<ArgoApplication[]> {
    try {
      const response = await this.customApi.listNamespacedCustomObject({
        group: this.ARGO_GROUP,
        version: this.ARGO_VERSION,
        namespace: this.ARGO_NAMESPACE,
        plural: this.ARGO_PLURAL,
      });
      const body = response as any;
      const items = body.items || [];
      return items.map((item: any) => this.mapArgoApp(item));
    } catch (error) {
      logger.error('Failed to list ArgoCD applications', { error });
      throw error;
    }
  }

  async getApplication(name: string): Promise<ArgoApplication> {
    try {
      const response = await this.customApi.getNamespacedCustomObject({
        group: this.ARGO_GROUP,
        version: this.ARGO_VERSION,
        namespace: this.ARGO_NAMESPACE,
        plural: this.ARGO_PLURAL,
        name,
      });
      return this.mapArgoApp(response as any);
    } catch (error) {
      logger.error(`Failed to get application: ${name}`, { error });
      throw error;
    }
  }

  async syncApplication(name: string): Promise<void> {
    try {
      const response = await this.customApi.getNamespacedCustomObject({
        group: this.ARGO_GROUP,
        version: this.ARGO_VERSION,
        namespace: this.ARGO_NAMESPACE,
        plural: this.ARGO_PLURAL,
        name,
      });
      const app = response as any;
      const operation = {
        operation: {
          initiatedBy: { username: 'argo-marketplace' },
          sync: {
            revision: app.spec?.source?.targetRevision || 'HEAD',
            prune: true,
          },
        },
      };

      await this.customApi.patchNamespacedCustomObject({
        group: this.ARGO_GROUP,
        version: this.ARGO_VERSION,
        namespace: this.ARGO_NAMESPACE,
        plural: this.ARGO_PLURAL,
        name,
        body: operation,
      }, {
        headers: { 'Content-Type': 'application/merge-patch+json' },
      } as any);

      logger.info(`Sync triggered for application: ${name}`);
    } catch (error) {
      logger.error(`Failed to sync application: ${name}`, { error });
      throw error;
    }
  }

  async deleteApplication(name: string): Promise<void> {
    try {
      await this.customApi.deleteNamespacedCustomObject({
        group: this.ARGO_GROUP,
        version: this.ARGO_VERSION,
        namespace: this.ARGO_NAMESPACE,
        plural: this.ARGO_PLURAL,
        name,
      });
      logger.info(`Deleted application: ${name}`);
    } catch (error) {
      logger.error(`Failed to delete application: ${name}`, { error });
      throw error;
    }
  }

  async getNamespaces(): Promise<string[]> {
    try {
      const response = await this.coreApi.listNamespace();
      return (response.items || []).map((ns: any) => ns.metadata?.name || '').filter(Boolean);
    } catch (error) {
      logger.error('Failed to list namespaces', { error });
      return ['default', 'kube-system', 'argocd'];
    }
  }

  async watchApplications(callback: (type: string, app: ArgoApplication) => void): Promise<() => void> {
    const watch = new k8s.Watch(this.kc);
    let aborted = false;

    const startWatch = async () => {
      if (aborted) return;
      try {
        await watch.watch(
          `/apis/${this.ARGO_GROUP}/${this.ARGO_VERSION}/namespaces/${this.ARGO_NAMESPACE}/${this.ARGO_PLURAL}`,
          {},
          (type: string, apiObj: any) => {
            try {
              const app = this.mapArgoApp(apiObj);
              callback(type, app);
            } catch (e) {
              logger.error('Error mapping watch event', { error: e });
            }
          },
          (err: any) => {
            if (!aborted) {
              logger.warn('Watch connection closed, reconnecting...', { error: err });
              setTimeout(startWatch, 3000);
            }
          }
        );
      } catch (error) {
        if (!aborted) {
          logger.error('Failed to start watch, retrying...', { error });
          setTimeout(startWatch, 5000);
        }
      }
    };

    startWatch();

    return () => {
      aborted = true;
    };
  }
}

export const k8sService = new KubernetesService();
export default k8sService;
