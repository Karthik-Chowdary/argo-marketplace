import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import path from 'path';

import { appsRouter, marketplaceRouter, deployRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import { wsManager } from './websocket';
import { k8sService } from './services/kubernetes';

const app = express();
const server = createServer(app);

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan('short', {
    stream: { write: (message: string) => logger.http(message.trim()) },
  })
);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    wsClients: wsManager.getClientCount(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/apps', appsRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/deploy', deployRouter);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize WebSocket
wsManager.initialize(server);

// Start K8s watch for real-time updates
async function startWatcher() {
  try {
    await k8sService.watchApplications((type, app) => {
      switch (type) {
        case 'ADDED':
          wsManager.broadcastAppAdded(app);
          break;
        case 'MODIFIED':
          wsManager.broadcastAppUpdate(app);
          break;
        case 'DELETED':
          wsManager.broadcastAppDeleted(app.name);
          break;
      }
    });
    logger.info('ArgoCD application watcher started');
  } catch (error) {
    logger.warn('Could not start K8s watcher (K8s may not be available)', { error });
  }
}

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 ArgoCD Marketplace API running on port ${PORT}`);
  logger.info(`   Health: http://localhost:${PORT}/api/health`);
  logger.info(`   WebSocket: ws://localhost:${PORT}/ws`);
  startWatcher();
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
