import { Chip, type ChipProps } from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Autorenew as ProgressingIcon,
  Error as DegradedIcon,
  PauseCircle as SuspendedIcon,
  HelpOutline as UnknownIcon,
  RemoveCircle as MissingIcon,
} from '@mui/icons-material';
import type { HealthStatus } from '../types';

const healthConfig: Record<HealthStatus, { color: ChipProps['color']; icon: React.ReactElement; label: string }> = {
  Healthy: { color: 'success', icon: <HealthyIcon sx={{ fontSize: 16 }} />, label: 'Healthy' },
  Progressing: { color: 'warning', icon: <ProgressingIcon sx={{ fontSize: 16, animation: 'spin 2s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />, label: 'Progressing' },
  Degraded: { color: 'error', icon: <DegradedIcon sx={{ fontSize: 16 }} />, label: 'Degraded' },
  Suspended: { color: 'info', icon: <SuspendedIcon sx={{ fontSize: 16 }} />, label: 'Suspended' },
  Missing: { color: 'default', icon: <MissingIcon sx={{ fontSize: 16 }} />, label: 'Missing' },
  Unknown: { color: 'default', icon: <UnknownIcon sx={{ fontSize: 16 }} />, label: 'Unknown' },
};

interface StatusChipProps {
  status: HealthStatus;
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
}

export function HealthChip({ status, size = 'small', variant = 'filled' }: StatusChipProps) {
  const config = healthConfig[status] || healthConfig.Unknown;
  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size={size}
      variant={variant}
      sx={{ fontWeight: 500 }}
    />
  );
}

export default HealthChip;
