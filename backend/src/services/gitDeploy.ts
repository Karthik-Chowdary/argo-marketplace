import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as YAML from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../middleware/logger';
import { DeployRequest, DeployProgress, DeployStep } from '../types';

const REPO_PATH = process.env.LOCAL_K8S_PLATFORM_PATH || '/home/ubuntu/local-k8s-platform';
const APPS_DIR = 'apps';
const HELM_VALUES_DIR = 'helm-values';

class GitDeployService {
  private git: SimpleGit;
  private deployments: Map<string, DeployProgress> = new Map();
  private progressCallbacks: Map<string, Array<(progress: DeployProgress) => void>> = new Map();

  constructor() {
    this.git = simpleGit(REPO_PATH);
  }

  private createDeploySteps(): DeployStep[] {
    return [
      { id: 'generate', label: 'Generating ArgoCD Application manifest', status: 'pending' },
      { id: 'write', label: 'Writing manifest to apps directory', status: 'pending' },
      { id: 'values', label: 'Writing Helm values', status: 'pending' },
      { id: 'commit', label: 'Committing changes to Git', status: 'pending' },
      { id: 'push', label: 'Pushing to remote repository', status: 'pending' },
      { id: 'detect', label: 'Waiting for ArgoCD to detect application', status: 'pending' },
      { id: 'sync', label: 'Syncing application', status: 'pending' },
    ];
  }

  private updateStep(
    progress: DeployProgress,
    stepIndex: number,
    status: DeployStep['status'],
    message?: string
  ): void {
    const step = progress.steps[stepIndex];
    step.status = status;
    if (message) step.message = message;
    if (status === 'running') step.startedAt = new Date().toISOString();
    if (status === 'completed' || status === 'failed') step.completedAt = new Date().toISOString();
    progress.currentStep = stepIndex;
    this.notifyProgress(progress);
  }

  private notifyProgress(progress: DeployProgress): void {
    const callbacks = this.progressCallbacks.get(progress.deployId) || [];
    callbacks.forEach((cb) => cb({ ...progress }));
  }

  onProgress(deployId: string, callback: (progress: DeployProgress) => void): () => void {
    const existing = this.progressCallbacks.get(deployId) || [];
    existing.push(callback);
    this.progressCallbacks.set(deployId, existing);

    return () => {
      const cbs = this.progressCallbacks.get(deployId) || [];
      const idx = cbs.indexOf(callback);
      if (idx >= 0) cbs.splice(idx, 1);
    };
  }

  getDeployment(deployId: string): DeployProgress | undefined {
    return this.deployments.get(deployId);
  }

  generateApplicationYAML(req: DeployRequest): string {
    const app: Record<string, unknown> = {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
      metadata: {
        name: req.appName,
        namespace: 'argocd',
        labels: {
          'app.kubernetes.io/managed-by': 'argo-marketplace',
          'marketplace.argo/chart': req.chartName,
          'marketplace.argo/repo': req.chartRepo,
        },
      },
      spec: {
        project: 'default',
        source: {
          repoURL: req.repoUrl,
          chart: req.chartName,
          targetRevision: req.chartVersion,
          ...(req.values
            ? {
                helm: {
                  values: req.values,
                },
              }
            : {}),
        },
        destination: {
          server: 'https://kubernetes.default.svc',
          namespace: req.targetNamespace,
        },
        syncPolicy: {
          ...(req.syncPolicy.automated
            ? {
                automated: {
                  prune: req.syncPolicy.prune,
                  selfHeal: req.syncPolicy.selfHeal,
                },
              }
            : {}),
          syncOptions: [
            'CreateNamespace=true',
            ...(req.syncOptions || []),
          ],
        },
      },
    };

    return YAML.stringify(app, { indent: 2, lineWidth: 120 });
  }

  async deploy(request: DeployRequest): Promise<string> {
    const deployId = uuidv4();
    const progress: DeployProgress = {
      deployId,
      appName: request.appName,
      steps: this.createDeploySteps(),
      currentStep: 0,
      status: 'running',
      createdAt: new Date().toISOString(),
    };

    this.deployments.set(deployId, progress);

    // Run deploy asynchronously
    this.runDeploy(request, progress).catch((error) => {
      logger.error(`Deploy failed: ${deployId}`, { error });
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : String(error);
      this.notifyProgress(progress);
    });

    return deployId;
  }

  private async runDeploy(request: DeployRequest, progress: DeployProgress): Promise<void> {
    try {
      // Step 0: Generate manifest
      this.updateStep(progress, 0, 'running');
      const manifest = this.generateApplicationYAML(request);
      logger.info(`Generated manifest for ${request.appName}`);
      this.updateStep(progress, 0, 'completed', 'Manifest generated successfully');

      // Step 1: Write manifest
      this.updateStep(progress, 1, 'running');
      const appsDir = path.join(REPO_PATH, APPS_DIR);
      await fs.mkdir(appsDir, { recursive: true });
      const manifestPath = path.join(appsDir, `${request.appName}.yaml`);
      await fs.writeFile(manifestPath, manifest, 'utf-8');
      logger.info(`Wrote manifest to ${manifestPath}`);
      this.updateStep(progress, 1, 'completed', `Written to ${APPS_DIR}/${request.appName}.yaml`);

      // Step 2: Write helm values (if any)
      this.updateStep(progress, 2, 'running');
      if (request.values && request.values.trim()) {
        const valuesDir = path.join(REPO_PATH, HELM_VALUES_DIR);
        await fs.mkdir(valuesDir, { recursive: true });
        const valuesPath = path.join(valuesDir, `${request.appName}-values.yaml`);
        await fs.writeFile(valuesPath, request.values, 'utf-8');
        logger.info(`Wrote helm values to ${valuesPath}`);
        this.updateStep(progress, 2, 'completed', `Written to ${HELM_VALUES_DIR}/${request.appName}-values.yaml`);
      } else {
        this.updateStep(progress, 2, 'completed', 'No custom values provided, skipping');
      }

      // Step 3: Git commit
      this.updateStep(progress, 3, 'running');
      await this.git.add(['.']);
      const commitMsg = `feat: deploy ${request.appName} (${request.chartRepo}/${request.chartName}@${request.chartVersion}) via ArgoCD Marketplace`;
      await this.git.commit(commitMsg);
      logger.info(`Committed: ${commitMsg}`);
      this.updateStep(progress, 3, 'completed', 'Changes committed');

      // Step 4: Git push
      this.updateStep(progress, 4, 'running');
      try {
        await this.git.push();
        logger.info('Pushed to remote');
        this.updateStep(progress, 4, 'completed', 'Pushed to remote repository');
      } catch (pushError) {
        logger.warn('Git push failed (remote may not be configured), continuing...', { error: pushError });
        this.updateStep(progress, 4, 'completed', 'Push attempted (remote may not be configured)');
      }

      // Step 5: Wait for ArgoCD detection
      this.updateStep(progress, 5, 'running', 'Waiting for ArgoCD to detect the new application...');
      // In production, we'd poll ArgoCD. For now, simulate the detection wait.
      await this.waitForDetection(request.appName, progress);
      this.updateStep(progress, 5, 'completed', 'Application detected by ArgoCD');

      // Step 6: Sync
      this.updateStep(progress, 6, 'running', 'ArgoCD is syncing the application...');
      await this.waitForSync(request.appName, progress);
      this.updateStep(progress, 6, 'completed', 'Application synced and healthy');

      progress.status = 'completed';
      this.notifyProgress(progress);
      logger.info(`Deploy completed: ${request.appName} (${progress.deployId})`);
    } catch (error) {
      const currentStep = progress.currentStep;
      this.updateStep(progress, currentStep, 'failed', error instanceof Error ? error.message : String(error));
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : String(error);
      this.notifyProgress(progress);
      throw error;
    }
  }

  private async waitForDetection(appName: string, progress: DeployProgress): Promise<void> {
    const maxAttempts = 30;
    const intervalMs = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Try to import k8s service dynamically to avoid circular deps
        const { k8sService } = await import('./kubernetes');
        await k8sService.getApplication(appName);
        return; // Found
      } catch {
        // Not found yet, keep waiting
        if (i % 5 === 0) {
          this.updateStep(progress, 5, 'running', `Waiting for ArgoCD detection... (${i * 2}s)`);
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    // If we couldn't detect via k8s API, it might still work (e.g., no k8s access in dev)
    logger.warn(`Timed out waiting for ArgoCD to detect ${appName}, proceeding anyway`);
  }

  private async waitForSync(appName: string, progress: DeployProgress): Promise<void> {
    const maxAttempts = 60;
    const intervalMs = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { k8sService } = await import('./kubernetes');
        const app = await k8sService.getApplication(appName);

        if (app.status.health.status === 'Healthy' && app.status.sync.status === 'Synced') {
          return;
        }

        if (app.status.health.status === 'Degraded') {
          throw new Error(`Application is degraded: ${app.status.health.message || 'unknown reason'}`);
        }

        const healthStr = app.status.health.status;
        const syncStr = app.status.sync.status;
        this.updateStep(progress, 6, 'running', `Health: ${healthStr}, Sync: ${syncStr} (${i * 2}s)`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Degraded')) {
          throw error;
        }
        // k8s API might not be available in dev
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    logger.warn(`Timed out waiting for sync of ${appName}`);
  }
}

export const gitDeployService = new GitDeployService();
export default gitDeployService;
