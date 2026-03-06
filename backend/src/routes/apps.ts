import { Router, Request, Response, NextFunction } from 'express';
import { k8sService } from '../services/kubernetes';
import { logger } from '../middleware/logger';

const router = Router();

// GET /api/apps — List all ArgoCD applications
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const apps = await k8sService.listApplications();
    res.json({
      success: true,
      data: apps,
      total: apps.length,
    });
  } catch (error) {
    logger.error('Failed to list applications', { error });
    // Return mock data in development if K8s is not available
    if (process.env.NODE_ENV === 'development' || process.env.MOCK_K8S === 'true') {
      res.json({
        success: true,
        data: getMockApps(),
        total: getMockApps().length,
        _mock: true,
      });
    } else {
      next(error);
    }
  }
});

// GET /api/apps/:name — Get application detail
router.get('/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.params.name);
    const app = await k8sService.getApplication(name);
    res.json({ success: true, data: app });
  } catch (error) {
    logger.error(`Failed to get application: ${req.params.name}`, { error });
    if (process.env.NODE_ENV === 'development' || process.env.MOCK_K8S === 'true') {
      const mock = getMockApps().find((a) => a.name === req.params.name);
      if (mock) {
        res.json({ success: true, data: mock, _mock: true });
      } else {
        res.status(404).json({ success: false, error: 'Application not found' });
      }
    } else {
      next(error);
    }
  }
});

// POST /api/apps/:name/sync — Trigger sync
router.post('/:name/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.params.name);
    await k8sService.syncApplication(name);
    res.json({ success: true, message: `Sync triggered for ${name}` });
  } catch (error) {
    logger.error(`Failed to sync application: ${req.params.name}`, { error });
    next(error);
  }
});

// DELETE /api/apps/:name — Delete application
router.delete('/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.params.name);
    await k8sService.deleteApplication(name);
    res.json({ success: true, message: `Application ${name} deleted` });
  } catch (error) {
    logger.error(`Failed to delete application: ${req.params.name}`, { error });
    next(error);
  }
});

function getMockApps() {
  return [
    {
      name: 'prometheus',
      namespace: 'argocd',
      project: 'default',
      repoURL: 'https://prometheus-community.github.io/helm-charts',
      path: '',
      targetRevision: '25.8.0',
      chart: 'kube-prometheus-stack',
      destination: { server: 'https://kubernetes.default.svc', namespace: 'monitoring' },
      syncPolicy: { automated: { prune: true, selfHeal: true }, syncOptions: ['CreateNamespace=true'] },
      status: {
        health: { status: 'Healthy' as const },
        sync: { status: 'Synced' as const, revision: 'abc123' },
        reconciledAt: new Date(Date.now() - 120000).toISOString(),
        resources: [
          { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'monitoring', name: 'prometheus-server', status: 'Synced' as const, health: { status: 'Healthy' as const } },
          { group: 'apps', version: 'v1', kind: 'StatefulSet', namespace: 'monitoring', name: 'alertmanager', status: 'Synced' as const, health: { status: 'Healthy' as const } },
          { group: '', version: 'v1', kind: 'Service', namespace: 'monitoring', name: 'prometheus-server', status: 'Synced' as const, health: { status: 'Healthy' as const } },
          { group: '', version: 'v1', kind: 'ConfigMap', namespace: 'monitoring', name: 'prometheus-config', status: 'Synced' as const },
        ],
        conditions: [],
        history: [
          { revision: 'abc123', deployedAt: new Date(Date.now() - 86400000).toISOString(), id: 1, source: { repoURL: 'https://prometheus-community.github.io/helm-charts', path: '', targetRevision: '25.8.0', chart: 'kube-prometheus-stack' } },
        ],
      },
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      name: 'grafana',
      namespace: 'argocd',
      project: 'default',
      repoURL: 'https://grafana.github.io/helm-charts',
      path: '',
      targetRevision: '7.0.0',
      chart: 'grafana',
      destination: { server: 'https://kubernetes.default.svc', namespace: 'monitoring' },
      syncPolicy: { automated: { prune: true, selfHeal: true } },
      status: {
        health: { status: 'Healthy' as const },
        sync: { status: 'Synced' as const, revision: 'def456' },
        reconciledAt: new Date(Date.now() - 60000).toISOString(),
        resources: [
          { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'monitoring', name: 'grafana', status: 'Synced' as const, health: { status: 'Healthy' as const } },
          { group: '', version: 'v1', kind: 'Service', namespace: 'monitoring', name: 'grafana', status: 'Synced' as const, health: { status: 'Healthy' as const } },
        ],
        conditions: [],
        history: [],
      },
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      name: 'cert-manager',
      namespace: 'argocd',
      project: 'default',
      repoURL: 'https://charts.jetstack.io',
      path: '',
      targetRevision: '1.14.0',
      chart: 'cert-manager',
      destination: { server: 'https://kubernetes.default.svc', namespace: 'cert-manager' },
      syncPolicy: { automated: { prune: false, selfHeal: true } },
      status: {
        health: { status: 'Progressing' as const, message: 'Waiting for pods to be ready' },
        sync: { status: 'OutOfSync' as const },
        reconciledAt: new Date(Date.now() - 30000).toISOString(),
        resources: [
          { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'cert-manager', name: 'cert-manager', status: 'OutOfSync' as const, health: { status: 'Progressing' as const } },
          { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'cert-manager', name: 'cert-manager-webhook', status: 'Synced' as const, health: { status: 'Healthy' as const } },
        ],
        conditions: [{ type: 'SyncError', message: 'Resource out of sync' }],
        history: [],
      },
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      name: 'nginx-ingress',
      namespace: 'argocd',
      project: 'default',
      repoURL: 'https://kubernetes.github.io/ingress-nginx',
      path: '',
      targetRevision: '4.9.0',
      chart: 'ingress-nginx',
      destination: { server: 'https://kubernetes.default.svc', namespace: 'ingress-nginx' },
      status: {
        health: { status: 'Degraded' as const, message: 'Deployment has minimum availability' },
        sync: { status: 'Synced' as const },
        reconciledAt: new Date(Date.now() - 300000).toISOString(),
        resources: [
          { group: 'apps', version: 'v1', kind: 'Deployment', namespace: 'ingress-nginx', name: 'ingress-nginx-controller', status: 'Synced' as const, health: { status: 'Degraded' as const, message: '0/1 replicas ready' } },
        ],
        conditions: [],
        history: [],
      },
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];
}

export default router;
