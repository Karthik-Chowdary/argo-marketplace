import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Sync as SyncIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  OpenInNew as OpenIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useApplication, useSyncApplication, useDeleteApplication } from '../hooks';
import { HealthChip, SyncChip } from '../components';

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString();
}

export function AppDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: app, isLoading, refetch } = useApplication(name || '');
  const syncMutation = useSyncApplication();
  const deleteMutation = useDeleteApplication();
  const [tab, setTab] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const resources = useMemo(() => app?.status.resources || [], [app]);
  const history = useMemo(() => [...(app?.status.history || [])].reverse(), [app]);
  const conditions = useMemo(() => app?.status.conditions || [], [app]);

  const handleSync = async () => {
    if (!name) return;
    try {
      await syncMutation.mutateAsync(name);
      enqueueSnackbar(`Sync triggered for ${name}`, { variant: 'success' });
      setTimeout(() => refetch(), 2000);
    } catch {
      enqueueSnackbar(`Failed to sync ${name}`, { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!name) return;
    try {
      await deleteMutation.mutateAsync(name);
      enqueueSnackbar(`${name} deleted`, { variant: 'success' });
      navigate('/');
    } catch {
      enqueueSnackbar(`Failed to delete ${name}`, { variant: 'error' });
    }
    setDeleteOpen(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!app) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" color="text.secondary">
          Application &quot;{name}&quot; not found
        </Typography>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }} startIcon={<BackIcon />}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="text.secondary"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          Dashboard
        </Link>
        <Typography color="text.primary">{app.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Box
          sx={{
            mb: 3,
            p: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha('#00d4ff', 0.05)}, ${alpha('#7c3aed', 0.05)})`,
            border: `1px solid ${alpha('#00d4ff', 0.08)}`,
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h2">{app.name}</Typography>
                <HealthChip status={app.status.health.status} />
                <SyncChip status={app.status.sync.status} />
              </Stack>
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">
                  <strong>Namespace:</strong> {app.destination.namespace}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Project:</strong> {app.project}
                </Typography>
                {app.chart && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Chart:</strong> {app.chart}@{app.targetRevision}
                  </Typography>
                )}
                {app.path && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Path:</strong> {app.path}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Last Synced:</strong> {formatDate(app.status.reconciledAt)}
                </Typography>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Tooltip title="Refresh">
                <IconButton onClick={() => refetch()} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<SyncIcon />}
                onClick={handleSync}
                disabled={syncMutation.isPending}
                size="small"
              >
                {syncMutation.isPending ? 'Syncing...' : 'Sync'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteOpen(true)}
                size="small"
              >
                Delete
              </Button>
            </Stack>
          </Stack>

          {app.status.health.message && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(
                  app.status.health.status === 'Degraded' ? '#ef4444' : '#eab308',
                  0.1
                ),
                border: `1px solid ${alpha(
                  app.status.health.status === 'Degraded' ? '#ef4444' : '#eab308',
                  0.2
                )}`,
              }}
            >
              <Typography variant="body2">{app.status.health.message}</Typography>
            </Box>
          )}
        </Box>
      </motion.div>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Resources (${resources.length})`} />
          <Tab label={`History (${history.length})`} />
          <Tab label="Source" />
          {conditions.length > 0 && <Tab label={`Conditions (${conditions.length})`} />}
        </Tabs>
        <Divider />
      </Box>

      {/* Tab Content */}
      {tab === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {resources.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No resources found
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Kind</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Sync</TableCell>
                    <TableCell>Health</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resources.map((r, i) => (
                    <TableRow key={`${r.kind}-${r.name}-${i}`} hover>
                      <TableCell>
                        <Chip
                          label={r.kind}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {r.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {r.namespace || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <SyncChip status={r.status} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {r.health ? (
                          <HealthChip status={r.health.status} size="small" variant="outlined" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </motion.div>
      )}

      {tab === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {history.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No sync history
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Revision</TableCell>
                    <TableCell>Deployed At</TableCell>
                    <TableCell>Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          #{h.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              maxWidth: 120,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {h.revision}
                          </Typography>
                          <Tooltip title="Copy revision">
                            <IconButton
                              size="small"
                              onClick={() => {
                                navigator.clipboard.writeText(h.revision);
                                enqueueSnackbar('Revision copied', { variant: 'info' });
                              }}
                            >
                              <CopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(h.deployedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                          {h.source.chart || h.source.path || h.source.repoURL}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </motion.div>
      )}

      {tab === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 0.5, textTransform: 'none', letterSpacing: 0 }}>
                  Repository
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {app.repoURL}
                  </Typography>
                  <Tooltip title="Open">
                    <IconButton
                      size="small"
                      onClick={() => window.open(app.repoURL, '_blank')}
                    >
                      <OpenIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
              <Divider />
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Target Revision</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{app.targetRevision}</Typography>
                </Box>
                {app.chart && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Chart</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{app.chart}</Typography>
                  </Box>
                )}
                {app.path && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Path</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{app.path}</Typography>
                  </Box>
                )}
              </Stack>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Destination</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {app.destination.server} → {app.destination.namespace}
                </Typography>
              </Box>
              {app.syncPolicy && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Sync Policy</Typography>
                    <Stack direction="row" spacing={1}>
                      {app.syncPolicy.automated && (
                        <Chip label="Automated" size="small" color="primary" variant="outlined" />
                      )}
                      {app.syncPolicy.automated?.prune && (
                        <Chip label="Prune" size="small" variant="outlined" />
                      )}
                      {app.syncPolicy.automated?.selfHeal && (
                        <Chip label="Self Heal" size="small" variant="outlined" />
                      )}
                      {app.syncPolicy.syncOptions?.map((opt) => (
                        <Chip key={opt} label={opt} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          </Paper>
        </motion.div>
      )}

      {tab === 3 && conditions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Stack spacing={1.5}>
            {conditions.map((c, i) => (
              <Paper key={i} sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip label={c.type} size="small" color="warning" variant="outlined" />
                  <Typography variant="body2">{c.message}</Typography>
                  {c.lastTransitionTime && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      {formatDate(c.lastTransitionTime)}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Application</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{app.name}</strong>? This will remove the application and
            all its managed resources.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            sx={{ background: '#ef4444', '&:hover': { background: '#dc2626' } }}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AppDetailPage;
