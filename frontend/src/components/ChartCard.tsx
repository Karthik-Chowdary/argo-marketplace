import { Card, CardContent, CardActionArea, Typography, Stack, Box, Chip, alpha } from '@mui/material';
import { Star as StarIcon, Verified as VerifiedIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { MarketplacePackage } from '../types';

interface ChartCardProps {
  chart: MarketplacePackage;
  index?: number;
}

export function ChartCard({ chart, index = 0 }: ChartCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CardActionArea
          onClick={() => navigate(`/marketplace/${chart.repository.name}/${chart.name}`)}
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
        >
          <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack spacing={1.5} sx={{ flex: 1 }}>
              {/* Header with logo */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {chart.logo_url ? (
                  <Box
                    component="img"
                    src={chart.logo_url}
                    alt={chart.name}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
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
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      background: `linear-gradient(135deg, ${alpha('#00d4ff', 0.2)}, ${alpha('#7c3aed', 0.2)})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: 'primary.main',
                    }}
                  >
                    {chart.name.charAt(0).toUpperCase()}
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" noWrap sx={{ fontWeight: 600 }}>
                    {chart.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {chart.repository.display_name || chart.repository.name}
                  </Typography>
                </Box>
              </Box>

              {/* Description */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.5,
                }}
              >
                {chart.description || 'No description available'}
              </Typography>

              {/* Footer */}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip label={`v${chart.version}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                {chart.repository.official && (
                  <Chip icon={<VerifiedIcon sx={{ fontSize: 14 }} />} label="Official" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                )}
                {chart.repository.verified_publisher && (
                  <Chip icon={<VerifiedIcon sx={{ fontSize: 14 }} />} label="Verified" size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                )}
                {(chart.stars ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                    <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {chart.stars}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </motion.div>
  );
}

export default ChartCard;
