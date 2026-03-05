import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  alpha,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  RocketLaunch as DeployIcon,
  Star as StarIcon,
  Verified as VerifiedIcon,
  GitHub as GitHubIcon,
  Language as WebIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useChartDetail } from '../hooks';
import { useDeployStore } from '../store';

export function ChartDetailPage() {
  const { repo, name } = useParams<{ repo: string; name: string }>();
  const navigate = useNavigate();
  const { setSelectedChart, setDeployValues, setDeployConfig } = useDeployStore();

  const { data: chart, isLoading, error } = useChartDetail(repo || '', name || '');

  const handleDeploy = () => {
    if (!chart) return;
    setSelectedChart(chart);
    setDeployValues(chart.default_values || '');
    setDeployConfig({
      appName: chart.normalized_name || chart.name,
      targetNamespace: 'default',
    });
    navigate('/deploy');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !chart) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" color="error" gutterBottom>
          Chart not found
        </Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/marketplace')}>
          Back to Marketplace
        </Button>
      </Box>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Box>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 3 }}>
          <IconButton onClick={() => navigate('/marketplace')} sx={{ color: 'text.secondary', mt: 0.5 }}>
            <BackIcon />
          </IconButton>

          {chart.logo_url && (
            <Box
              component="img"
              src={chart.logo_url}
              alt={chart.name}
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                objectFit: 'contain',
                background: alpha('#fff', 0.05),
                p: 1,
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}

          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="h3">{chart.name}</Typography>
              {chart.repository.official && (
                <Chip icon={<VerifiedIcon sx={{ fontSize: 14 }} />} label="Official" size="small" color="primary" />
              )}
              {chart.repository.verified_publisher && (
                <Chip icon={<VerifiedIcon sx={{ fontSize: 14 }} />} label="Verified" size="small" color="secondary" />
              )}
            </Stack>
            <Typography variant="body1" color="text.secondary">
              {chart.repository.display_name || chart.repository.name}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                v{chart.version}
              </Typography>
              {chart.app_version && (
                <Typography variant="body2" color="text.secondary">
                  App: {chart.app_version}
                </Typography>
              )}
              {(chart.stars ?? 0) > 0 && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                  <Typography variant="body2">{chart.stars}</Typography>
                </Stack>
              )}
            </Stack>
          </Box>

          <Button variant="contained" size="large" startIcon={<DeployIcon />} onClick={handleDeploy}>
            Deploy
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          {/* Main Content */}
          <Box sx={{ flex: 2 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {chart.description || 'No description available'}
                </Typography>
              </CardContent>
            </Card>

            {chart.readme && (
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    README
                  </Typography>
                  <Box
                    sx={{
                      '& pre': {
                        background: alpha('#000', 0.3),
                        p: 2,
                        borderRadius: 1,
                        overflow: 'auto',
                        fontSize: '0.85rem',
                      },
                      '& code': {
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                      },
                      '& h1, & h2, & h3': {
                        mt: 3,
                        mb: 1,
                      },
                      '& p': {
                        mb: 2,
                      },
                      '& ul, & ol': {
                        pl: 3,
                        mb: 2,
                      },
                      '& a': {
                        color: 'primary.main',
                      },
                    }}
                    dangerouslySetInnerHTML={{ __html: chart.readme.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') }}
                  />
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Sidebar */}
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Install
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha('#000', 0.3),
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    wordBreak: 'break-all',
                  }}
                >
                  helm repo add {chart.repository.name} {chart.repository.url}
                  <br />
                  helm install {chart.name} {chart.repository.name}/{chart.name}
                </Box>
              </CardContent>
            </Card>

            {chart.available_versions && chart.available_versions.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Versions
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Version</InputLabel>
                    <Select value={chart.version} label="Version">
                      {chart.available_versions.slice(0, 20).map((v) => (
                        <MenuItem key={v.version} value={v.version}>
                          {v.version}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            )}

            {chart.links && chart.links.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Links
                  </Typography>
                  <Stack spacing={1}>
                    {chart.links.map((link, i) => (
                      <Button
                        key={i}
                        component="a"
                        href={link.url}
                        target="_blank"
                        variant="outlined"
                        size="small"
                        startIcon={link.name.toLowerCase().includes('github') ? <GitHubIcon /> : <WebIcon />}
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        {link.name}
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {chart.maintainers && chart.maintainers.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Maintainers
                  </Typography>
                  <Stack spacing={1}>
                    {chart.maintainers.map((m, i) => (
                      <Typography key={i} variant="body2" color="text.secondary">
                        {m.name}
                        {m.email && (
                          <Typography component="span" sx={{ ml: 1, opacity: 0.7 }}>
                            ({m.email})
                          </Typography>
                        )}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Box>
        </Stack>
      </Box>
    </motion.div>
  );
}

export default ChartDetailPage;
