import { Chip, type ChipProps } from '@mui/material';
import { Sync as SyncedIcon, SyncProblem as OutOfSyncIcon, HelpOutline as UnknownIcon } from '@mui/icons-material';
import type { SyncStatus } from '../types';

const syncConfig: Record<SyncStatus, { color: ChipProps['color']; icon: React.ReactElement; label: string }> = {
  Synced: { color: 'success', icon: <SyncedIcon sx={{ fontSize: 16 }} />, label: 'Synced' },
  OutOfSync: { color: 'warning', icon: <OutOfSyncIcon sx={{ fontSize: 16 }} />, label: 'Out of Sync' },
  Unknown: { color: 'default', icon: <UnknownIcon sx={{ fontSize: 16 }} />, label: 'Unknown' },
};

interface SyncChipProps {
  status: SyncStatus;
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
}

export function SyncChip({ status, size = 'small', variant = 'filled' }: SyncChipProps) {
  const config = syncConfig[status] || syncConfig.Unknown;
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

export default SyncChip;
