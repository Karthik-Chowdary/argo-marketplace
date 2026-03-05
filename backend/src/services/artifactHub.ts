import { logger } from '../middleware/logger';
import { ArtifactHubPackage, ArtifactHubSearchResult, ChartDetail } from '../types';

const ARTIFACT_HUB_API = 'https://artifacthub.io/api/v1';

class ArtifactHubService {
  private async fetch<T>(path: string): Promise<T> {
    const url = `${ARTIFACT_HUB_API}${path}`;
    logger.debug(`Fetching Artifact Hub: ${url}`);

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ArgoMarketplace/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Artifact Hub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async searchPackages(
    query: string,
    offset = 0,
    limit = 20,
    filters?: { deprecated?: boolean; official?: boolean; verified?: boolean }
  ): Promise<{ packages: ArtifactHubPackage[]; total: number }> {
    try {
      const params = new URLSearchParams({
        ts_query_web: query,
        offset: String(offset),
        limit: String(limit),
        facets: 'true',
        kind: '0', // Helm charts only
      });

      if (filters?.deprecated === false) {
        params.set('deprecated', 'false');
      }
      if (filters?.official) {
        params.set('official', 'true');
      }
      if (filters?.verified) {
        params.set('verified_publisher', 'true');
      }

      const result = await this.fetch<ArtifactHubSearchResult>(`/packages/search?${params.toString()}`);

      const total =
        result.facets?.find((f) => f.title === 'Kind')?.options?.find((o) => o.name === 'Helm charts')?.total ||
        result.packages?.length ||
        0;

      return {
        packages: result.packages || [],
        total,
      };
    } catch (error) {
      logger.error('Failed to search Artifact Hub', { error, query });
      throw error;
    }
  }

  async getChartDetail(repoName: string, chartName: string): Promise<ChartDetail> {
    try {
      const detail = await this.fetch<ChartDetail>(`/packages/helm/${repoName}/${chartName}`);
      return detail;
    } catch (error) {
      logger.error(`Failed to get chart detail: ${repoName}/${chartName}`, { error });
      throw error;
    }
  }

  async getChartVersion(repoName: string, chartName: string, version: string): Promise<ChartDetail> {
    try {
      const detail = await this.fetch<ChartDetail>(`/packages/helm/${repoName}/${chartName}/${version}`);
      return detail;
    } catch (error) {
      logger.error(`Failed to get chart version: ${repoName}/${chartName}@${version}`, { error });
      throw error;
    }
  }

  async getDefaultValues(repoName: string, chartName: string, version?: string): Promise<string> {
    try {
      const path = version
        ? `/packages/helm/${repoName}/${chartName}/${version}/values`
        : `/packages/helm/${repoName}/${chartName}/values`;
      const response = await fetch(`${ARTIFACT_HUB_API}${path}`, {
        headers: { Accept: 'text/yaml, application/json', 'User-Agent': 'ArgoMarketplace/1.0' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return '# No default values found\n';
        }
        throw new Error(`Failed to fetch values: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        // Artifact Hub may wrap the values in a JSON object
        if (typeof json === 'string') return json;
        const yaml = await import('yaml');
        return yaml.stringify(json);
      }

      return await response.text();
    } catch (error) {
      logger.error(`Failed to get default values: ${repoName}/${chartName}`, { error });
      return '# Unable to fetch default values\n';
    }
  }

  getLogoUrl(logoImageId?: string): string | null {
    if (!logoImageId) return null;
    return `https://artifacthub.io/image/${logoImageId}`;
  }

  async getPopularCharts(): Promise<ArtifactHubPackage[]> {
    try {
      const result = await this.searchPackages('', 0, 30, { official: false, deprecated: false });
      return result.packages.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    } catch (error) {
      logger.error('Failed to get popular charts', { error });
      return [];
    }
  }
}

export const artifactHubService = new ArtifactHubService();
export default artifactHubService;
