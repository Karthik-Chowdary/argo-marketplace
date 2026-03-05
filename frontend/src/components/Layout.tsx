import { useState, useMemo } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  IconButton,
  Divider,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Store as StoreIcon,
  RocketLaunch as DeployIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED = 68;

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/marketplace', label: 'Marketplace', icon: <StoreIcon /> },
  { path: '/deploy', label: 'Deploy', icon: <DeployIcon /> },
];

export function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const currentNav = useMemo(() => {
    return navItems.find((item) => {
      if (item.path === '/') return location.pathname === '/';
      return location.pathname.startsWith(item.path);
    });
  }, [location.pathname]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 0.3s ease',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar
          sx={{
            px: collapsed ? 1 : 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            minHeight: '64px !important',
          }}
        >
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: '#fff',
                  }}
                >
                  A
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  ArgoCD Market
                </Typography>
              </Box>
            </motion.div>
          )}
          <IconButton onClick={() => setCollapsed(!collapsed)} size="small" sx={{ color: 'text.secondary' }}>
            {collapsed ? <ExpandIcon /> : <CollapseIcon />}
          </IconButton>
        </Toolbar>

        <Divider />

        <List sx={{ px: 0.5, py: 1 }}>
          {navItems.map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            const button = (
              <ListItemButton
                key={item.path}
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={{
                  py: 1.2,
                  px: collapsed ? 2 : 2,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  '& .MuiListItemIcon-root': {
                    minWidth: collapsed ? 0 : 40,
                    color: isActive ? 'primary.main' : 'text.secondary',
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                {!collapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 400 }} />}
              </ListItemButton>
            );

            return collapsed ? (
              <Tooltip key={item.path} title={item.label} placement="right" arrow>
                {button}
              </Tooltip>
            ) : (
              button
            );
          })}
        </List>

        <Box sx={{ flexGrow: 1 }} />

        {!collapsed && (
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                background: alpha('#00d4ff', 0.05),
                border: `1px solid ${alpha('#00d4ff', 0.1)}`,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                ArgoCD Marketplace v1.0
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5, opacity: 0.7 }}>
                Connected to cluster
              </Typography>
            </Box>
          </Box>
        )}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          background: (theme) => theme.palette.background.default,
          overflow: 'auto',
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            height: 64,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            background: (theme) => alpha(theme.palette.background.default, 0.8),
            backdropFilter: 'blur(20px)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {currentNav?.label || 'ArgoCD Marketplace'}
          </Typography>
        </Box>

        {/* Page content */}
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
}

export default Layout;
