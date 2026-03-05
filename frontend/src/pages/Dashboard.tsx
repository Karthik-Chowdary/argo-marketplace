import { useMemo, useState } from 'react';
import { Box, Grid2 as Grid, Typography, TextField, InputAdornment, Stack, Chip, alpha, Button } from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Apps as AppsIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useApplications } from '../hooks';
import { AppCard, DashboardSkeleton, EmptyState } from '../components';
import type { HealthStatus } from '../types';

export function DashboardPage() {
  const { data: applications, isLoading, refetch, isRefetching } = useApplications();
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthStatus | null>(null);

  const filteredApps = useMemo(() => {
    if (!applications) return [];
    let filtered = applications;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          (app.chart || '').toLowerCase().includes(q) ||
          app.destination.namespace.toLowerCase().includes(q)
      );
    }
    if (healthFilter) {
      filtered = filtered.filter((app) => app.status.health.status === healthFilter);
    }
    return filtered;
  }, [applications, search, healthFilter]);

  const healthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (applications || []).forEach((app) => {
      const h = app.status.health.status;
      counts[h] = (counts[h] || 0) + 1;
    });
    return counts;
  }, [applications]);

  const healthFilters: Array<{ status: HealthStatus; color: string }> = [
    { status: 'Healthy', color: '#22c55e' },
    { status: 'Progressing', color: '#eab308' },
    { status: 'Degraded', color: '#ef4444' },
    { status: 'Suspended', color: '#3b82f6' },
    { status: 'Missing', color: '#6b7280' },
    { status: 'Unknown', color: '#6b7280' },
  ];

  return (
    <Box>
      {/* Stats Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box
          sx={{
            mb: 3,
            p: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha('#00d4ff', 0.05)}, ${alpha('#7c3aed', 0.05)})`,
            border: `1px solid ${alpha('#00d4ff', 0.08)}`,
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                Applications
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {applications?.length || 0} applications managed by ArgoCD
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                placeholder="Search applications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 250 }}
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
              <Button
                variant="outlined"
                size="small"
                onClick={() => refetch()}
                disabled={isRefetching}
                startIcon={<RefreshIcon sx={{ animation: isRefetching ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />}
                sx={{ height: 40 }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
        </Box>
      </motion.div>

      {/* Health filter chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <Chip
          label={`All (${applications?.length || 0})`}
          onClick={() => setHealthFilter(null)}
          variant={healthFilter === null ? 'filled' : 'outlined'}
          color={healthFilter === null ? 'primary' : 'default'}
          size="small"
        />
        {healthFilters.map(({ status, color }) => {
          const count = healthCounts[status] || 0;
          if (count === 0) return null;
          return (
            <Chip
              key={status}
              label={`${status} (${count})`}
              onClick={() => setHealthFilter(healthFilter === status ? null : status)}
              variant={healthFilter === status ? 'filled' : 'outlined'}
              size="small"
              sx={{
                borderColor: healthFilter === status ? color : alpha(color, 0.3),
                color: healthFilter === status ? '#fff' : color,
                bgcolor: healthFilter === status ? alpha(color, 0.2) : 'transparent',
                '&:hover': { bgcolor: alpha(color, 0.15) },
              }}
            />
          );
        })}
      </Stack>

      {/* App Grid */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : filteredApps.length === 0 ? (
        <EmptyState
          icon={<AppsIcon sx={{ fontSize: 40 }} />}
          title={search || healthFilter ? 'No matching applications' : 'No applications yet'}
          description={
            search || healthFilter
              ? 'Try adjusting your search or filter criteria'
              : 'Deploy your first application from the Marketplace'
          }
        />
      ) : (
        <AnimatePresence mode="wait">
          <Grid container spacing={2.5}>
            {filteredApps.map((app, i) => (
              <Grid key={app.name} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <AppCard app={app} index={i} />
              </Grid>
            ))}
          </Grid>
        </AnimatePresence>
      )}
    </Box>
  );
}

export default DashboardPage;
