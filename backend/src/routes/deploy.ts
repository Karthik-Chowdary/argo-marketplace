import { Router, Request, Response, NextFunction } from 'express';
import { gitDeployService } from '../services/gitDeploy';
import { wsManager } from '../websocket';
import { logger } from '../middleware/logger';
import { DeployRequest } from '../types';

const router = Router();

// POST /api/deploy — Start a deployment
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as DeployRequest;

    // Validate request
    if (!body.appName || !body.chartName || !body.chartRepo || !body.chartVersion || !body.targetNamespace) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: appName, chartName, chartRepo, chartVersion, targetNamespace',
      });
      return;
    }

    // Validate app name (DNS-compatible)
    const nameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!nameRegex.test(body.appName) && body.appName.length > 1) {
      res.status(400).json({
        success: false,
        error: 'App name must be DNS-compatible: lowercase alphanumeric and hyphens, must start and end with alphanumeric',
      });
      return;
    }

    // Set defaults
    const request: DeployRequest = {
      appName: body.appName,
      chartRepo: body.chartRepo,
      chartName: body.chartName,
      chartVersion: body.chartVersion,
      repoUrl: body.repoUrl || `https://${body.chartRepo}`,
      targetNamespace: body.targetNamespace,
      values: body.values,
      syncPolicy: body.syncPolicy || { automated: true, prune: true, selfHeal: true },
      syncOptions: body.syncOptions,
    };

    logger.info(`Starting deployment: ${request.appName}`, {
      chart: `${request.chartRepo}/${request.chartName}@${request.chartVersion}`,
      namespace: request.targetNamespace,
    });

    const deployId = await gitDeployService.deploy(request);

    // Register WebSocket progress listener
    gitDeployService.onProgress(deployId, (progress) => {
      wsManager.broadcastDeployProgress(progress);
    });

    res.status(201).json({
      success: true,
      data: {
        deployId,
        appName: request.appName,
        message: 'Deployment started',
      },
    });
  } catch (error) {
    logger.error('Failed to start deployment', { error });
    next(error);
  }
});

// GET /api/deploy/:id/status — Get deployment status
router.get('/:id/status', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const deployment = gitDeployService.getDeployment(id);

  if (!deployment) {
    res.status(404).json({
      success: false,
      error: 'Deployment not found',
    });
    return;
  }

  res.json({
    success: true,
    data: deployment,
  });
});

// POST /api/deploy/preview — Preview generated YAML without deploying
router.post('/preview', (req: Request, res: Response) => {
  const body = req.body as DeployRequest;

  if (!body.appName || !body.chartName || !body.chartRepo || !body.chartVersion || !body.targetNamespace) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
    });
    return;
  }

  const yaml = gitDeployService.generateApplicationYAML({
    ...body,
    repoUrl: body.repoUrl || `https://${body.chartRepo}`,
    syncPolicy: body.syncPolicy || { automated: true, prune: true, selfHeal: true },
  });

  res.setHeader('Content-Type', 'text/yaml');
  res.send(yaml);
});

export default router;
