import { Box, Skeleton, Card, CardContent, Stack, Grid2 as Grid } from '@mui/material';

export function AppCardSkeleton() {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Box>
            <Skeleton variant="text" width="60%" height={28} />
            <Skeleton variant="text" width="80%" height={20} />
          </Box>
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 2 }} />
          </Stack>
          <Skeleton variant="text" width="40%" height={18} />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ChartCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Skeleton variant="rounded" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={18} />
            </Box>
          </Box>
          <Skeleton variant="text" width="100%" height={18} />
          <Skeleton variant="text" width="70%" height={18} />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: 2 }} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <AppCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}

export function MarketplaceSkeleton() {
  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <ChartCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}
