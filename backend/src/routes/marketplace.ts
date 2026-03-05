import { Router, Request, Response, NextFunction } from 'express';
import { artifactHubService } from '../services/artifactHub';
import { logger } from '../middleware/logger';

const router = Router();

// GET /api/marketplace/search?q=...&offset=0&limit=20
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string) || '';
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const official = req.query.official === 'true' ? true : undefined;
    const verified = req.query.verified === 'true' ? true : undefined;

    const result = await artifactHubService.searchPackages(query, offset, limit, {
      deprecated: false,
      official,
      verified,
    });

    // Enrich with logo URLs
    const enriched = result.packages.map((pkg) => ({
      ...pkg,
      logo_url: artifactHubService.getLogoUrl(pkg.logo_image_id),
    }));

    res.json({
      success: true,
      data: enriched,
      total: result.total,
      offset,
      limit,
    });
  } catch (error) {
    logger.error('Marketplace search failed', { error, query: req.query.q });
    next(error);
  }
});

// GET /api/marketplace/popular — Popular charts
router.get('/popular', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const charts = await artifactHubService.getPopularCharts();
    const enriched = charts.map((pkg) => ({
      ...pkg,
      logo_url: artifactHubService.getLogoUrl(pkg.logo_image_id),
    }));

    res.json({
      success: true,
      data: enriched,
      total: enriched.length,
    });
  } catch (error) {
    logger.error('Failed to get popular charts', { error });
    next(error);
  }
});

// GET /api/marketplace/chart/:repo/:name — Chart details
router.get('/chart/:repo/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repo, name } = req.params;
    const version = req.query.version as string | undefined;

    let detail;
    if (version) {
      detail = await artifactHubService.getChartVersion(repo, name, version);
    } else {
      detail = await artifactHubService.getChartDetail(repo, name);
    }

    // Fetch default values
    const defaultValues = await artifactHubService.getDefaultValues(repo, name, version);

    res.json({
      success: true,
      data: {
        ...detail,
        logo_url: artifactHubService.getLogoUrl(detail.logo_image_id),
        default_values: defaultValues,
      },
    });
  } catch (error) {
    logger.error(`Failed to get chart: ${req.params.repo}/${req.params.name}`, { error });
    next(error);
  }
});

// GET /api/marketplace/chart/:repo/:name/values — Get default values only
router.get('/chart/:repo/:name/values', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repo, name } = req.params;
    const version = req.query.version as string | undefined;

    const values = await artifactHubService.getDefaultValues(repo, name, version);

    res.setHeader('Content-Type', 'text/yaml');
    res.send(values);
  } catch (error) {
    logger.error(`Failed to get values: ${req.params.repo}/${req.params.name}`, { error });
    next(error);
  }
});

export default router;
