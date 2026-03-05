import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Paper,
  alpha,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
  CircularProgress,
  Breadcrumbs,
  Link,
  InputAdornment,
  Skeleton,
  Grid2 as Grid,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  RocketLaunch as DeployIcon,
  CheckCircle as SuccessIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Storefront as MarketIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';
import Editor from '@monaco-editor/react';
import { useChartDetail, useMarketplaceSearch, useDeploy, useDeployStatus } from '../hooks';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDeployStore } from '../store';
import { ChartCard, DeployStepper, EmptyState } from '../components';

const WIZARD_STEPS = ['Select Chart', 'Configure', 'Deploy'];

export function DeployPage() {
  const { repo, name: chartName } = useParams<{ repo: string; name: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { subscribe } = useWebSocket();

  const [activeStep, setActiveStep] = useState(repo && chartName ? 1 : 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Chart selection
  const [selectedRepo, setSelectedRepo] = useState(repo || '');
  const [selectedChart, setSelectedChart] = useState(chartName || '');

  // Config
  const { deployConfig, setDeployConfig, deployValues, setDeployValues, resetDeploy } = useDeployStore();
  const [appName, setAppName] = useState('');
  const [targetNamespace, setTargetNamespace] = useState('');
  const [automated, setAutomated] = useState(true);
  const [prune, setPrune] = useState(true);
  const [selfHeal, setSelfHeal] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState('');

  // Deploy state
  const [deployId, setDeployId] = useState<string | null>(null);

  // Queries
  const { data: searchResults, isLoading: isSearching } = useMarketplaceSearch(debouncedSearch, 0, 12);
  const { data: chartDetail, isLoading: isLoadingChart } = useChartDetail(selectedRepo, selectedChart);
  const deployMutation = useDeploy();
  const { data: deployStatus } = useDeployStatus(deployId || '');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Set defaults from chart detail
  useEffect(() => {
    if (chartDetail) {
      if (!appName) setAppName(chartDetail.name.replace(/[^a-z0-9-]/g, '-'));
      if (!targetNamespace) setTargetNamespace(chartDetail.name.replace(/[^a-z0-9-]/g, '-'));
      if (!selectedVersion) setSelectedVersion(chartDetail.version);
      if (chartDetail.default_values && !deployValues) {
        setDeployValues(chartDetail.default_values);
      }
    }
  }, [chartDetail]);

  // Subscribe to deploy progress
  useEffect(() => {
    if (deployId) {
      subscribe(`deploy:${deployId}`);
    }
  }, [deployId, subscribe]);

  const handleSelectChart = (repoName: string, name: string) => {
    setSelectedRepo(repoName);
    setSelectedChart(name);
    setActiveStep(1);
  };

  const handleDeploy = async () => {
    if (!chartDetail) return;

    try {
      const result = await deployMutation.mutateAsync({
        appName,
        chartRepo: chartDetail.repository.name,
        chartName: chartDetail.name,
        chartVersion: selectedVersion || chartDetail.version,
        repoUrl: chartDetail.repository.url,
        targetNamespace,
        values: deployValues || undefined,
        syncPolicy: { automated, prune, selfHeal },
      });

      setDeployId(result.deployId);
      setActiveStep(2);
      enqueueSnackbar('Deployment started!', { variant: 'info' });
    } catch (err) {
      enqueueSnackbar(`Deploy failed: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        variant: 'error',
      });
    }
  };

  const isDeployComplete = deployStatus?.status === 'completed';
  const isDeployFailed = deployStatus?.status === 'failed';

  const canDeploy = useMemo(() => {
    if (!appName || !targetNamespace || !chartDetail) return false;
    const nameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (appName.length > 1 && !nameRegex.test(appName)) return false;
    return true;
  }, [appName, targetNamespace, chartDetail]);

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="text.secondary"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/marketplace')}
        >
          Marketplace
        </Link>
        {selectedChart && (
          <Link underline="hover" color="text.secondary" sx={{ cursor: 'pointer' }}>
            {selectedChart}
          </Link>
        )}
        <Typography color="text.primary">Deploy</Typography>
      </Breadcrumbs>

      {/* Wizard Stepper */}
      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {WIZARD_STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <AnimatePresence mode="wait">
        {/* Step 0: Select Chart */}
        {activeStep === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1 }}>
                Select a Helm Chart
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Search Artifact Hub for the chart you want to deploy
              </Typography>
            </Box>

            <TextField
              fullWidth
              placeholder="Search Helm charts (e.g., external-secrets, redis, postgresql)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />

            {isSearching ? (
              <Grid container spacing={2.5}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
                  </Grid>
                ))}
              </Grid>
            ) : searchResults && searchResults.packages.length > 0 ? (
              <Grid container spacing={2.5}>
                {searchResults.packages.map((chart, i) => (
                  <Grid
                    key={chart.package_id}
                    size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                    onClick={() => handleSelectChart(chart.repository.name, chart.name)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ChartCard chart={chart} index={i} />
                  </Grid>
                ))}
              </Grid>
            ) : debouncedSearch ? (
              <EmptyState
                icon={<MarketIcon sx={{ fontSize: 40 }} />}
                title="No charts found"
                description="Try a different search term"
              />
            ) : (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Start typing to search for Helm charts on Artifact Hub
                </Typography>
              </Box>
            )}
          </motion.div>
        )}

        {/* Step 1: Configure */}
        {activeStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {isLoadingChart ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
              </Box>
            ) : chartDetail ? (
              <Grid container spacing={3}>
                {/* Left: Chart Info + Config */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Stack spacing={3}>
                    {/* Chart Info */}
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        {chartDetail.logo_url ? (
                          <Box
                            component="img"
                            src={chartDetail.logo_url}
                            alt={chartDetail.name}
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              objectFit: 'contain',
                              background: alpha('#fff', 0.05),
                              p: 0.5,
                            }}
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              background: `linear-gradient(135deg, ${alpha('#00d4ff', 0.2)}, ${alpha('#7c3aed', 0.2)})`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '1.5rem',
                              color: 'primary.main',
                            }}
                          >
                            {chartDetail.name.charAt(0).toUpperCase()}
                          </Box>
                        )}
                        <Box>
                          <Typography variant="h4">{chartDetail.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {chartDetail.repository.display_name || chartDetail.repository.name}
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {chartDetail.description}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`v${chartDetail.version}`} size="small" color="primary" variant="outlined" />
                        {chartDetail.app_version && (
                          <Chip label={`App: ${chartDetail.app_version}`} size="small" variant="outlined" />
                        )}
                      </Stack>
                    </Paper>

                    {/* Deployment Config */}
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ mb: 2.5 }}>
                        Deployment Configuration
                      </Typography>
                      <Stack spacing={2.5}>
                        <TextField
                          label="Application Name"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          fullWidth
                          size="small"
                          helperText="DNS-compatible name for the ArgoCD application"
                        />
                        <TextField
                          label="Target Namespace"
                          value={targetNamespace}
                          onChange={(e) => setTargetNamespace(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          fullWidth
                          size="small"
                          helperText="Kubernetes namespace (will be created if needed)"
                        />
                        {chartDetail.available_versions && chartDetail.available_versions.length > 0 && (
                          <TextField
                            label="Chart Version"
                            value={selectedVersion}
                            onChange={(e) => setSelectedVersion(e.target.value)}
                            fullWidth
                            size="small"
                            select
                            SelectProps={{ native: true }}
                          >
                            {chartDetail.available_versions.slice(0, 20).map((v) => (
                              <option key={v.version} value={v.version}>
                                {v.version}
                              </option>
                            ))}
                          </TextField>
                        )}
                        <Divider />
                        <Typography variant="h5">Sync Policy</Typography>
                        <FormControlLabel
                          control={<Switch checked={automated} onChange={(e) => setAutomated(e.target.checked)} />}
                          label="Automated sync"
                        />
                        <FormControlLabel
                          control={<Switch checked={prune} onChange={(e) => setPrune(e.target.checked)} disabled={!automated} />}
                          label="Prune resources"
                        />
                        <FormControlLabel
                          control={<Switch checked={selfHeal} onChange={(e) => setSelfHeal(e.target.checked)} disabled={!automated} />}
                          label="Self-heal"
                        />
                      </Stack>
                    </Paper>
                  </Stack>
                </Grid>

                {/* Right: Values Editor */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Paper sx={{ p: 3, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h4">Helm Values</Typography>
                      <Chip
                        label="YAML"
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Edit the Helm values below. Leave empty to use chart defaults.
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 500,
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: `1px solid ${alpha('#fff', 0.06)}`,
                      }}
                    >
                      <Editor
                        height="100%"
                        defaultLanguage="yaml"
                        value={deployValues || chartDetail.default_values || '# No default values\n'}
                        onChange={(value) => setDeployValues(value || '')}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 12 },
                          wordWrap: 'on',
                          tabSize: 2,
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="error">Failed to load chart details</Alert>
            )}

            {/* Navigation */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<BackIcon />}
                onClick={() => {
                  if (repo && chartName) {
                    navigate('/marketplace');
                  } else {
                    setActiveStep(0);
                  }
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                endIcon={<DeployIcon />}
                onClick={handleDeploy}
                disabled={!canDeploy || deployMutation.isPending}
                size="large"
              >
                {deployMutation.isPending ? 'Starting Deploy...' : 'Deploy to Cluster'}
              </Button>
            </Box>
          </motion.div>
        )}

        {/* Step 2: Deploy Progress */}
        {activeStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Box sx={{ maxWidth: 700, mx: 'auto' }}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                {isDeployComplete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                    <Typography variant="h2" sx={{ mb: 1 }}>
                      Deployment Complete! 🎉
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      <strong>{appName}</strong> has been deployed and is healthy.
                    </Typography>
                  </motion.div>
                ) : isDeployFailed ? (
                  <>
                    <Typography variant="h2" sx={{ mb: 1, color: 'error.main' }}>
                      Deployment Failed
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {deployStatus?.error || 'An error occurred during deployment'}
                    </Typography>
                  </>
                ) : (
                  <>
                    <CircularProgress size={48} sx={{ mb: 2 }} />
                    <Typography variant="h2" sx={{ mb: 1 }}>
                      Deploying {appName}...
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Writing manifests, committing to Git, and waiting for ArgoCD
                    </Typography>
                  </>
                )}
              </Box>

              {deployStatus && (
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <DeployStepper steps={deployStatus.steps} currentStep={deployStatus.currentStep} />
                </Paper>
              )}

              {(isDeployComplete || isDeployFailed) && (
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
                  <Button variant="outlined" onClick={() => navigate('/')}>
                    Go to Dashboard
                  </Button>
                  {isDeployComplete && (
                    <Button variant="contained" onClick={() => navigate(`/apps/${appName}`)}>
                      View Application
                    </Button>
                  )}
                  {isDeployFailed && (
                    <Button
                      variant="contained"
                      onClick={() => {
                        setDeployId(null);
                        setActiveStep(1);
                      }}
                    >
                      Try Again
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}

export default DeployPage;
