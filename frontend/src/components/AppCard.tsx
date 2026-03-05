import { Box, Card, CardContent, CardActionArea, Typography, Stack, alpha, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AccessTime as TimeIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { HealthChip } from './HealthChip';
import { SyncChip } from './SyncChip';
import type { ArgoApplication } from '../types';

interface AppCardProps {
  app: ArgoApplication;
  index?: number;
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AppCard({ app, index = 0 }: AppCardProps) {
  const navigate = useNavigate();

  const healthColor = {
    Healthy: '#22c55e',
    Progressing: '#eab308',
    Degraded: '#ef4444',
    Suspended: '#3b82f6',
    Missing: '#6b7280',
    Unknown: '#6b7280',
  }[app.status.health.status] || '#6b7280';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        sx={{
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${healthColor}, ${alpha(healthColor, 0.3)})`,
          },
        }}
      >
        <CardActionArea onClick={() => navigate(`/apps/${app.name}`)}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" noWrap sx={{ fontWeight: 600, mb: 0.5 }}>
                    {app.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {app.chart || app.path || app.repoURL}
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <HealthChip status={app.status.health.status} />
                <SyncChip status={app.status.sync.status} />
              </Stack>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      opacity: 0.7,
                    }}
                  />
                  {app.destination.namespace}
                </Typography>
                <Tooltip title={app.status.reconciledAt ? `Last synced: ${new Date(app.status.reconciledAt).toLocaleString()}` : 'Never synced'}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimeIcon sx={{ fontSize: 14 }} />
                    {formatTimeAgo(app.status.reconciledAt)}
                  </Typography>
                </Tooltip>
              </Box>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </motion.div>
  );
}

export default AppCard;
