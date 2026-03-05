import { useState, useEffect } from 'react';
import { Box, Grid2 as Grid, Typography, TextField, InputAdornment, Stack, alpha, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Search as SearchIcon, GridView as GridIcon, ViewList as ListIcon, Store as StoreIcon } from '@mui/icons-material';
import { useMarketplaceSearch, usePopularCharts } from '../hooks';
import { ChartCard, MarketplaceSkeleton, EmptyState } from '../components';

export function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchResult, isLoading: isSearching } = useMarketplaceSearch(debouncedQuery, 0, 24);
  const { data: popularCharts, isLoading: isLoadingPopular } = usePopularCharts();

  const isSearchActive = debouncedQuery.length > 0;
  const charts = isSearchActive ? searchResult?.packages || [] : popularCharts || [];
  const isLoading = isSearchActive ? isSearching : isLoadingPopular;

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha('#7c3aed', 0.08)}, ${alpha('#00d4ff', 0.05)})`,
          border: `1px solid ${alpha('#7c3aed', 0.1)}`,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h3" sx={{ mb: 0.5 }}>
              Helm Chart Marketplace
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse, search, and deploy popular Helm charts from Artifact Hub
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="Search charts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ minWidth: 300 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v) => v && setViewMode(v)}
              size="small"
            >
              <ToggleButton value="grid"><GridIcon /></ToggleButton>
              <ToggleButton value="list"><ListIcon /></ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Box>

      {/* Section title */}
      <Typography variant="h4" sx={{ mb: 2 }}>
        {isSearchActive
          ? `Search results for "${debouncedQuery}" (${searchResult?.total || 0})`
          : 'Popular Charts'}
      </Typography>

      {/* Charts Grid */}
      {isLoading ? (
        <MarketplaceSkeleton />
      ) : charts.length === 0 ? (
        <EmptyState
          icon={<StoreIcon sx={{ fontSize: 40 }} />}
          title="No charts found"
          description={isSearchActive ? 'Try a different search term' : 'Unable to load charts from Artifact Hub'}
        />
      ) : (
        <Grid container spacing={2.5}>
          {charts.map((chart, i) => (
            <Grid
              key={chart.package_id}
              size={viewMode === 'grid' ? { xs: 12, sm: 6, md: 4, lg: 3 } : { xs: 12 }}
            >
              <ChartCard chart={chart} index={i} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default MarketplacePage;
